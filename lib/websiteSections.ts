// Shared types, defaults, and server-side validation for the tenant homepage builder.
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
const MAX_SECTIONS = 20;
const MAX_DATA_IMAGE_LENGTH = 4_000_000;

function safeText(value: unknown, max = MAX_TEXT): string {
  if (typeof value !== "string") return "";
  return value.replace(/\u0000/g, "").slice(0, max);
}

function safeHref(value: unknown): string {
  const v = safeText(value, 2000).trim();
  if (!v) return "";
  if (v.startsWith("/") || v.startsWith("#")) return v;
  try {
    const url = new URL(v);
    return ["http:", "https:", "mailto:", "tel:"].includes(url.protocol) ? v : "";
  } catch {
    return "";
  }
}

function safeImageUrl(value: unknown): string {
  const v = safeText(value, MAX_DATA_IMAGE_LENGTH).trim();
  if (!v) return "";
  if (/^https?:\/\//i.test(v)) return v;
  if (/^data:image\/(?:png|jpe?g|webp|gif);base64,[a-z0-9+/=\r\n]+$/i.test(v)) return v;
  return "";
}

export function validateSections(input: unknown): WebsiteSection[] {
  if (!Array.isArray(input)) throw new Error("Sections must be an array");
  if (input.length > MAX_SECTIONS) throw new Error(`A homepage can have at most ${MAX_SECTIONS} sections`);

  const seenIds = new Set<string>();
  return input.map((raw, i) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      throw new Error("Section " + i + " is invalid");
    }
    const r = raw as Record<string, unknown>;
    if (!SECTION_TYPES.includes(r.type as SectionType)) {
      throw new Error("Section " + i + " has an unknown type");
    }
    const type = r.type as SectionType;
    const c = (r.config && typeof r.config === "object" && !Array.isArray(r.config)
      ? r.config
      : {}) as Record<string, unknown>;

    let id = safeText(r.id, 80).trim();
    if (!id || seenIds.has(id)) id = `${type}-${i}-${Date.now().toString(36)}`;
    seenIds.add(id);

    const config: SectionConfig = {
      heading: safeText(c.heading, 200),
      subheading: safeText(c.subheading, 300),
      body: safeText(c.body, 5000),
      imageUrl: safeImageUrl(c.imageUrl),
      buttonLabel: safeText(c.buttonLabel, 60),
      buttonHref: safeHref(c.buttonHref),
    };

    if (type === "faq") {
      const items = Array.isArray(c.items) ? c.items : [];
      config.items = items.slice(0, MAX_ITEMS).map((item) => {
        const it = item && typeof item === "object" && !Array.isArray(item)
          ? (item as Record<string, unknown>)
          : {};
        return {
          question: safeText(it.question, 200),
          answer: safeText(it.answer, 1000),
        };
      }).filter((it) => it.question || it.answer);
    }

    return { id, type, visible: r.visible !== false, config };
  });
}

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
        subheading: "Browse our rentals, check availability, and plan your event online.",
        imageUrl: org.heroImageUrl || "",
        buttonLabel: "Check Availability",
        buttonHref: "/book",
      },
    },
    {
      id: "categories-" + (now + 1),
      type: "categories",
      visible: true,
      config: { heading: "Browse Our Rentals", subheading: "Find the equipment you need for your event." },
    },
    {
      id: "about-" + (now + 2),
      type: "about",
      visible: Boolean(org.aboutText || org.logoUrl),
      config: { heading: "About Us", body: org.aboutText || "", imageUrl: org.logoUrl || "" },
    },
    {
      id: "cta-" + (now + 3),
      type: "cta",
      visible: true,
      config: { heading: "Planning an event?", buttonLabel: "Check Availability", buttonHref: "/book" },
    },
  ];
}

export function emptySectionConfig(type: SectionType): SectionConfig {
  switch (type) {
    case "hero":
      return { heading: "Your Heading Here", subheading: "", imageUrl: "", buttonLabel: "Check Availability", buttonHref: "/book" };
    case "categories":
      return { heading: "Browse Our Rentals", subheading: "" };
    case "about":
      return { heading: "About Us", body: "", imageUrl: "" };
    case "cta":
      return { heading: "Planning an event?", buttonLabel: "Check Availability", buttonHref: "/book" };
    case "faq":
      return { heading: "Frequently Asked Questions", items: [] };
  }
}