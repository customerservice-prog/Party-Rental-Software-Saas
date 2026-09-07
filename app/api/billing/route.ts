import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCurrentOrganization } from "@/lib/tenant";
import { requireStaffSession, authzErrorResponse } from "@/lib/authz";
import { getBillingStatus } from "@/lib/billing";
import { getPlan } from "@/lib/plans";
import { canAddOfficeUser, canAddCrewUser } from "@/lib/entitlements";

export async function GET() {
  const organization = await requireCurrentOrganization();
  try {
    await requireStaffSession(organization.id);
  } catch (err) {
    return authzErrorResponse(err);
  }

const subscription = await prisma.platformSubscription.findUnique({
  where: { organizationId: organization.id },
});

const billing = await getBillingStatus(organization);
  const activePlanTier = subscription?.planTier ?? organization.planTier;
  const plan = getPlan(activePlanTier);

const [officeSeats, crewSeats] = await Promise.all([
  canAddOfficeUser(organization.id, activePlanTier),
  canAddCrewUser(organization.id, activePlanTier),
  ]);

const subscriptionPayload = subscription
  ? {
    status: subscription.status,
    planTier: subscription.planTier,
    billingInterval: subscription.billingInterval,
    currentPeriodEnd: subscription.currentPeriodEnd,
    pastDueSince: subscription.pastDueSince,
    foundingCustomer: subscription.foundingCustomer,
    foundingPriceLockedUntil: subscription.foundingPriceLockedUntil,
  }
  : null;

return NextResponse.json({
  organization: {
    name: organization.name,
    status: organization.status,
    trialEndsAt: organization.trialEndsAt,
  },
  subscription: subscriptionPayload,
  billing,
  plan: {
    code: plan.code,
    name: plan.name,
    tagline: plan.tagline,
    isCustomPricing: plan.isCustomPricing,
    monthlyPrice: plan.monthlyPrice,
    annualMonthlyPrice: plan.annualMonthlyPrice,
    annualBilledTotal: plan.annualBilledTotal,
    includedSummary: plan.includedSummary,
  },
  seats: {
    office: { current: officeSeats.current, limit: officeSeats.limit },
    crew: { current: crewSeats.current, limit: crewSeats.limit },
  },
});
}
