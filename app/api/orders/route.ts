import { NextRequest, NextResponse } from "next/server";
import { requireCurrentOrganization } from "@/lib/tenant";
import { requireStaffSession, authzErrorResponse } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { getAvailableQuantity } from "@/lib/availability";
import { getItemBookingRestriction } from "@/lib/availability";

export async function POST(request: NextRequest) {
  const organization = await requireCurrentOrganization();
  try {
    await requireStaffSession(organization.id);
  } catch (err) {
    return authzErrorResponse(err);
  }

  const body = await request.json();

  const {
    customerId,
    firstName,
    lastName,
    email,
    phone,
    eventDate,
    eventEndDate,
    deliveryType,
    deliveryAddress,
    status,
    amountPaid,
  } = body;

  const lineItems: { itemId: string; quantity: number }[] = Array.isArray(body.items)
    ? body.items
        .filter((li: { itemId?: unknown; quantity?: unknown }) => li && typeof li.itemId === "string")
        .map((li: { itemId: string; quantity?: unknown }) => ({
          itemId: li.itemId,
          quantity: typeof li.quantity === "number" && li.quantity > 0 ? Math.floor(li.quantity) : 1,
        }))
    : [];

  if (!eventDate) {
    return NextResponse.json({ error: "Event date is required" }, { status: 400 });
  }
  if (lineItems.length === 0) {
    return NextResponse.json({ error: "Add at least one item to the order" }, { status: 400 });
  }

  const rangeStart = new Date(eventDate);
  if (isNaN(rangeStart.getTime())) {
    return NextResponse.json({ error: "Invalid event date" }, { status: 400 });
  }
  const rangeEnd = eventEndDate ? new Date(eventEndDate) : rangeStart;

  let customer = null;
  if (customerId && typeof customerId === "string") {
    customer = await prisma.customer.findFirst({
      where: { id: customerId, organizationId: organization.id },
    });
  }
  if (!customer) {
    if (!firstName || !lastName || !email) {
      return NextResponse.json(
        { error: "Select a customer or provide first name, last name, and email" },
        { status: 400 }
      );
    }
    customer = await prisma.customer.findFirst({
      where: { organizationId: organization.id, email },
    });
    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          organizationId: organization.id,
          firstName,
          lastName,
          email,
          phone: phone || null,
          address: deliveryAddress || null,
        },
      });
    }
  }

  const itemIds = lineItems.map((li) => li.itemId);
  const items = await prisma.item.findMany({
    where: { id: { in: itemIds }, organizationId: organization.id },
  });
  const itemMap = new Map(items.map((i) => [i.id, i]));

  const resolved = lineItems
    .map((li) => {
      const item = itemMap.get(li.itemId);
      return item ? { item, quantity: li.quantity } : null;
    })
    .filter((x): x is { item: (typeof items)[number]; quantity: number } => x !== null);

  if (resolved.length === 0) {
    return NextResponse.json({ error: "None of the selected items were found" }, { status: 400 });
  }

  // Prevent double-booking: check each line item against units already
  // committed to other (non-cancelled) orders for an overlapping date
  // range. See lib/availability.ts.
  for (const { item, quantity } of resolved) {
      const restriction = getItemBookingRestriction(item, rangeStart);
      if (restriction) {
          return NextResponse.json({ error: restriction }, { status: 409 });
      }
    const available = await getAvailableQuantity(
      organization.id,
      item.id,
      item.quantity,
      rangeStart,
      rangeEnd
    );
    if (quantity > available) {
      return NextResponse.json(
        {
          error:
            available > 0
              ? `Only ${available} unit(s) of "${item.name}" are available for the selected dates`
              : `"${item.name}" is fully booked for the selected dates`,
        },
        { status: 409 }
      );
    }
  }
  const subtotal = resolved.reduce((sum, r) => sum + r.item.cost * r.quantity, 0);
  const isDelivery = deliveryType !== "pickup";
  const deliveryFee = isDelivery ? organization.flatDeliveryFee || 0 : 0;

  const taxRate = organization.taxRate || 0;
  const taxAmount = Math.round(subtotal * (taxRate / 100) * 100) / 100;

  const totalAmount = Math.max(0, subtotal + deliveryFee + taxAmount);

  const paid =
    typeof amountPaid === "number" && amountPaid > 0
      ? Math.min(Math.round(amountPaid * 100) / 100, totalAmount)
      : 0;

  const allowedStatuses = ["quote", "pending", "confirmed", "active"];
  const orderStatus =
    typeof status === "string" && allowedStatuses.includes(status) ? status : "quote";

  // Block confirmed/active/pending bookings for customers the tenant has
  // flagged as do-not-rent. Quotes are still allowed through so staff can
  // prepare pricing without committing inventory. Restrictions are scoped
  // to this organization only - a restriction created by one tenant never
  // affects another tenant's customers.
  if (orderStatus !== "quote") {
    const doNotRentMatch = await prisma.doNotRentRestriction.findFirst({
      where: {
        organizationId: organization.id,
        isActive: true,
        OR: [
          ...(customer.email ? [{ email: { equals: customer.email, mode: "insensitive" as const } }] : []),
          ...(customer.phone ? [{ phone: customer.phone }] : []),
          ...(customer.address
            ? [{ address: { contains: customer.address, mode: "insensitive" as const } }]
            : []),
        ],
      },
    });
    if (doNotRentMatch) {
      return NextResponse.json(
        { error: "This customer has an active do-not-rent restriction. Review it before booking." },
        { status: 403 }
      );
    }
  }

  const orderNumber = "ORD-" + Date.now();

  const order = await prisma.order.create({
    data: {
      organizationId: organization.id,
      customerId: customer.id,
      orderNumber,
      eventDate: rangeStart,
      eventEndDate: rangeEnd,
      deliveryType: isDelivery ? "delivery" : "pickup",
      deliveryAddress: deliveryAddress || null,
      status: orderStatus,
      source: "manual",
      deliveryFee,
      subtotal,
      taxAmount,
      totalAmount,
      amountPaid: paid,
      stripeSessionId: null,
      items: {
        create: resolved.map((r) => ({
          itemId: r.item.id,
          quantity: r.quantity,
          price: r.item.cost,
        })),
      },
    },
  });

  return NextResponse.json({ id: order.id, orderNumber: order.orderNumber });
}
