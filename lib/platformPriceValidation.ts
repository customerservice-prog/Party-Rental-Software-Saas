/** Shared by subscription checkout and the administrator's read-only checks. */
export type PlatformBillingInterval = "monthly" | "annual";
export type PlatformCommercialPrice = {
  code: string;
  isEnabled: boolean;
  monthlyPrice: number | null;
  annualMonthlyPrice: number | null;
};
export type StripePriceShape = {
  id: string;
  active: boolean;
  currency: string;
  type: string;
  billing_scheme: string;
  unit_amount: number | null;
  unit_amount_decimal?: string | null;
  lookup_key?: string | null;
  livemode: boolean;
  custom_unit_amount?: unknown;
  transform_quantity?: unknown;
  recurring: { interval: string; interval_count: number; usage_type: string } | null;
};
export type PriceIssueCode =
  | "plan_disabled" | "invalid_configuration" | "missing_price" | "inactive_price"
  | "wrong_currency" | "wrong_interval" | "unsupported_pricing" | "wrong_amount"
  | "wrong_lookup_key" | "wrong_mode";
export type PriceIssue = { code: PriceIssueCode; message: string };

export function configuredBillingCents(plan: PlatformCommercialPrice, interval: PlatformBillingInterval): number | null {
  const rate = interval === "annual" ? plan.annualMonthlyPrice : plan.monthlyPrice;
  if (rate === null || !Number.isFinite(rate) || rate < 0) return null;
  const cents = Math.round(rate * 100);
  // Commercial plan rates have cent precision; do not silently round malformed overrides.
  if (Math.abs(rate * 100 - cents) > 0.000001) return null;
  const total = cents * (interval === "annual" ? 12 : 1);
  return Number.isSafeInteger(total) ? total : null;
}

export function validatePlatformPrice(
  plan: PlatformCommercialPrice,
  interval: PlatformBillingInterval,
  price: StripePriceShape | null,
  expectedLiveMode?: boolean,
): PriceIssue[] {
  const issues: PriceIssue[] = [];
  const amount = configuredBillingCents(plan, interval);
  const key = `${plan.code}_${interval}`;
  if (!plan.isEnabled) issues.push({ code: "plan_disabled", message: "This plan is disabled in platform settings." });
  if (amount === null) issues.push({ code: "invalid_configuration", message: "Configure a non-negative plan price with no more than two decimal places." });
  if (!price) {
    issues.push({ code: "missing_price", message: `No active Stripe price was found for ${key}.` });
    return issues;
  }
  if (!price.active) issues.push({ code: "inactive_price", message: "The Stripe price is inactive." });
  if (price.lookup_key !== key) issues.push({ code: "wrong_lookup_key", message: `Expected the Stripe lookup key ${key}.` });
  if (price.currency.toLowerCase() !== "usd") issues.push({ code: "wrong_currency", message: "The price must use USD to match the published platform pricing." });
  if (price.type !== "recurring" || !price.recurring || price.recurring.interval !== (interval === "annual" ? "year" : "month") || price.recurring.interval_count !== 1) {
    issues.push({ code: "wrong_interval", message: interval === "annual" ? "The annual price must charge once per year." : "The monthly price must charge once per month." });
  }
  if (price.billing_scheme !== "per_unit" || price.recurring?.usage_type !== "licensed" || price.custom_unit_amount || price.transform_quantity || price.unit_amount === null || (price.unit_amount_decimal != null && Number(price.unit_amount_decimal) !== price.unit_amount)) {
    issues.push({ code: "unsupported_pricing", message: "Use a fixed, per-unit licensed price without metering, quantity transforms, or custom amounts." });
  }
  if (amount !== null && price.unit_amount !== amount) {
    issues.push({ code: "wrong_amount", message: `Stripe must charge $${(amount / 100).toFixed(2)} ${interval === "annual" ? "per year" : "per month"} for this plan.` });
  }
  if (expectedLiveMode !== undefined && price.livemode !== expectedLiveMode) issues.push({ code: "wrong_mode", message: "The Stripe price mode does not match the configured Stripe account mode." });
  return issues;
}
