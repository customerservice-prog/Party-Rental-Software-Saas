import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/admin";
import { stripe } from "@/lib/stripe";
import { getEffectivePlanCommercial } from "@/lib/platformPlans";
import { inspectPlatformBilling } from "@/lib/platformBillingReadiness";

export const dynamic = "force-dynamic";

export async function GET() {
  await requirePlatformAdmin();
  const key = process.env.STRIPE_SECRET_KEY || "";
  const report = await inspectPlatformBilling({
    stripeKeyPresent: Boolean(key && !key.includes("placeholder")),
    mode: /^(sk|rk)_live_/.test(key) ? "live" : /^(sk|rk)_test_/.test(key) ? "test" : "unknown",
    webhookSecretPresent: Boolean(process.env.STRIPE_PLATFORM_WEBHOOK_SECRET),
    publicUrl: process.env.PUBLIC_BASE_URL,
    getPlan: (code) => getEffectivePlanCommercial(code, { strict: true }),
    getPrice: async (code, interval) => {
      const prices = await stripe.prices.list(
        { lookup_keys: [`${code}_${interval}`], active: true, limit: 1 },
        { timeout: 8000, maxNetworkRetries: 0 },
      );
      return prices.data[0] ?? null;
    },
  });
  return NextResponse.json(report, { headers: { "Cache-Control": "private, no-store" } });
}
