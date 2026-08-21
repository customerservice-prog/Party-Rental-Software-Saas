import { NextRequest, NextResponse } from "next/server";
import { requireCurrentOrganization } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { getAvailableQuantity } from "@/lib/availability";

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

  const requestedAddonIds: string[] = Array.isArray(body.addonIds)
    ? body.addonIds.filter((id: unknown) => typeof id === "string")
    : [];

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

  // Prevent double-booking: make sure enough units of this item are free
  // for the requested date window before creating the order. See
  // lib/availability.ts.
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

  const itemAddons = await prisma.addon.findMany({
    where: { organizationId: organization.id, itemId: item.id },
  });
  const selectedAddons = itemAddons.filter(
    (addon) => addon.isRequired || requestedAddonIds.includes(addon.id)
  );
  const addonsTotal = selectedAddons.reduce((sum, addon) => sum + addon.price, 0);

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

  let couponDiscount = 0;
  const couponCode = typeof body.couponCode === "string" ? body.couponCode.trim().toUpperCase() : "";
  if (couponCode) {
    const coupon = await prisma.coupon.findFirst({
      where: { organizationId: organization.id, code: couponCode },
    });
    const isExpired = coupon?.expiresAt ? coupon.expiresAt < new Date() : false;
    if (!coupon || !coupon.isActive || isExpired) {
      return NextResponse.json({ error: "That coupon code is invalid or has expired" }, { status: 400 });
    }
    const preDiscountTotal = subtotal + deliveryFee + addonsTotal;
    couponDiscount =
      coupon.discountType === "fixed"
        ? Math.min(coupon.discountAmount, preDiscountTotal)
        : Math.round(preDiscountTotal * (coupon.discountAmount / 100) * 100) / 100;
  }

  // Sales tax applies to the taxable rental subtotal (items + add-ons), not
  // the delivery fee, and is computed after the coupon discount so a
  // discount lowers the taxed amount too. See Organization.taxRate.
  const taxRate = organization.taxRate || 0;
  const taxableAmount = Math.max(0, subtotal + addonsTotal - couponDiscount);
  const taxAmount = Math.round(taxableAmount * (taxRate / 100) * 100) / 100;

  const totalAmount = Math.max(0, subtotal + deliveryFee + addonsTotal - couponDiscount + taxAmount);

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
      taxAmount,
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
      orderAddons: {
        create: selectedAddons.map((addon) => ({
          addonId: addon.id,
          name: addon.name,
          price: addon.price,
        })),
      },
    },
  });

  const forwardedFor = request.headers.get("x-forwarded-for");
  const signatureIp = forwardedFor ? forwardedFor.split(",")[0].trim() : null;

  const DEFAULT_CONTRACT_TERMS =
    "By signing below, you agree to be financially responsible for all rented items for the duration of the rental period, to use the equipment safely and as intended, and to pay any repair or replacement costs for damage beyond normal wear and tear. Deposits are non-refundable if the reservation is cancelled within 7 days of the event date.";

  await prisma.contract.create({
    data: {
      organizationId: organization.id,
      orderId: order.id,
      signedAt: new Date(),
      signatureName,
      signatureIp,
      contractText: organization.contractTerms || DEFAULT_CONTRACT_TERMS,
    },
  });

  const proto = request.headers.get("x-forwarded-proto") || "https";
  const host = request.headers.get("host");
  const origin = process.env.NEXT_PUBLIC_APP_URL || `${proto}://${host}`;

  const applicationFeeAmount = organization.stripeAccountId
    ? Math.round(depositAmount * 100 * 0.03)
    : undefined;

  const depositLabel = depositRule && depositAmount < totalAmount ? " (deposit)" : "";
  const addonsLabel = selectedAddons.length > 0 ? ` + ${selectedAddons.length} add-on${selectedAddons.length > 1 ? "s" : ""}` : "";

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
            product_data: { name: `${item.name} x${quantity}${addonsLabel}${depositLabel}` },
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
