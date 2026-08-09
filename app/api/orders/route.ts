import { NextRequest, NextResponse } from "next/server";
import { requireCurrentOrganization } from "@/lib/tenant";
import { requireStaffSession, authzErrorResponse } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

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
          quantity:
            typeof li.quantity === "number" && li.quantity > 0 ? Math.floor(li.quantity) : 1,
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

  const subtotal = resolved.reduce((sum, r) => sum + r.item.cost * r.quantity, 0);
  const isDelivery = deliveryType !== "pickup";
  const deliveryFee = isDelivery ? organization.flatDeliveryFee || 0 : 0;
  const totalAmount = Math.max(0, subtotal + deliveryFee);

  const paid =
    typeof amountPaid === "number" && amountPaid > 0
      ? Math.min(Math.round(amountPaid * 100) / 100, totalAmount)
      : 0;

  const allowedStatuses = ["quote", "pending", "confirmed", "active"];
  const orderStatus =
    typeof status === "string" && allowedStatuses.includes(status) ? status : "quote";

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
