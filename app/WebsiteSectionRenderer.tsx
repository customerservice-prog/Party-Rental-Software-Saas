import Link from "next/link";
import type { WebsiteSection } from "@/lib/websiteSections";

// Pure presentational renderer for the tenant homepage section builder.
// Deliberately framework-thin (no data fetching, no Prisma) so the exact
// same components can be used by:
//   - the public tenant homepage (app/page.tsx, server component, reads
//     Website.publishedSections)
//   - the dashboard "Website" editor (app/dashboard/website/page.tsx,
//     client component, reads/edits Website.draftSections)
// This guarantees the editor preview always matches what customers will
// actually see - there is no second rendering implementation to drift.

export interface CategoryLite {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
}

export function WebsiteSectionRenderer({
  sections,
  categories,
}: {
  sections: WebsiteSection[];
  categories: CategoryLite[];
}) {
  return (
    <>
      {sections
        .filter((section) => section.visible)
        .map((section) => (
          <SectionBlock key={section.id} section={section} categories={categories} />
        ))}
    </>
  );
}

function SectionBlock({
  section,
  categories,
}: {
  section: WebsiteSection;
  categories: CategoryLite[];
}) {
  const { config } = section;

  if (section.type === "hero") {
    return (
      <section
        className="bg-brand-50 py-16 px-4 text-center"
        style={
          config.imageUrl
            ? {
                backgroundImage:
                  "linear-gradient(rgba(0,0,0,0.35), rgba(0,0,0,0.35)), url(" +
                  config.imageUrl +
                  ")",
                backgroundSize: "cover",
                backgroundPosition: "center",
                color: "white",
              }
            : undefined
        }
      >
        {config.heading && <h1 className="text-3xl font-bold mb-4">{config.heading}</h1>}
        {config.subheading && (
          <p className="max-w-xl mx-auto mb-6 opacity-90">{config.subheading}</p>
        )}
        {config.buttonLabel && config.buttonHref && (
          <Link
            href={config.buttonHref}
            className="inline-block bg-brand-600 text-white px-6 py-3 rounded font-medium"
          >
            {config.buttonLabel}
          </Link>
        )}
      </section>
    );
  }

  if (section.type === "categories") {
    // Always driven by live Category data - never stored/duplicated in
    // section config, so price/availability/publication changes in
    // Inventory show up on the homepage automatically.
    if (categories.length === 0) return null;
    return (
      <section className="max-w-5xl mx-auto py-12 px-4">
        {config.heading && <h2 className="text-2xl font-bold mb-2">{config.heading}</h2>}
        {config.subheading && <p className="text-gray-600 mb-6">{config.subheading}</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {categories.map((category) => (
            <Link
              key={category.id}
              href={"/rentals/" + category.slug}
              className="border rounded p-4 hover:shadow-md transition"
            >
              <div className="font-semibold">{category.name}</div>
              {category.description && (
                <p className="text-sm text-gray-500 mt-1">{category.description}</p>
              )}
            </Link>
          ))}
        </div>
      </section>
    );
  }

  if (section.type === "about") {
    if (!config.heading && !config.body && !config.imageUrl) return null;
    return (
      <section className="max-w-3xl mx-auto py-12 px-4">
        {config.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={config.imageUrl} alt="" className="mb-6 max-h-40 object-contain" />
        )}
        {config.heading && <h2 className="text-2xl font-bold mb-4">{config.heading}</h2>}
        {config.body && <p className="text-gray-600 whitespace-pre-line">{config.body}</p>}
      </section>
    );
  }

  if (section.type === "cta") {
    if (!config.heading && !(config.buttonLabel && config.buttonHref)) return null;
    return (
      <section className="bg-gray-900 text-white py-12 px-4 text-center">
        {config.heading && <h2 className="text-2xl font-bold mb-4">{config.heading}</h2>}
        {config.buttonLabel && config.buttonHref && (
          <Link
            href={config.buttonHref}
            className="inline-block bg-white text-gray-900 px-6 py-3 rounded font-medium"
          >
            {config.buttonLabel}
          </Link>
        )}
      </section>
    );
  }

  if (section.type === "faq") {
    // Only ever renders tenant-authored Q&A - never fabricated, and the
    // section is hidden entirely rather than shown empty.
    if (!config.items || config.items.length === 0) return null;
    return (
      <section className="max-w-3xl mx-auto py-12 px-4">
        {config.heading && <h2 className="text-2xl font-bold mb-6">{config.heading}</h2>}
        <div className="space-y-4">
          {config.items.map((item, i) => (
            <div key={i} className="border-b pb-4">
              <div className="font-semibold">{item.question}</div>
              <p className="text-gray-600 mt-1">{item.answer}</p>
            </div>
          ))}
        </div>
      </section>
    );
  }

  return null;
}
