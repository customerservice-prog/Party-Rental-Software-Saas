import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

export async function POST(request: NextRequest) {
    const body = await request.text();
    const signature = headers().get("stripe-signature");
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event: Stripe.Event;

  try {
        if (!signature || !webhookSecret) {
                throw new Error("Missing Stripe signature or webhook secret");
        }
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
        const message = err instanceof Error ? err.message : "Webhook signature verification failed";
        return NextResponse.json({ error: message }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session;
        const orderId = session.metadata?.orderId;

      if (orderId) {
              await prisma.order.update({
                        where: { id: orderId },
                        data: {
                                    status: "confirmed",
                                    amountPaid: (session.amount_total || 0) / 100,
                        },
              });
      }
  }

  return NextResponse.json({ received: true });
}
