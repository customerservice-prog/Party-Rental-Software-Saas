import { prisma } from "./prisma";

// Prevents double-booking: computes how many units of a given Item are
// already committed to other orders whose event window overlaps the
// requested range, so checkout / manual order creation can block bookings
// that would exceed the item's total tracked quantity.
//
// An order "holds" its line-item quantities for its event window unless it
// has been cancelled (Order.status === "cancelled" - note the app uses the
// double-L spelling consistently in the order-status dropdown/UI, even
// though an older schema comment used the single-L spelling). Completed
// orders (the event already happened) still count if their window happens
// to overlap a future range, which in practice it won't, so no
// special-casing is needed there.

const CANCELLED_STATUS = "cancelled";

function normalizeRange(start: Date, end: Date | null | undefined) {
  const rangeStart = new Date(start);
  const rangeEnd = end ? new Date(end) : new Date(start);
  return { rangeStart, rangeEnd };
}

export async function getBookedQuantity(
  organizationId: string,
  itemId: string,
  start: Date,
  end: Date | null | undefined,
  excludeOrderId?: string
): Promise<number> {
  const { rangeStart, rangeEnd } = normalizeRange(start, end);

  const overlapping = await prisma.orderItem.findMany({
    where: {
      itemId,
      order: {
        organizationId,
        status: { not: CANCELLED_STATUS },
        ...(excludeOrderId ? { id: { not: excludeOrderId } } : {}),
        eventDate: { lte: rangeEnd },
        OR: [
          { eventEndDate: { gte: rangeStart } },
          { eventEndDate: null, eventDate: { gte: rangeStart } },
        ],
      },
    },
    select: { quantity: true },
  });

  return overlapping.reduce((sum, row) => sum + row.quantity, 0);
}

export async function getAvailableQuantity(
  organizationId: string,
  itemId: string,
  totalQuantity: number,
  start: Date,
  end: Date | null | undefined,
  excludeOrderId?: string
): Promise<number> {
  const booked = await getBookedQuantity(organizationId, itemId, start, end, excludeOrderId);
  return Math.max(0, totalQuantity - booked);
}

export type AvailabilityCheck = {
  ok: boolean;
  available: number;
  requested: number;
};

// Convenience helper for API routes: looks up the item's total quantity
// itself so callers don't have to fetch it separately.
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

// ---------------------------------------------------------------------------
             // CONDITION / RESTRICTION-BASED BOOKING BLOCKS
// Independent of the quantity-based double-booking check above. An item can
// be pulled from booking entirely (regardless of remaining quantity) via its
// condition status or an explicit "block bookings until" date. See the Item
// model's status / blockBookingsUntil / restrictionMessage fields.
        // ---------------------------------------------------------------------------

      const HARD_BLOCKING_STATUSES = ["missing", "out_of_service", "retired"];

// Returns a customer-facing message if this item cannot be booked at all for
// the requested event start date, or null if booking may proceed (subject to
  // the normal quantity check via getAvailableQuantity / checkItemAvailability
// above). Callers should check this BEFORE the quantity check.
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
          return (
                  item.restrictionMessage ||
                  `"${item.name}" is not available for booking until ${item.blockBookingsUntil.toLocaleDateString()}.`
                );
    }
    return null;
}
