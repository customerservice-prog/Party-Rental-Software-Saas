import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { resolveCustomerPortalToken } from "@/lib/customerPortal";

export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  const access = await resolveCustomerPortalToken(params.token);
  if (!access) return NextResponse.json({ error: "This customer portal link is invalid or expired." }, { status: 404 });

  const order = await prisma.order.findFirst({
    where: { id: access.orderId, organizationId: access.organizationId },
    include: { organization: { select: { name: true, stripeAccountId: true } }, customer: { select: { email: true } }, contract: true },
  });
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  if (["cancelled", "canceled"].includes(order.status.toLowerCase())) return NextResponse.json({ error: "This order has been canceled." }, { status: 409 });
  if (!order.contract?.signedAt) return NextResponse.json({ error: "Please sign the rental agreement before making a payment." }, { status: 409 });

  const balance = Math.max(0, Math.round((order.totalAmount - order.amountPaid) * 100) / 100);
  if (balance <= 0) return NextResponse.json({ error: "This order is already paid in full." }, { status: 409 });

  try {
    const amountCents = Math.round(balance * 100);
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: order.customer.email,
      line_items: [{
        price_data: {
          currency: "usd",
          product_data: { name: `${order.organization.name} · Order #${order.orderNumber} balance` },
          unit_amount: amountCents,
        },
        quantity: 1,
      }],
      payment_intent_data: order.organization.stripeAccountId ? {
        application_fee_amount: Math.round(amountCents * 0.03),
        transfer_data: { destination: order.organization.stripeAccountId },
      } : undefined,
      metadata: {
        orderId: order.id,
        organizationId: order.organizationId,
        paymentKind: "customer_balance",
        portalAccessId: access.id,
      },
      success_url: `${req.nextUrl.origin}/portal/${params.token}?payment=success`,
      cancel_url: `${req.nextUrl.origin}/portal/${params.token}?payment=cancelled`,
    });
    if (!session.url) return NextResponse.json({ error: "Secure payment could not be started." }, { status: 502 });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("portal balance checkout failed", err);
    return NextResponse.json({ error: "Secure payment could not be started. Please contact the rental company." }, { status: 502 });
  }
}
