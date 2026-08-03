import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
    console.warn("STRIPE_SECRET_KEY is not set. Stripe features will not work until it is configured.");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_placeholder", {
    apiVersion: "2024-06-20",
    typescript: true,
});

// Platform subscription price IDs, one per tier.
// These should be created in the Stripe dashboard and set as env vars.
export const PLATFORM_PRICE_IDS: Record<string, string | undefined> = {
    launch: process.env.STRIPE_PRICE_LAUNCH,
    standard: process.env.STRIPE_PRICE_STANDARD,
    pro: process.env.STRIPE_PRICE_PRO,
    elite: process.env.STRIPE_PRICE_ELITE,
};
