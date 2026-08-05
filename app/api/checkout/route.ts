import { NextRequest, NextResponse } from "next/server";
import { requireCurrentOrganization } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

export async function POST(request: NextRequest) {
  const organization = await requireCurrentOrganization();
  const body = await request.json();

  const {
    itemId,
    firstName,
    lastName,
    email,
    phone,
    eventDate,
    eventEndDate,
    deliveryAddress,
    signatureName,
  } = body;

  const quantity =
    typeof body.quantity === "number" && body.quantity > 0 ? Math.floor(body.quantity) : 1;

  if (!itemId || !firstName || !lastName || !email || !eventDate || !deliveryAddress) {
    return NextResponse.json({ error: "Missing required booking details" }, { status: 400 });
  }
  if (!signatureName || typeof signatureName !== "string" || !signatureName.trim()) {
    return NextResponse.json({ error: "A signature is required to agree to the rental contract" }, { status: 400 });
  }

  const item = await prisma.item.findFirst({
    where: { id: itemId, organizationId: organization.id },
  });

  if (!item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  const rangeStart = new Date(eventDate);
  const rangeEnd = eventEndDate ? new Date(eventEndDate) : null;

  let customer = await prisma.customer.findFirst({
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
        address: deliveryAddress,
      },
    });
  }

  const subtotal = item.cost * quantity;
  const deliveryFee = organization.flatDeliveryFee || 0;
  const totalAmount = subtotal + deliveryFee;

  const depositRule = await prisma.depositRule.findFirst({
    where: { organizationId: organization.id, isActive: true },
    orderBy: { createdAt: "desc" },
  });

  const depositAmount = depositRule
    ? depositRule.type === "flat"
      ? Math.min(depositRule.amount, totalAmount)
      : Math.round(totalAmount * (depositRule.amount / 100) * 100) / 100
    : totalAmount;

  const orderNumber = `ORD-${Date.now()}`;

  const order = await prisma.order.create({
    data: {
      organizationId: organization.id,
      customerId: customer.id,
      orderNumber,
      eventDate: rangeStart,
      eventEndDate: rangeEnd,
      deliveryAddress,
      status: "pending",
      source: "online",
      deliveryFee,
      subtotal,
      totalAmount,
      items: {
        create: [
          {
            itemId: item.id,
            quantity,
            price: item.cost,
          },
        ],
      },
    },
  });

  const forwardedFor = request.headers.get("x-forwarded-for");
  const signatureIp = forwardedFor ? forwardedFor.split(",")[0].trim() : null;

  await prisma.contract.create({
    data: {
      organizationId: organization.id,
      orderId: order.id,
      signedAt: new Date(),
      signatureName,
      signatureIp,
    },
  });

  const proto = request.headers.get("x-forwarded-proto") || "https";
  const host = request.headers.get("host");
  const origin = process.env.NEXT_PUBLIC_APP_URL || `${proto}://${host}`;

  const applicationFeeAmount = organization.stripeAccountId
    ? Math.round(depositAmount * 100 * 0.03)
    : undefined;

  const depositLabel = depositRule && depositAmount < totalAmount ? " (deposit)" : "";

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_intent_data: organization.stripeAccountId
        ? {
            application_fee_amount: applicationFeeAmount,
            transfer_data: { destination: organization.stripeAccountId },
          }
        : undefined,
      payment_method_types: ["card"],
      customer_email: email,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: `${item.name} x${quantity}${depositLabel}` },
            unit_amount: Math.round(depositAmount * 100),
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}/checkout/success?orderId=${order.id}`,
      cancel_url: `${origin}/checkout?itemId=${item.id}`,
      metadata: {
        orderId: order.id,
        organizationId: organization.id,
      },
    });

    await prisma.order.update({
      where: { id: order.id },
      data: { stripeSessionId: session.id },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Payment setup failed";
    return NextResponse.json(
      { error: "Your booking was saved, but payment setup failed: " + message, orderId: order.id },
      { status: 502 }
    );
  }
}
