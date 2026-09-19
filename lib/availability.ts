import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { getPackageComponents, getPackagesUsingComponent } from "./packages";

const NON_RESERVING_STATUSES = ["cancelled", "canceled", "quote", "incomplete"];
const PENDING_HOLD_MS = 30 * 60 * 1000;
const HARD_BLOCKING_STATUSES = ["missing", "out_of_service", "retired"];

type Db = typeof prisma | Prisma.TransactionClient;

function normalizeRange(start: Date, end: Date | null | undefined) {
  const rangeStart = new Date(start);
  const rangeEnd = end ? new Date(end) : new Date(start);
  return { rangeStart, rangeEnd };
}

function bookingOrderWhere(
  organizationId: string,
  rangeStart: Date,
  rangeEnd: Date,
  excludeOrderId?: string
) {
  const pendingCutoff = new Date(Date.now() - PENDING_HOLD_MS);
  return {
    organizationId,
    status: { notIn: NON_RESERVING_STATUSES },
    ...(excludeOrderId ? { id: { not: excludeOrderId } } : {}),
    eventDate: { lte: rangeEnd },
    AND: [
      { OR: [{ status: { not: "pending" } }, { status: "pending", createdAt: { gte: pendingCutoff } }] },
      { OR: [{ eventEndDate: { gte: rangeStart } }, { eventEndDate: null, eventDate: { gte: rangeStart } }] },
    ],
  } as any;
}

// Direct demand is the quantity of this exact Item on reserving orders.
export async function getDirectBookedQuantityWithClient(
  db: Db,
  organizationId: string,
  itemId: string,
  start: Date,
  end: Date | null | undefined,
  excludeOrderId?: string
): Promise<number> {
  const { rangeStart, rangeEnd } = normalizeRange(start, end);
  const overlapping = await db.orderItem.findMany({
    where: {
      itemId,
      order: bookingOrderWhere(organizationId, rangeStart, rangeEnd, excludeOrderId),
    },
    select: { quantity: true },
  });
  return overlapping.reduce((sum, row) => sum + row.quantity, 0);
}

// Indirect demand is physical stock consumed when this item is a component
// inside a booked package. One booked package can consume multiple units.
export async function getPackageComponentDemandWithClient(
  db: Db,
  organizationId: string,
  componentItemId: string,
  start: Date,
  end: Date | null | undefined,
  excludeOrderId?: string
): Promise<number> {
  const relationships = await getPackagesUsingComponent(db, organizationId, componentItemId);
  if (!relationships.length) return 0;
  const perPackage = new Map(relationships.map((r) => [r.packageItemId, r.quantity]));
  const packageItemIds = [...perPackage.keys()];
  const { rangeStart, rangeEnd } = normalizeRange(start, end);
  const rows = await db.orderItem.findMany({
    where: {
      itemId: { in: packageItemIds },
      order: bookingOrderWhere(organizationId, rangeStart, rangeEnd, excludeOrderId),
    },
    select: { itemId: true, quantity: true },
  });
  return rows.reduce((sum, row) => sum + row.quantity * (perPackage.get(row.itemId) || 0), 0);
}

export async function getBookedQuantityWithClient(
  db: Db,
  organizationId: string,
  itemId: string,
  start: Date,
  end: Date | null | undefined,
  excludeOrderId?: string
): Promise<number> {
  const [direct, packageDemand] = await Promise.all([
    getDirectBookedQuantityWithClient(db, organizationId, itemId, start, end, excludeOrderId),
    getPackageComponentDemandWithClient(db, organizationId, itemId, start, end, excludeOrderId),
  ]);
  return direct + packageDemand;
}

export async function getBookedQuantity(
  organizationId: string,
  itemId: string,
  start: Date,
  end: Date | null | undefined,
  excludeOrderId?: string
): Promise<number> {
  return getBookedQuantityWithClient(prisma, organizationId, itemId, start, end, excludeOrderId);
}

export async function getOperationalQuantityWithClient(
  db: Db,
  organizationId: string,
  itemId: string,
  totalQuantity: number
): Promise<number> {
  const unavailableUnits = await db.itemUnit.count({
    where: { organizationId, itemId, status: { in: ["maintenance", "retired"] } },
  });
  return Math.max(0, totalQuantity - unavailableUnits);
}

export async function getOperationalQuantity(
  organizationId: string,
  itemId: string,
  totalQuantity: number
): Promise<number> {
  return getOperationalQuantityWithClient(prisma, organizationId, itemId, totalQuantity);
}

export async function getPhysicalAvailableQuantityWithClient(
  db: Db,
  organizationId: string,
  itemId: string,
  totalQuantity: number,
  start: Date,
  end: Date | null | undefined,
  excludeOrderId?: string
): Promise<number> {
  const [booked, operational] = await Promise.all([
    getBookedQuantityWithClient(db, organizationId, itemId, start, end, excludeOrderId),
    getOperationalQuantityWithClient(db, organizationId, itemId, totalQuantity),
  ]);
  return Math.max(0, operational - booked);
}

// Availability is component-aware. Normal items subtract both direct rentals
// and package usage. Package items are additionally limited by the remaining
// capacity of every physical component in the bundle.
export async function getAvailableQuantityWithClient(
  db: Db,
  organizationId: string,
  itemId: string,
  totalQuantity: number,
  start: Date,
  end: Date | null | undefined,
  excludeOrderId?: string
): Promise<number> {
  const { rangeStart } = normalizeRange(start, end);
  const [physicalAvailable, components] = await Promise.all([
    getPhysicalAvailableQuantityWithClient(db, organizationId, itemId, totalQuantity, start, end, excludeOrderId),
    getPackageComponents(db, organizationId, itemId),
  ]);

  let available = physicalAvailable;
  if (!components.length || available <= 0) return available;

  for (const component of components) {
    const componentItem = await db.item.findFirst({
      where: { id: component.componentItemId, organizationId },
      select: {
        id: true,
        name: true,
        quantity: true,
        status: true,
        blockBookingsUntil: true,
        restrictionMessage: true,
      },
    });
    if (!componentItem) return 0;
    if (getItemBookingRestriction(componentItem, rangeStart)) return 0;

    const [componentOperational, componentBooked] = await Promise.all([
      getOperationalQuantityWithClient(db, organizationId, componentItem.id, componentItem.quantity),
      getBookedQuantityWithClient(db, organizationId, componentItem.id, start, end, excludeOrderId),
    ]);
    const remaining = Math.max(0, componentOperational - componentBooked);
    const packageCapacity = Math.floor(remaining / component.quantity);
    available = Math.min(available, packageCapacity);
    if (available <= 0) return 0;
  }
  return available;
}

export async function getAvailableQuantity(
  organizationId: string,
  itemId: string,
  totalQuantity: number,
  start: Date,
  end: Date | null | undefined,
  excludeOrderId?: string
): Promise<number> {
  return getAvailableQuantityWithClient(prisma, organizationId, itemId, totalQuantity, start, end, excludeOrderId);
}

export type AvailabilityCheck = { ok: boolean; available: number; requested: number };
export async function checkItemAvailability(
  organizationId: string,
  itemId: string,
  requestedQuantity: number,
  start: Date,
  end: Date | null | undefined,
  excludeOrderId?: string
): Promise<AvailabilityCheck | null> {
  const item = await prisma.item.findFirst({
    where: { id: itemId, organizationId },
    select: { quantity: true },
  });
  if (!item) return null;
  const available = await getAvailableQuantity(
    organizationId,
    itemId,
    item.quantity,
    start,
    end,
    excludeOrderId
  );
  return { ok: requestedQuantity <= available, available, requested: requestedQuantity };
}

export function getItemBookingRestriction(
  item: {
    name: string;
    status?: string | null;
    blockBookingsUntil?: Date | null;
    restrictionMessage?: string | null;
  },
  rangeStart: Date
): string | null {
  if (item.status && HARD_BLOCKING_STATUSES.includes(item.status)) {
    return item.restrictionMessage || `"${item.name}" is not currently available to rent.`;
  }
  if (item.blockBookingsUntil && rangeStart < item.blockBookingsUntil) {
    return item.restrictionMessage || `"${item.name}" is not available for booking until ${item.blockBookingsUntil.toLocaleDateString()}.`;
  }
  return null;
}
