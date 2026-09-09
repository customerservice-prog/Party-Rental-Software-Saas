// Static platform taxonomy for the global "Party Rental CRM Catalog" (see
// CatalogTemplate in prisma/schema.prisma). This is NOT tenant data - it is
// fixed reference data shipped with the app, unlike the Category model
// (prisma/schema.prisma) which is per-tenant and fully tenant-editable.
//
// A CatalogTemplate.categoryKey is one of the keys below. When a tenant adds
// a template to their inventory (see app/api/catalog-templates/add/route.ts)
// we find-or-create a real, tenant-owned Category using the matching label
// so the tenant's own Category list stays clean and only ever contains
// categories they actually use - unused catalog categories never show up in
// a tenant's dashboard or storefront.

export type CatalogCategory = {
  key: string;
  label: string;
  description: string;
};

export const CATALOG_CATEGORIES: CatalogCategory[] = [
  { key: "tables", label: "Tables", description: "Banquet, round, cocktail, and specialty tables" },
  { key: "chairs", label: "Chairs", description: "Folding, chiavari, and specialty seating" },
  { key: "tents", label: "Tents & Canopies", description: "Pole, frame, and pop-up tents" },
  { key: "tent_accessories", label: "Tent Accessories", description: "Sidewalls, lighting, flooring, and tent support equipment" },
  { key: "inflatables", label: "Inflatables", description: "Bounce houses, water slides, and interactive inflatables" },
  { key: "linens", label: "Linens", description: "Tablecloths, runners, sashes, and spandex covers" },
  { key: "wedding_decor", label: "Wedding & Decor", description: "Arches, backdrops, drape, and lounge furniture" },
  { key: "games", label: "Games", description: "Yard games and interactive attractions" },
  { key: "concessions", label: "Concessions", description: "Concession machines and their consumable supplies" },
  { key: "dance_floor_staging", label: "Dance Floors & Staging", description: "Dance floor sections and modular staging" },
  { key: "lighting_av", label: "Lighting & AV", description: "Uplighting, string lights, speakers, and displays" },
  { key: "catering_tableware", label: "Catering & Tableware", description: "Dinnerware, flatware, glassware, and serving equipment" },
  { key: "photo_booths", label: "Photo Booths", description: "Photo booths, backdrops, and booth add-ons" },
  { key: "climate_power", label: "Climate & Power", description: "Generators, fans, heaters, and power distribution" },
  { key: "services", label: "Services", description: "Delivery, setup, and other labor-based services" },
];

export function catalogCategoryLabel(key: string): string {
  return CATALOG_CATEGORIES.find((c) => c.key === key)?.label || key;
}

export function isValidCatalogCategoryKey(key: string): boolean {
  return CATALOG_CATEGORIES.some((c) => c.key === key);
}

// How a template behaves once copied into a tenant's inventory:
//   rental     - a normal bookable Item with a real owned quantity.
//   consumable - an Item that gets used up rather than returned (e.g.
//                popcorn kits). Modeled as an Item today; the schema does
//                not yet distinguish consumable stock-decrement behavior
//                from reusable rental stock (documented technical debt).
//   service    - an Item that represents labor/logistics (delivery, setup)
//                rather than physical stock. Given a high default quantity
//                so date-based availability checks (see lib/availability.ts)
//                never block a service from being booked - services should
//                never be limited by "quantity" the way physical rentals
//                are (documented technical debt: a dedicated Service model
//                decoupled from Item.quantity would be a cleaner long-term
//                fix).
//   addon      - conceptually similar to the existing per-item Addon model,
//                but offered as its own catalog entry a tenant can attach to
//                whichever of their own items makes sense.
//   package    - a bundle idea (e.g. "Backyard Party Package"). Package
//                templates are informational only in this phase - adding one
//                creates its component templates as separate tenant items
//                rather than a real Package record, since no Package/bundle
//                model exists yet (documented technical debt).
export const CATALOG_TEMPLATE_TYPES = ["rental", "service", "consumable", "addon", "package"] as const;
export type CatalogTemplateType = (typeof CATALOG_TEMPLATE_TYPES)[number];

// Quantity given to service/consumable items when a tenant doesn't type
// their own quantity, so they are never treated as "out of stock" by the
// date-based availability engine. Not a real owned count - see comment
// above. The UI must always show a clear "not limited by quantity" hint
// wherever this sentinel is displayed.
export const UNLIMITED_QUANTITY_SENTINEL = 999999;

// Suggested catalog categories to show first for a given business type,
// used only to order/prioritize the onboarding catalog browser - it never
// restricts what a tenant can add. Keys correspond to the business type
// values used in app/onboarding.
export const BUSINESS_TYPE_CATEGORY_PRIORITY: Record<string, string[]> = {
  party_rental: ["tables", "chairs", "inflatables", "linens", "games", "services"],
  tent_rental: ["tents", "tent_accessories", "tables", "chairs", "climate_power", "services"],
  inflatable_rental: ["inflatables", "climate_power", "tables", "chairs", "concessions", "services"],
  wedding_event_rental: ["tables", "chairs", "linens", "wedding_decor", "dance_floor_staging", "lighting_av"],
  table_chair_rental: ["tables", "chairs", "linens", "services"],
  full_service_event_rental: CATALOG_CATEGORIES.map((c) => c.key),
  av_event_production: ["lighting_av", "photo_booths", "dance_floor_staging", "services"],
  other: CATALOG_CATEGORIES.map((c) => c.key),
};

export function recommendedCategoryOrder(businessTypes: string[]): string[] {
  const priority: string[] = [];
  for (const type of businessTypes) {
    const list = BUSINESS_TYPE_CATEGORY_PRIORITY[type];
    if (list) {
      for (const key of list) {
        if (!priority.includes(key)) priority.push(key);
      }
    }
  }
  for (const c of CATALOG_CATEGORIES) {
    if (!priority.includes(c.key)) priority.push(c.key);
  }
  return priority;
}
