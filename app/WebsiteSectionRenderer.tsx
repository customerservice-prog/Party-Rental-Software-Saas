import Link from "next/link";
import type { FocusEvent, KeyboardEvent } from "react";
import type {
  FaqItem,
  SectionConfig,
  WebsiteSection,
} from "@/lib/websiteSections";
import { SECTION_LABELS } from "@/lib/websiteSections";

// Renderer for the tenant homepage section builder. Deliberately
// framework-thin (no data fetching, no Prisma) so the exact same
// components can be used by:
// - the public tenant homepage (app/page.tsx, server component, reads
//   Website.publishedSections) - always rendered with editable=false.
// - the dashboard "Website" editor (app/dashboard/website/page.tsx,
//   client component, reads/edits Website.draftSections) - rendered with
//   editable=true, which layers on click-to-select outlines, inline
//   contentEditable text, image-replace overlays, and non-navigating
//   buttons/links. The underlying section markup is identical either way,
//   so the editor preview can never drift from what customers will see.
//
// Safety: contentEditable fields only ever read back plain textContent
// (never innerHTML), so no HTML/script can be injected this way, and the
// server independently re-validates everything in lib/websiteSections.ts
// before it is ever saved.

export interface CategoryLite {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
}

interface EditableHandlers {
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  onTextChange?: (id: string, field: keyof SectionConfig, value: string) => void;
  onReplaceImage?: (id: string) => void;
  onFaqChange?: (id: string, items: FaqItem[]) => void;
}

export function WebsiteSectionRenderer({
  sections,
  categories,
  editable = false,
  selectedId,
  onSelect,
  onTextChange,
  onReplaceImage,
  onFaqChange,
}: {
  sections: WebsiteSection[];
  categories: CategoryLite[];
  editable?: boolean;
} & EditableHandlers) {
  const visible = editable ? sections : sections.filter((section) => section.visible);

  if (!editable) {
    return (
      <>
        {visible.map((section) => (
          <SectionBlock
            key={section.id}
            section={section}
            categories={categories}
            editable={false}
          />
        ))}
      </>
    );
  }

  return (
    <>
      {visible.map((section) => (
        <div
          key={section.id}
          onClick={() => onSelect?.(section.id)}
          className={
            "relative outline outline-2 -outline-offset-2 transition-colors cursor-pointer " +
            (selectedId === section.id
              ? "outline-indigo-500"
              : "outline-transparent hover:outline-indigo-200") +
            (!section.visible ? " opacity-40" : "")
          }
        >
          {selectedId === section.id && (
            <span className="pointer-events-none absolute top-1 left-1 z-10 rounded bg-indigo-600 px-2 py-0.5 text-[10px] font-medium text-white">
              {SECTION_LABELS[section.type]}
            </span>
          )}
          {!section.visible && (
            <span className="pointer-events-none absolute top-1 right-1 z-10 rounded bg-gray-800 px-2 py-0.5 text-[10px] font-medium text-white">
              Hidden
            </span>
          )}
          <SectionBlock
            section={section}
            categories={categories}
            editable
            onTextChange={onTextChange}
            onReplaceImage={onReplaceImage}
            onFaqChange={onFaqChange}
          />
        </div>
      ))}
    </>
  );
}

function SectionBlock({
  section,
  categories,
  editable,
  onTextChange,
  onReplaceImage,
  onFaqChange,
}: {
  section: WebsiteSection;
  categories: CategoryLite[];
  editable: boolean;
  onTextChange?: (id: string, field: keyof SectionConfig, value: string) => void;
  onReplaceImage?: (id: string) => void;
  onFaqChange?: (id: string, items: FaqItem[]) => void;
}) {
  if (section.type === "hero") {
    return (
      <HeroSection
        section={section}
        editable={editable}
        onTextChange={onTextChange}
        onReplaceImage={onReplaceImage}
      />
    );
  }
  if (section.type === "categories") {
    return (
      <CategoriesSection
        section={section}
        categories={categories}
        editable={editable}
        onTextChange={onTextChange}
      />
    );
  }
  if (section.type === "about") {
    return (
      <AboutSection
        section={section}
        editable={editable}
        onTextChange={onTextChange}
        onReplaceImage={onReplaceImage}
      />
    );
  }
  if (section.type === "cta") {
    return <CtaSection section={section} editable={editable} onTextChange={onTextChange} />;
  }
  if (section.type === "faq") {
    return (
      <FaqSection
        section={section}
        editable={editable}
        onTextChange={onTextChange}
        onFaqChange={onFaqChange}
      />
    );
  }
  return null;
}

// Shared inline-editable text element. Uncontrolled while focused (only
// commits on blur) so the caret never jumps mid-edit, and only ever reads
// plain textContent back out - never innerHTML.
function Editable({
  as,
  value,
  placeholder,
  onCommit,
  className = "",
  multiline = false,
}: {
  as: "h1" | "h2" | "p" | "div" | "span";
  value: string;
  placeholder: string;
  onCommit: (value: string) => void;
  className?: string;
  multiline?: boolean;
}) {
  const Tag = as;
  return (
    <Tag
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      aria-label={placeholder}
      data-placeholder={placeholder}
      className={
        className +
        " editable-field outline-none rounded cursor-text whitespace-pre-line focus:ring-2 focus:ring-indigo-400 focus:ring-inset"
      }
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e: KeyboardEvent<HTMLElement>) => {
        if (!multiline && e.key === "Enter") {
          e.preventDefault();
          e.currentTarget.blur();
        }
      }}
      onBlur={(e: FocusEvent<HTMLElement>) => {
        const text = (e.currentTarget.textContent || "").trim();
        if (text !== value) onCommit(text);
      }}
    >
      {value}
    </Tag>
  );
}

function ImageOverlay({ hasImage, onClick }: { hasImage: boolean; onClick: () => void }) {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/0 opacity-0 transition-opacity hover:bg-black/30 hover:opacity-100">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        className="rounded bg-black/70 px-3 py-1.5 text-xs font-medium text-white"
      >
        {hasImage ? "Replace image" : "Add image"}
      </button>
    </div>
  );
}

function HeroSection({
  section,
  editable,
  onTextChange,
  onReplaceImage,
}: {
  section: WebsiteSection;
  editable: boolean;
  onTextChange?: (id: string, field: keyof SectionConfig, value: string) => void;
  onReplaceImage?: (id: string) => void;
}) {
  const { config } = section;
  const bgStyle = config.imageUrl
    ? {
        backgroundImage:
          "linear-gradient(rgba(0,0,0,0.35), rgba(0,0,0,0.35)), url(" + config.imageUrl + ")",
        backgroundSize: "cover",
        backgroundPosition: "center",
        color: "white",
      }
    : undefined;

  if (!editable) {
    return (
      <section className="bg-brand-50 py-16 px-4 text-center" style={bgStyle}>
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

  return (
    <section className="relative bg-brand-50 py-16 px-4 text-center" style={bgStyle}>
      <ImageOverlay
        hasImage={!!config.imageUrl}
        onClick={() => onReplaceImage?.(section.id)}
      />
      <Editable
        as="h1"
        className="text-3xl font-bold mb-4"
        value={config.heading || ""}
        placeholder="Click to add a heading"
        onCommit={(v) => onTextChange?.(section.id, "heading", v)}
      />
      <Editable
        as="p"
        className="max-w-xl mx-auto mb-6 opacity-90"
        value={config.subheading || ""}
        placeholder="Click to add a subheading"
        onCommit={(v) => onTextChange?.(section.id, "subheading", v)}
      />
      <span className="relative z-10 inline-block bg-brand-600 text-white px-6 py-3 rounded font-medium">
        <Editable
          as="span"
          value={config.buttonLabel || ""}
          placeholder="Button label"
          onCommit={(v) => onTextChange?.(section.id, "buttonLabel", v)}
        />
      </span>
    </section>
  );
}

function CategoriesSection({
  section,
  categories,
  editable,
  onTextChange,
}: {
  section: WebsiteSection;
  categories: CategoryLite[];
  editable: boolean;
  onTextChange?: (id: string, field: keyof SectionConfig, value: string) => void;
}) {
  const { config } = section;
  // Always driven by live Category data - never stored/duplicated in
  // section config, so price/availability/publication changes in
  // Inventory show up on the homepage automatically.
  if (!editable && categories.length === 0) return null;

  const heading = editable ? (
    <Editable
      as="h2"
      className="text-2xl font-bold mb-2"
      value={config.heading || ""}
      placeholder="Click to add a heading"
      onCommit={(v) => onTextChange?.(section.id, "heading", v)}
    />
  ) : (
    config.heading && <h2 className="text-2xl font-bold mb-2">{config.heading}</h2>
  );

  const subheading = editable ? (
    <Editable
      as="p"
      className="text-gray-600 mb-6"
      value={config.subheading || ""}
      placeholder="Click to add an optional subheading"
      onCommit={(v) => onTextChange?.(section.id, "subheading", v)}
    />
  ) : (
    config.subheading && <p className="text-gray-600 mb-6">{config.subheading}</p>
  );

  return (
    <section className="max-w-5xl mx-auto py-12 px-4">
      {heading}
      {subheading}
      {categories.length === 0 ? (
        editable && (
          <p className="rounded border border-dashed border-gray-300 p-4 text-sm italic text-gray-400">
            No published categories yet. Categories marked "Display to customer" in
            Inventory will automatically appear here.
          </p>
        )
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {categories.map((category) =>
            editable ? (
              <div key={category.id} className="border rounded p-4">
                <div className="font-semibold">{category.name}</div>
                {category.description && (
                  <p className="text-sm text-gray-500 mt-1">{category.description}</p>
                )}
              </div>
            ) : (
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
            )
          )}
        </div>
      )}
    </section>
  );
}

function AboutSection({
  section,
  editable,
  onTextChange,
  onReplaceImage,
}: {
  section: WebsiteSection;
  editable: boolean;
  onTextChange?: (id: string, field: keyof SectionConfig, value: string) => void;
  onReplaceImage?: (id: string) => void;
}) {
  const { config } = section;
  if (!editable && !config.heading && !config.body && !config.imageUrl) return null;

  return (
    <section className="max-w-3xl mx-auto py-12 px-4">
      {editable ? (
        <div className="relative mb-6 inline-block">
          {config.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={config.imageUrl} alt="" className="max-h-40 object-contain" />
          )}
          {!config.imageUrl && (
            <div className="flex h-24 w-40 items-center justify-center rounded border border-dashed border-gray-300 text-xs text-gray-400">
              No image
            </div>
          )}
          <ImageOverlay
            hasImage={!!config.imageUrl}
            onClick={() => onReplaceImage?.(section.id)}
          />
        </div>
      ) : (
        config.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={config.imageUrl} alt="" className="mb-6 max-h-40 object-contain" />
        )
      )}

      {editable ? (
        <Editable
          as="h2"
          className="text-2xl font-bold mb-4"
          value={config.heading || ""}
          placeholder="Click to add a heading"
          onCommit={(v) => onTextChange?.(section.id, "heading", v)}
        />
      ) : (
        config.heading && <h2 className="text-2xl font-bold mb-4">{config.heading}</h2>
      )}

      {editable ? (
        <Editable
          as="p"
          className="text-gray-600"
          value={config.body || ""}
          placeholder="Click to add a description of your business"
          multiline
          onCommit={(v) => onTextChange?.(section.id, "body", v)}
        />
      ) : (
        config.body && <p className="text-gray-600 whitespace-pre-line">{config.body}</p>
      )}
    </section>
  );
}

function CtaSection({
  section,
  editable,
  onTextChange,
}: {
  section: WebsiteSection;
  editable: boolean;
  onTextChange?: (id: string, field: keyof SectionConfig, value: string) => void;
}) {
  const { config } = section;
  if (!editable && !config.heading && !(config.buttonLabel && config.buttonHref)) return null;

  return (
    <section className="bg-gray-900 text-white py-12 px-4 text-center">
      {editable ? (
        <Editable
          as="h2"
          className="text-2xl font-bold mb-4"
          value={config.heading || ""}
          placeholder="Click to add a heading"
          onCommit={(v) => onTextChange?.(section.id, "heading", v)}
        />
      ) : (
        config.heading && <h2 className="text-2xl font-bold mb-4">{config.heading}</h2>
      )}
      {editable ? (
        <span className="inline-block bg-white text-gray-900 px-6 py-3 rounded font-medium">
          <Editable
            as="span"
            value={config.buttonLabel || ""}
            placeholder="Button label"
            onCommit={(v) => onTextChange?.(section.id, "buttonLabel", v)}
          />
        </span>
      ) : (
        config.buttonLabel &&
        config.buttonHref && (
          <Link
            href={config.buttonHref}
            className="inline-block bg-white text-gray-900 px-6 py-3 rounded font-medium"
          >
            {config.buttonLabel}
          </Link>
        )
      )}
    </section>
  );
}

function FaqSection({
  section,
  editable,
  onTextChange,
  onFaqChange,
}: {
  section: WebsiteSection;
  editable: boolean;
  onTextChange?: (id: string, field: keyof SectionConfig, value: string) => void;
  onFaqChange?: (id: string, items: FaqItem[]) => void;
}) {
  const { config } = section;
  const items = config.items || [];
  // Only ever renders tenant-authored Q&A - never fabricated, and the
  // section is hidden entirely on the public site rather than shown empty.
  if (!editable && items.length === 0) return null;

  function updateItem(index: number, field: keyof FaqItem, value: string) {
    onFaqChange?.(
      section.id,
      items.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  }
  function removeItem(index: number) {
    onFaqChange?.(section.id, items.filter((_, i) => i !== index));
  }
  function addItem() {
    onFaqChange?.(section.id, [
      ...items,
      { question: "New question", answer: "Answer goes here." },
    ]);
  }

  return (
    <section className="max-w-3xl mx-auto py-12 px-4">
      {editable ? (
        <Editable
          as="h2"
          className="text-2xl font-bold mb-6"
          value={config.heading || ""}
          placeholder="Click to add a heading"
          onCommit={(v) => onTextChange?.(section.id, "heading", v)}
        />
      ) : (
        config.heading && <h2 className="text-2xl font-bold mb-6">{config.heading}</h2>
      )}
      <div className="space-y-4">
        {items.map((item, i) => (
          <div key={i} className={"border-b pb-4" + (editable ? " relative pr-16" : "")}>
            {editable && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeItem(i);
                }}
                className="absolute right-0 top-0 text-xs text-red-600 hover:underline"
              >
                Remove
              </button>
            )}
            {editable ? (
              <Editable
                as="div"
                className="font-semibold"
                value={item.question}
                placeholder="Question"
                onCommit={(v) => updateItem(i, "question", v)}
              />
            ) : (
              <div className="font-semibold">{item.question}</div>
            )}
            {editable ? (
              <Editable
                as="p"
                className="text-gray-600 mt-1"
                value={item.answer}
                placeholder="Answer"
                multiline
                onCommit={(v) => updateItem(i, "answer", v)}
              />
            ) : (
              <p className="text-gray-600 mt-1">{item.answer}</p>
            )}
          </div>
        ))}
        {items.length === 0 && editable && (
          <p className="text-sm italic text-gray-400">No questions yet. Add one below.</p>
        )}
      </div>
      {editable && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            addItem();
          }}
          className="mt-4 text-sm text-indigo-600 hover:underline"
        >
          + Add question
        </button>
      )}
    </section>
  );
}
