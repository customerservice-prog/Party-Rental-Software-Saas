import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentOrganization } from "@/lib/tenant";

// Public, unauthenticated endpoint so a customer can check on their own
// booking without needing a staff login. Requires both the order number
// and the email used at checkout so a stranger can't browse other
// customers' orders just by guessing order numbers.
export async function GET(req: NextRequest) {
  const organization = await getCurrentOrganization();
  if (!organization) {
    return NextResponse.json({ error: "Unable to resolve this business" }, { status: 400 });
  }

  const orderNumber = req.nextUrl.searchParams.get("orderNumber")?.trim();
  const email = req.nextUrl.searchParams.get("email")?.trim();

  if (!orderNumber || !email) {
    return NextResponse.json(
      { error: "Order number and email are both required" },
      { status: 400 }
    );
  }

  const order = await prisma.order.findFirst({
    where: {
      organizationId: organization.id,
      orderNumber,
      customer: { email: { equals: email, mode: "insensitive" } },
    },
    include: {
      customer: true,
      items: { include: { item: true } },
      orderAddons: true,
      contract: true,
    },
  });

  if (!order) {
    return NextResponse.json(
      { error: "No order found matching that order number and email." },
      { status: 404 }
    );
  }

  const balanceDue = Math.max(0, (order.totalAmount || 0) - (order.amountPaid || 0));

  return NextResponse.json({
    order: {
      orderNumber: order.orderNumber,
      status: order.status,
      eventDate: order.eventDate,
      eventEndDate: order.eventEndDate,
      deliveryType: order.deliveryType,
      deliveryAddress: order.deliveryAddress,
      subtotal: order.subtotal,
      deliveryFee: order.deliveryFee,
      taxAmount: order.taxAmount,
      totalAmount: order.totalAmount,
      amountPaid: order.amountPaid,
      balanceDue,
      customerName: `${order.customer.firstName} ${order.customer.lastName}`,
      items: order.items.map((oi) => ({
        name: oi.item.name,
        quantity: oi.quantity,
        price: oi.price,
      })),
      addons: order.orderAddons.map((a) => ({ name: a.name, price: a.price })),
      hasDeliveryDriverAssigned: Boolean(order.deliveryDriverId),
      hasPickupDriverAssigned: Boolean(order.pickupDriverId),
      contract: order.contract
        ? {
            signed: Boolean(order.contract.signedAt),
            signedAt: order.contract.signedAt,
            signatureName: order.contract.signatureName,
            contractText: order.contract.signedAt ? order.contract.contractText : null,
          }
        : null,
    },
  });
}
