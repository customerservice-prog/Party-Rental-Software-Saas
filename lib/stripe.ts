import Stripe from "stripe";
import type { PlanCode, BillingInterval } from "@/lib/plans";

if (!process.env.STRIPE_SECRET_KEY) {
    console.warn("STRIPE_SECRET_KEY is not set. Stripe features will not work until it is configured.");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_placeholder", {
    apiVersion: "2024-06-20",
    typescript: true,
});

// ---------------------------------------------------------------------------
// PLATFORM SUBSCRIPTION BILLING (this tenant paying US for Party Rental CRM).
// Prices are looked up by Stripe "lookup_key" instead of hardcoded price ID
// env vars, so new prices can be added or rotated in the Stripe Dashboard
// without a redeploy. Lookup keys follow the pattern "planCode_interval",
// e.g. "starter_monthly", "growth_annual". See lib/plans.ts for plan codes.
// ---------------------------------------------------------------------------

export function platformPriceLookupKey(planCode: PlanCode, interval: BillingInterval): string {
    const intervalKey = interval === "annual" ? "annual" : "monthly";
    return `${planCode}_${intervalKey}`;
}

export async function getPlatformPrice(planCode: PlanCode, interval: BillingInterval) {
    const lookupKey = platformPriceLookupKey(planCode, interval);
    const prices = await stripe.prices.list({
        lookup_keys: [lookupKey],
        active: true,
        limit: 1,
    });
    return prices.data[0] || null;
}
