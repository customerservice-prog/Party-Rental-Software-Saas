// Shared types, defaults, and server-side validation for the tenant
// homepage section builder (Website.draftSections / publishedSections).
// Kept framework-agnostic (no React, no Prisma) so it can be imported by
// the API route, the public renderer, and the dashboard editor alike.
//
// IMPORTANT: this is deliberately a small, fixed catalog of section types
// with validated config shapes - not a freeform JSON/HTML canvas. No
// arbitrary HTML/JS is ever rendered from this data, no business claims
// are fabricated, and tenant ownership is always resolved server-side by
// the caller (this file never trusts organizationId from the client).

export type SectionType = "hero" | "categories" | "about" | "cta" | "faq";

export interface FaqItem {
  question: string;
  answer: string;
}

export interface SectionConfig {
  heading?: string;
  subheading?: string;
  body?: string;
  imageUrl?: string;
  buttonLabel?: string;
  buttonHref?: string;
  items?: FaqItem[];
}

export interface WebsiteSection {
  id: string;
  type: SectionType;
  visible: boolean;
  config: SectionConfig;
}

export const SECTION_TYPES: SectionType[] = ["hero", "categories", "about", "cta", "faq"];

export const SECTION_LABELS: Record<SectionType, string> = {
  hero: "Hero",
  categories: "Browse Categories",
  about: "About",
  cta: "Call To Action",
  faq: "FAQ",
};

const MAX_TEXT = 500;
const MAX_ITEMS = 20;

function safeText(value: unknown, max = MAX_TEXT): string {
  if (typeof value !== "string") return "";
  return value.slice(0, max);
}

// Only allow http(s) URLs, site-relative paths/hashes, or mailto/tel links.
// Never allow javascript: or other executable schemes in a button link.
function safeHref(value: unknown): string {
  const v = safeText(value, 2000);
  if (!v) return "";
  if (/^javascript:/i.test(v)) return "";
  if (v.startsWith("/") || v.startsWith("#")) return v;
  if (/^(https?:|mailto:|tel:)/i.test(v)) return v;
  return "";
}

// Images are either a normal http(s) URL or a data: URL (the dashboard
// editor's "replace image" control reads an uploaded file into a data URL
// client-side, mirroring the existing Website Pages block editor's image
// handling - there is no separate media host yet).
function safeImageUrl(value: unknown): string {
  const v = safeText(value, 4_000_000);
  if (!v) return "";
  if (/^https?:/i.test(v) || /^data:image\//i.test(v)) return v;
  return "";
}

export function validateSections(input: unknown): WebsiteSection[] {
  if (!Array.isArray(input)) throw new Error("Sections must be an array");
  if (input.length > 20) throw new Error("A homepage can have at most 20 sections");

  return input.map((raw, i) => {
    if (!raw || typeof raw !== "object") throw new Error("Section " + i + " is invalid");
    const r = raw as Record<string, unknown>;
    const type = r.type;
    if (!SECTION_TYPES.includes(type as SectionType)) {
      throw new Error("Section " + i + " has an unknown type");
    }
    const c = (r.config && typeof r.config === "object" ? r.config : {}) as Record<string, unknown>;

    const config: SectionConfig = {
      heading: safeText(c.heading, 200),
      subheading: safeText(c.subheading, 300),
      body: safeText(c.body, MAX_TEXT),
      imageUrl: safeImageUrl(c.imageUrl),
      buttonLabel: safeText(c.buttonLabel, 60),
      buttonHref: safeHref(c.buttonHref),
    };

    if (type === "faq") {
      const items = Array.isArray(c.items) ? c.items : [];
      config.items = items
        .slice(0, MAX_ITEMS)
        .map((item) => {
          const it = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
          return {
            question: safeText(it.question, 200),
            answer: safeText(it.answer, 1000),
          };
        })
        .filter((it) => it.question || it.answer);
    }

    return {
      id: safeText(r.id, 40) || "section-" + i + "-" + Date.now(),
      type: type as SectionType,
      visible: r.visible !== false,
      config,
    };
  });
}

// Builds a safe, non-fabricated starter homepage from data the tenant has
// already provided (name, categories, about text, etc). Never invents
// history, awards, ratings, or credentials.
export function buildDefaultSections(org: {
  name: string;
  heroImageUrl?: string | null;
  aboutText?: string | null;
  logoUrl?: string | null;
}): WebsiteSection[] {
  const now = Date.now();
  return [
    {
      id: "hero-" + now,
      type: "hero",
      visible: true,
      config: {
        heading: "Party & Event Rentals from " + org.name,
        subheading:
          "Browse our rental categories below and book your next event online in minutes.",
        imageUrl: org.heroImageUrl || "",
        buttonLabel: "Book Now",
        buttonHref: "/book",
      },
    },
    {
      id: "categories-" + (now + 1),
      type: "categories",
      visible: true,
      config: {
        heading: "Browse Our Rentals",
        subheading: "",
      },
    },
    {
      id: "about-" + (now + 2),
      type: "about",
      visible: true,
      config: {
        heading: "About Us",
        body:
          org.aboutText ||
          "We provide event rentals for celebrations throughout our service area. Browse our rental collection or contact us for help planning your event.",
        imageUrl: org.logoUrl || "",
      },
    },
    {
      id: "cta-" + (now + 3),
      type: "cta",
      visible: true,
      config: {
        heading: "Ready to book your event?",
        buttonLabel: "Check Availability",
        buttonHref: "/book",
      },
    },
  ];
}
