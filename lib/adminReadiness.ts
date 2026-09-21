// Pure reporting rules. Saved configuration is never evidence of delivery or payment.
export type ConfigState = "not configured" | "incomplete" | "configured · not checked";
export function configurationState(values: Array<string | null | undefined>): ConfigState {
  const present = values.filter(v => typeof v === "string" && v.trim().length > 0).length;
  return present === 0 ? "not configured" : present === values.length ? "configured · not checked" : "incomplete";
}
export function directoryParams(params: Record<string, string | string[] | undefined>) {
  const text = (key: string) => typeof params[key] === "string" ? String(params[key]).trim() : "";
  const rawPage = text("page");
  return { q: text("q").slice(0, 100), status: text("status"), page: /^\d{1,6}$/.test(rawPage) ? Math.max(1, Number(rawPage)) : 1, pageSize: 25 };
}
export function knownPlanCode(code: string): string | null {
  const key = code.toLowerCase();
  if (["starter", "growth", "pro", "enterprise"].includes(key)) return key;
  return ({ launch: "starter", standard: "growth", elite: "enterprise" } as Record<string, string>)[key] || null;
}
export function catalogMonthlyValue(sub: {planTier:string;billingInterval:string;foundingCustomer:boolean}, plan: {isCustomPricing:boolean;monthlyPrice:number|null;annualMonthlyPrice:number|null} | undefined): number | null {
  if (!knownPlanCode(sub.planTier) || !plan || plan.isCustomPricing || sub.foundingCustomer) return null;
  const value = sub.billingInterval === "annual" ? plan.annualMonthlyPrice : sub.billingInterval === "monthly" ? plan.monthlyPrice : null;
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}
export function setupProgress(o: {website:{publishedAt:Date|string|null}|null;_count:{items:number;orders:number}}) {
  const steps = [
    {label:"Account created", done:true},
    {label:"Inventory added", done:o._count.items > 0},
    {label:"Storefront published", done:Boolean(o.website?.publishedAt)},
    {label:"First order recorded", done:o._count.orders > 0},
  ];
  return {steps, percent:steps.filter(s => s.done).length * 25, next:steps.find(s => !s.done)?.label || "Core setup complete"};
}
export type AutomationState = "disabled" | "never recorded" | "stale" | "recent run" | "invalid timestamp";
export function automationState(o: {status:string;autoConfirmationEnabled:boolean;autoReminderEnabled:boolean;autoBalanceReminderEnabled:boolean;automationsLastRunAt:Date|string|null}, now = Date.now()): AutomationState {
  if (!["active", "trial"].includes(o.status) || !(o.autoConfirmationEnabled || o.autoReminderEnabled || o.autoBalanceReminderEnabled)) return "disabled";
  if (!o.automationsLastRunAt) return "never recorded";
  const last = new Date(o.automationsLastRunAt).getTime();
  if (!Number.isFinite(last) || last > now + 60000) return "invalid timestamp";
  return now - last > 86400000 ? "stale" : "recent run";
}
