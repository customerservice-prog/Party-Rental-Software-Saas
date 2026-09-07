// Central plan configuration for Party Rental CRM's OWN platform
// subscription (this tenant paying US - not this tenant's customers paying
// them through Stripe Connect, which is handled separately in lib/stripe.ts
// and app/api/stripe/connect).
//
// This file is the single source of truth for plan pricing, limits, and
// marketing copy. The pricing page, the dashboard billing page, onboarding,
// upgrade prompts, and server-side seat-limit checks should all import from
// here instead of hardcoding numbers or feature lists in multiple places.
//
// IMPORTANT: Real Stripe subscription billing is not wired up yet. Plan
// changes today are applied manually by a platform admin from
// /admin/organizations/[id] (see lib/billing.ts for the access rules this
// drives). This file exists so that when real billing is turned on, the
// plan definitions, limits, and entitlement checks are already in place.

export type PlanCode = "starter" | "growth" | "pro" | "enterprise";
export type BillingInterval = "monthly" | "annual";

export const TRIAL_DAYS = 14;

export interface PlanLimits {
    officeUsers: number | null;
    crewUsers: number | null;
    locations: number | null;
}

export interface PlanDefinition {
    code: PlanCode;
    name: string;
    tagline: string;
    isCustomPricing: boolean;
    monthlyPrice: number | null;
    annualMonthlyPrice: number | null;
    annualBilledTotal: number | null;
    limits: PlanLimits;
    includedSummary: string[];
    ctaLabel: string;
    highlighted: boolean;
}

export const PLANS: PlanDefinition[] = [
  {
        code: "starter",
        name: "Starter",
        tagline: "Everything a new rental company needs to take bookings online.",
        isCustomPricing: false,
        monthlyPrice: 49,
        annualMonthlyPrice: 39,
        annualBilledTotal: 468,
        limits: { officeUsers: 1, crewUsers: 3, locations: 1 },
        includedSummary: [
                "Unlimited inventory, orders and customers",
                "Online booking storefront",
                "Order, quote and contract management",
                "Scheduling calendar and inventory availability",
                "Payment and balance tracking",
                "Coupons and deposit rules",
                "Basic reporting",
                "1 full office user",
                "Up to 3 crew or driver logins",
                "1 business location",
                "Email support",
              ],
        ctaLabel: "Start Free Trial",
        highlighted: false,
  },
  {
        code: "growth",
        name: "Growth",
        tagline: "For established rental companies managing staff and deliveries.",
        isCustomPricing: false,
        monthlyPrice: 99,
        annualMonthlyPrice: 79,
        annualBilledTotal: 948,
        limits: { officeUsers: 3, crewUsers: 15, locations: 1 },
        includedSummary: [
                "Everything in Starter",
                "Delivery scheduling and driver dispatch",
                "Driver runs and route management",
                "Warehouse pull lists and packing workflow",
                "Staff roles and granular permissions",
                "Do Not Rent controls",
                "Customer history and activity/audit log",
                "Advanced reporting and analytics",
                "3 full office users",
                "Up to 15 crew or driver logins",
                "Priority support",
              ],
        ctaLabel: "Start Free Trial",
        highlighted: true,
  },
  {
        code: "pro",
        name: "Pro",
        tagline: "For larger operations with bigger office and crew teams.",
        isCustomPricing: false,
        monthlyPrice: 199,
        annualMonthlyPrice: 159,
        annualBilledTotal: 1908,
        limits: { officeUsers: 10, crewUsers: null, locations: 1 },
        includedSummary: [
                "Everything in Growth",
                "10 full office users",
                "Unlimited crew or driver logins",
                "Priority support",
              ],
        ctaLabel: "Start Free Trial",
        highlighted: false,
  },
  {
        code: "enterprise",
        name: "Enterprise",
        tagline: "Custom plans for larger or multi-team rental operations.",
        isCustomPricing: true,
        monthlyPrice: null,
        annualMonthlyPrice: null,
        annualBilledTotal: null,
        limits: { officeUsers: null, crewUsers: null, locations: null },
        includedSummary: [
                "Everything in Pro",
                "Custom onboarding",
                "Support for larger teams",
                "Contact us to discuss your specific needs",
              ],
        ctaLabel: "Contact Us",
        highlighted: false,
  },
  ];

const LEGACY_PLAN_CODE_MAP: Record<string, PlanCode> = {
    launch: "starter",
    standard: "growth",
    elite: "enterprise",
};

export function normalizePlanCode(code: string | null | undefined): PlanCode {
    if (!code) return "starter";
    const lower = code.toLowerCase();
    if (lower === "starter" || lower === "growth" || lower === "pro" || lower === "enterprise") {
          return lower;
    }
    return LEGACY_PLAN_CODE_MAP[lower] ?? "starter";
}

export function getPlan(code: string | null | undefined): PlanDefinition {
    const normalized = normalizePlanCode(code);
    const plan = PLANS.find((p) => p.code === normalized);
    return plan ?? PLANS[0];
}

export function getPlanLimits(code: string | null | undefined): PlanLimits {
    return getPlan(code).limits;
}

export const FOUNDING_OFFER = {
    monthlyPrice: 49,
    priceLockMonths: 24,
    maxFoundingCustomers: 50,
};
