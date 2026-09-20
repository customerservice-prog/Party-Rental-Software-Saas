import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCurrentOrganization } from "@/lib/tenant";
import { requireOwnerSession, authzErrorResponse } from "@/lib/authz";
import { stripe, getPlatformPrice } from "@/lib/stripe";
import { normalizePlanCode } from "@/lib/plans";
import { getEffectivePlanCommercial } from "@/lib/platformPlans";
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

const [price, commercial] = await Promise.all([
  getPlatformPrice(planCode, interval),
  getEffectivePlanCommercial(planCode),
]);

if (!commercial.isEnabled) {
  return NextResponse.json({ error: "This plan is currently disabled by the platform." }, { status: 409 });
}

if (!price) {
  return NextResponse.json(
    { error: "This plan is not available for checkout right now. Please try again shortly or contact support." },
    { status: 500 }
    );
}

const configuredMonthly = interval === "annual" ? commercial.annualMonthlyPrice : commercial.monthlyPrice;
const expectedUnitAmount = configuredMonthly == null
  ? null
  : Math.round(configuredMonthly * (interval === "annual" ? 12 : 1) * 100);
if (expectedUnitAmount !== null && price.unit_amount !== expectedUnitAmount) {
  return NextResponse.json(
    { error: "This plan's platform price was changed but the matching Stripe price has not been synchronized yet. Contact platform support before checking out." },
    { status: 409 }
  );
}

const existingSubscription = await prisma.platformSubscription.findUnique({
  where: { organizationId: organization.id },
});

let customerId = existingSubscription?.stripeCustomerId || undefined;

if (customerId) {
  try {
    await stripe.customers.retrieve(customerId);
  } catch (err) {
    customerId = undefined;
  }
}

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

const appUrl = process.env.PUBLIC_BASE_URL || "";

try {
  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: price.id, quantity: 1 }],
    subscription_data: {
      trial_period_days: commercial.trialDays,
      metadata: { organizationId: organization.id, planCode },
    },
    success_url: `${appUrl}/dashboard/settings/billing?checkout=success`,
    cancel_url: `${appUrl}/dashboard/settings/billing?checkout=canceled`,
    metadata: { organizationId: organization.id, planCode, interval },
  });

  return NextResponse.json({ url: checkoutSession.url });
} catch (err) {
  console.error("Failed to create checkout session", err);
  return NextResponse.json(
    { error: "We could not start checkout right now. Please try again in a moment or contact support." },
    { status: 502 }
    );
}
}
