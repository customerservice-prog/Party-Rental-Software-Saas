import { prisma } from "./prisma";

// Central billing-status gate for the dashboard. Mirrors the old Django
// app's ActiveBusinessRequiredMiddleware policy:
//   - suspended organizations are blocked immediately
//   - a trial that has ended with no subscription attached is blocked
//   - unpaid / canceled subscriptions are blocked immediately
//   - past_due subscriptions get a grace period before being locked
// Stripe checkout itself isn't wired up yet, so "blocked" here means the
// dashboard shows a lock screen (see app/billing-locked/page.tsx) rather
// than redirecting into a real upgrade flow.

export type BillingCode =
  | "ok"
  | "trial_ended"
  | "unpaid"
  | "canceled"
  | "past_due_locked"
  | "suspended";

export type BillingStatus = {
  blocked: boolean;
  code: BillingCode;
  message: string | null;
  trialDaysLeft: number | null;
  subscriptionStatus: string | null;
  planTier: string | null;
};

// Days a "past_due" subscription is allowed to keep working before the
// dashboard locks. Matches the old app's SAAS_PAST_DUE_GRACE_DAYS default.
const PAST_DUE_GRACE_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

export async function getBillingStatus(organization: {
  id: string;
  status: string;
  trialEndsAt: Date | null;
  planTier?: string | null;
}): Promise<BillingStatus> {
  if (organization.status === "suspended") {
    return {
      blocked: true,
      code: "suspended",
      message: "This account has been suspended. Contact support to reactivate it.",
      trialDaysLeft: null,
      subscriptionStatus: null,
      planTier: null,
    };
  }

  const subscription = await prisma.platformSubscription.findUnique({
    where: { organizationId: organization.id },
  });

  const now = new Date();
  let trialDaysLeft: number | null = null;
  if (organization.trialEndsAt) {
    trialDaysLeft = Math.ceil((organization.trialEndsAt.getTime() - now.getTime()) / DAY_MS);
  }

  // No subscription row yet (e.g. a dev/reference org, or one created
  // before billing was wired up) - don't lock anyone out over missing
  // billing data.
  if (!subscription) {
    return {
      blocked: false,
      code: "ok",
      message: null,
      trialDaysLeft,
      subscriptionStatus: null,
      planTier: organization.planTier ?? null,
    };
  }

  const status = (subscription.status || "").trim().toLowerCase() || "trialing";

  if (status === "trialing") {
    const trialEnded = organization.trialEndsAt ? organization.trialEndsAt <= now : false;
    if (trialEnded && !subscription.stripeSubId) {
      return {
        blocked: true,
        code: "trial_ended",
        message: "Your free trial has ended. Upgrade your plan to keep using the dashboard.",
        trialDaysLeft,
        subscriptionStatus: status,
        planTier: subscription.planTier,
      };
    }
    return {
      blocked: false,
      code: "ok",
      message: null,
      trialDaysLeft,
      subscriptionStatus: status,
      planTier: subscription.planTier,
    };
  }

  if (status === "trial_ended") {
    return {
      blocked: true,
      code: "trial_ended",
      message: "Your free trial has ended. Upgrade your plan to keep using the dashboard.",
      trialDaysLeft,
      subscriptionStatus: status,
      planTier: subscription.planTier,
    };
  }

  if (status === "unpaid" || status === "canceled") {
    return {
      blocked: true,
      code: status === "unpaid" ? "unpaid" : "canceled",
      message: "Your subscription is inactive. Update your billing to regain access.",
      trialDaysLeft,
      subscriptionStatus: status,
      planTier: subscription.planTier,
    };
  }

  if (status === "past_due") {
    const since = subscription.pastDueSince ?? subscription.updatedAt;
    const deadline = new Date(since.getTime() + PAST_DUE_GRACE_DAYS * DAY_MS);
    if (now > deadline) {
      return {
        blocked: true,
        code: "past_due_locked",
        message: "Your subscription is past due and access has been locked. Please update billing.",
        trialDaysLeft,
        subscriptionStatus: status,
        planTier: subscription.planTier,
      };
    }
    return {
      blocked: false,
      code: "ok",
      message: "Your last payment failed. Please update billing soon to avoid losing access.",
      trialDaysLeft,
      subscriptionStatus: status,
      planTier: subscription.planTier,
    };
  }

  // "active" or any other recognized-good status.
  return {
    blocked: false,
    code: "ok",
    message: null,
    trialDaysLeft,
    subscriptionStatus: status,
    planTier: subscription.planTier,
  };
}
