import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCurrentOrganization } from "@/lib/tenant";
import { requireOwnerSession, authzErrorResponse } from "@/lib/authz";
import { stripe, getPlatformPrice } from "@/lib/stripe";
import { normalizePlanCode, TRIAL_DAYS } from "@/lib/plans";
import type { BillingInterval } from "@/lib/plans";

export async function POST(request: NextRequest) {
  const organization = await requireCurrentOrganization();
  try {
    await requireOwnerSession(organization.id);
  } catch (err) {
    return authzErrorResponse(err);
  }

const body = await request.json().catch(() => ({}));
  const planCode = normalizePlanCode(body.planCode);
  const interval: BillingInterval = body.interval === "annual" ? "annual" : "monthly";

if (planCode === "enterprise") {
  return NextResponse.json(
    { error: "Enterprise plans are custom pricing. Please contact us instead of checking out here." },
    { status: 400 }
    );
}

const price = await getPlatformPrice(planCode, interval);

if (!price) {
  return NextResponse.json(
    { error: "This plan is not available for checkout right now. Please try again shortly or contact support." },
    { status: 500 }
    );
}

const existingSubscription = await prisma.platformSubscription.findUnique({
  where: { organizationId: organization.id },
});

let customerId = existingSubscription?.stripeCustomerId || undefined;

if (!customerId) {
  const customer = await stripe.customers.create({
    email: organization.contactEmail || undefined,
    name: organization.name,
    metadata: { organizationId: organization.id },
  });
  customerId = customer.id;
}

await prisma.platformSubscription.upsert({
  where: { organizationId: organization.id },
  create: {
    organizationId: organization.id,
    planTier: planCode,
    stripeCustomerId: customerId,
    billingInterval: interval,
    status: "trialing",
  },
  update: {
    stripeCustomerId: customerId,
  },
});

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";

const checkoutSession = await stripe.checkout.sessions.create({
  mode: "subscription",
  customer: customerId,
  line_items: [{ price: price.id, quantity: 1 }],
  subscription_data: {
    trial_period_days: TRIAL_DAYS,
    metadata: { organizationId: organization.id, planCode },
  },
  success_url: `${appUrl}/dashboard/settings/billing?checkout=success`,
  cancel_url: `${appUrl}/dashboard/settings/billing?checkout=canceled`,
  metadata: { organizationId: organization.id, planCode, interval },
});

return NextResponse.json({ url: checkoutSession.url });
}
