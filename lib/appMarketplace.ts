export type MarketplaceAppCode = "rentsketch";
export type MarketplaceBillingInterval = "monthly" | "annual";

export type MarketplaceAppDefinition = {
  code: MarketplaceAppCode;
  name: string;
  vendor: string;
  category: string;
  tagline: string;
  description: string;
  planName: string;
  monthlyPriceCents: number;
  annualPriceCents: number;
  demoUrl: string;
  storefrontPath: string;
  logoText: string;
  features: string[];
  stripeMonthlyEnv: string;
  stripeAnnualEnv: string;
};

export const MARKETPLACE_APPS: MarketplaceAppDefinition[] = [
  {
    code: "rentsketch",
    name: "RentSketch",
    vendor: "RentSketch",
    category: "Customer experience",
    tagline: "Let customers design their event before they book.",
    description: "A branded 2D/3D event layout designer that lives on the rental company's own website. Customers can plan tents, tables, chairs, inflatables and other event rentals visually.",
    planName: "RentSketch Pro",
    monthlyPriceCents: 9900,
    annualPriceCents: 99000,
    demoUrl: "https://rentsketch.com/designer/?tenant=generic&embed=1",
    storefrontPath: "/design-your-event",
    logoText: "RS",
    features: [
      "Branded 2D and 3D event designer",
      "Hosted inside the tenant's own rental website",
      "Customer layout saving and quote-request workflow",
      "Tenant-specific branding and embed access",
      "One recurring bill with Party Rental CRM",
    ],
    stripeMonthlyEnv: "STRIPE_APP_RENTSKETCH_PRO_MONTHLY",
    stripeAnnualEnv: "STRIPE_APP_RENTSKETCH_PRO_ANNUAL",
  },
];

export function getMarketplaceApp(code: string | null | undefined) {
  return MARKETPLACE_APPS.find(app => app.code === code) || null;
}

export function marketplacePriceCents(app: MarketplaceAppDefinition, interval: string | null | undefined) {
  return interval === "annual" ? app.annualPriceCents : app.monthlyPriceCents;
}

export function marketplaceIntervalLabel(interval: string | null | undefined) {
  return interval === "annual" ? "year" : "month";
}
