import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { normalizePlanCode } from "@/lib/plans";

// Platform subscription billing webhook (this tenant paying US for Party
// Rental CRM). Separate from app/api/webhooks/stripe, which handles each
// tenant's OWN customers paying THEM through Stripe Connect. This endpoint
// is configured as its own Event destination in the Stripe Dashboard with
// its own signing secret (STRIPE_PLATFORM_WEBHOOK_SECRET).

function planCodeFromLookupKey(lookupKey: string | null | undefined) {
  if (!lookupKey) return null;
  const parts = lookupKey.split("_");
  return normalizePlanCode(parts[0]);
}

async function findOrganizationIdForCustomer(customerId: string | null | undefined) {
  if (!customerId) return null;
  const record = await prisma.platformSubscription.findFirst({
    where: { stripeCustomerId: customerId },
    select: { organizationId: true },
  });
  return record?.organizationId ?? null;
}

async function syncSubscription(subscription: Stripe.Subscription) {
  const organizationId =
    subscription.metadata?.organizationId ||
    (await findOrganizationIdForCustomer(subscription.customer as string));

if (!organizationId) return;

const item = subscription.items.data[0];
  const lookupKey = item?.price?.lookup_key;
  const planCode = planCodeFromLookupKey(lookupKey);
  const billingInterval = item?.price?.recurring?.interval === "year" ? "annual" : "monthly";
  const status = subscription.status;
  const currentPeriodEnd = subscription.current_period_end
  ? new Date(subscription.current_period_end * 1000)
    : null;

const existing = await prisma.platformSubscription.findUnique({
  where: { organizationId },
});

await prisma.platformSubscription.upsert({
  where: { organizationId },
  create: {
    organizationId,
    planTier: planCode || "starter",
    stripeCustomerId: subscription.customer as string,
    stripeSubId: subscription.id,
    status,
    currentPeriodEnd,
    billingInterval,
    pastDueSince: status === "past_due" ? new Date() : null,
  },
  update: {
    ...(planCode ? { planTier: planCode } : {}),
    stripeSubId: subscription.id,
    status,
    currentPeriodEnd,
    billingInterval,
    pastDueSince:
      status === "past_due" ? existing?.pastDueSince ?? new Date() : null,
  },
});

if (planCode) {
  await prisma.organization
  .update({ where: { id: organizationId }, data: { planTier: planCode } })
  .catch(() => {});
}
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = headers().get("stripe-signature");
  const webhookSecret = process.env.STRIPE_PLATFORM_WEBHOOK_SECRET;

let event: Stripe.Event;

try {
  if (!signature || !webhookSecret) {
    throw new Error("Missing Stripe signature or platform webhook secret");
  }
  event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
} catch (err) {
  const message = err instanceof Error ? err.message : "Webhook signature verification failed";
  return NextResponse.json({ error: message }, { status: 400 });
}

if (event.type === "checkout.session.completed") {
  const session = event.data.object as Stripe.Checkout.Session;
  if (session.mode === "subscription" && session.subscription) {
    const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
    await syncSubscription(subscription);
  }
} else if (
  event.type === "customer.subscription.created" ||
  event.type === "customer.subscription.updated"
  ) {
  const subscription = event.data.object as Stripe.Subscription;
  await syncSubscription(subscription);
} else if (event.type === "customer.subscription.deleted") {
  const subscription = event.data.object as Stripe.Subscription;
  const organizationId =
    subscription.metadata?.organizationId ||
    (await findOrganizationIdForCustomer(subscription.customer as string));
  if (organizationId) {
    await prisma.platformSubscription
    .update({
      where: { organizationId },
      data: { status: "canceled", pastDueSince: null },
    })
    .catch(() => {});
  }
} else if (event.type === "invoice.payment_failed") {
  const invoice = event.data.object as Stripe.Invoice;
  const organizationId = await findOrganizationIdForCustomer(invoice.customer as string);
  if (organizationId) {
    const existing = await prisma.platformSubscription.findUnique({
      where: { organizationId },
    });
    await prisma.platformSubscription
    .update({
      where: { organizationId },
      data: { status: "past_due", pastDueSince: existing?.pastDueSince ?? new Date() },
    })
    .catch(() => {});
  }
} else if (event.type === "invoice.paid") {
  const invoice = event.data.object as Stripe.Invoice;
  const organizationId = await findOrganizationIdForCustomer(invoice.customer as string);
  if (organizationId) {
    await prisma.platformSubscription
    .update({
      where: { organizationId },
      data: { status: "active", pastDueSince: null },
    })
    .catch(() => {});
  }
}

return NextResponse.json({ received: true });
}
