import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { randomUUID } from "crypto";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

type ExistingPayment = { id: string };

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = (await headers()).get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event: Stripe.Event;
  try {
    if (!signature || !webhookSecret) throw new Error("Missing Stripe signature or webhook secret");
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Webhook signature verification failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = session.metadata?.orderId;
    const organizationId = session.metadata?.organizationId;
    const paidAmount = Math.round(((session.amount_total || 0) / 100) * 100) / 100;

    if (orderId && organizationId && paidAmount > 0 && session.payment_status === "paid") {
      const externalReference = `stripe:checkout:${session.id}`;
      await prisma.$transaction(async (tx) => {
        // Serialize every payment mutation for a single order and make Stripe
        // webhook retries harmless. Stripe can deliver the same event more than once.
        await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(hashtext($1))`, `payment:${organizationId}:${orderId}`);
        const existing = await tx.$queryRawUnsafe<ExistingPayment[]>(
          `SELECT "id" FROM "Payment" WHERE "organizationId"=$1 AND "externalReference"=$2 LIMIT 1`,
          organizationId,
          externalReference
        );
        if (existing.length) return;

        const order = await tx.order.findFirst({ where: { id: orderId, organizationId } });
        if (!order) return;

        const isOriginalBookingCheckout = session.id === order.stripeSessionId;
        let newAmountPaid: number;
        if (isOriginalBookingCheckout && order.amountPaid >= paidAmount) {
          // Backward-compatible reconciliation for orders paid before this
          // idempotent ledger existed: record the Stripe transaction without
          // charging the order total twice.
          newAmountPaid = order.amountPaid;
        } else {
          newAmountPaid = Math.min(order.totalAmount, Math.round((order.amountPaid + paidAmount) * 100) / 100);
        }

        const kind = session.metadata?.paymentKind || (isOriginalBookingCheckout ? "booking_checkout" : "checkout_payment");
        await tx.$executeRawUnsafe(
          `INSERT INTO "Payment" ("id","organizationId","orderId","amount","type","method","tip","note","recordedBy","createdAt","externalReference") VALUES ($1,$2,$3,$4,'payment','card',0,$5,'Stripe',CURRENT_TIMESTAMP,$6)`,
          randomUUID(), organizationId, order.id, paidAmount, `Stripe ${kind.replaceAll("_", " ")}`, externalReference
        );

        const nextStatus = ["pending", "quote", "incomplete"].includes(order.status.toLowerCase()) ? "confirmed" : order.status;
        await tx.order.update({ where: { id: order.id }, data: { amountPaid: newAmountPaid, status: nextStatus } });
        await tx.auditLog.create({
          data: {
            organizationId,
            action: "payment.stripe.completed",
            performedBy: "stripe",
            details: JSON.stringify({ orderId: order.id, sessionId: session.id, amount: paidAmount, paymentKind: kind, amountPaid: newAmountPaid }),
          },
        });
      }, { isolationLevel: "Serializable" });
    }
  }

  return NextResponse.json({ received: true });
}
