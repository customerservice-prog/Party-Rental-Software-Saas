import { configuredBillingCents, validatePlatformPrice, type PlatformCommercialPrice, type PlatformBillingInterval, type StripePriceShape } from "./platformPriceValidation";

export type ReadinessRow = {
  plan: string;
  name: string;
  interval: PlatformBillingInterval;
  lookupKey: string;
  expectedCents: number | null;
  stripeCents: number | null;
  currency: string | null;
  stripeInterval: string | null;
  state: "ready" | "blocked" | "disabled" | "unverified";
  issues: string[];
};
export type BillingReadiness = {
  checkedAt: string;
  mode: "live" | "test" | "unknown";
  configuration: { stripeKeyPresent: boolean; webhookSecretPresent: boolean; publicUrlValid: boolean };
  status: "ready_for_checkout" | "blocked" | "unverified";
  rows: ReadinessRow[];
  warnings: string[];
};
export function validPlatformPublicUrl(value: string | undefined): boolean {
  if (!value) return false;
  try {
    const u = new URL(value);
    return u.protocol === "https:" && !u.username && !u.password && !u.search && !u.hash && u.pathname === "/";
  } catch { return false; }
}

/** Read-only adapters make these checks testable without live credentials. */
export async function inspectPlatformBilling(deps: {
  stripeKeyPresent: boolean;
  mode: "live" | "test" | "unknown";
  webhookSecretPresent: boolean;
  publicUrl: string | undefined;
  getPlan: (code: string) => Promise<PlatformCommercialPrice & { name: string }>;
  getPrice: (code: string, interval: PlatformBillingInterval) => Promise<StripePriceShape | null>;
}): Promise<BillingReadiness> {
  const configuration = {
    stripeKeyPresent: deps.stripeKeyPresent,
    webhookSecretPresent: deps.webhookSecretPresent,
    publicUrlValid: validPlatformPublicUrl(deps.publicUrl),
  };
  const groups = await Promise.all(["starter", "growth", "pro"].map(async (code) => {
    let plan: (PlatformCommercialPrice & { name: string }) | null = null;
    try { plan = await deps.getPlan(code); } catch { /* Do not substitute base rates for failed override reads. */ }
    return Promise.all((["monthly", "annual"] as const).map(async (interval): Promise<ReadinessRow> => {
      const row: ReadinessRow = {
        plan: code, name: plan?.name ?? code, interval, lookupKey: `${code}_${interval}`,
        expectedCents: plan ? configuredBillingCents(plan, interval) : null,
        stripeCents: null, currency: null, stripeInterval: null, state: "unverified", issues: [],
      };
      if (!plan) { row.issues.push("Could not read the saved platform plan configuration. Try again before changing any prices."); return row; }
      if (!plan.isEnabled) { row.state = "disabled"; row.issues.push("Disabled in platform settings; no Stripe request was made."); return row; }
      if (!deps.stripeKeyPresent) { row.state = "blocked"; row.issues.push("No Stripe platform API key is configured."); return row; }
      try {
        const price = await deps.getPrice(code, interval);
        row.stripeCents = price?.unit_amount ?? null;
        row.currency = price?.currency ?? null;
        row.stripeInterval = price?.recurring ? `${price.recurring.interval_count} ${price.recurring.interval}` : null;
        row.issues = validatePlatformPrice(plan, interval, price, deps.mode === "unknown" ? undefined : deps.mode === "live").map((issue) => issue.message);
        row.state = row.issues.length ? "blocked" : "ready";
      } catch {
        // Provider errors can contain sensitive request details. Return a stable explanation instead.
        row.issues.push("Stripe could not be reached or denied access. No price was changed. Check the platform connection and retry.");
      }
      return row;
    }));
  }));
  const rows = groups.flat();
  const enabled = rows.filter((row) => row.state !== "disabled");
  const warnings = ["Price checks are read-only. They do not test a payment, invoice, webhook delivery, or subscription activation."];
  if (!configuration.webhookSecretPresent) warnings.push("The platform subscription webhook signing secret is missing; automatic subscription updates are not ready.");
  else warnings.push("A webhook secret is present, but successful delivery from Stripe has not been verified by this check.");
  if (!configuration.publicUrlValid) warnings.push("PUBLIC_BASE_URL must be an HTTPS origin without a path, query, or fragment.");
  if (deps.mode === "test") warnings.push("Stripe is in test mode. These prices cannot collect live subscription payments.");
  if (deps.mode === "unknown") warnings.push("Stripe live/test mode could not be established from the configured key type.");
  if (!enabled.length) warnings.push("All self-service plans are disabled.");
  const status = !enabled.length || enabled.some((row) => row.state === "blocked") || !configuration.webhookSecretPresent || !configuration.publicUrlValid || !configuration.stripeKeyPresent || deps.mode === "test"
    ? "blocked" : enabled.some((row) => row.state === "unverified") || deps.mode === "unknown" ? "unverified" : "ready_for_checkout";
  return { checkedAt: new Date().toISOString(), mode: deps.mode, configuration, status, rows, warnings };
}
