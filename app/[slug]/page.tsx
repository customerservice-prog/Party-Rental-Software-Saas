import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentOrganization } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { pageMetadata } from "@/lib/seo";
import StorefrontNav from "../StorefrontNav";
import StorefrontFooter from "../StorefrontFooter";

type Block =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "image"; url: string; alt: string }
  | { type: "button"; label: string; href: string };

function parseBlocks(content: string): Block[] {
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // ignore malformed content, render nothing rather than crash
  }
  return [];
}

// Pulls a short, real excerpt from the page's own authored content for use
// as a meta description, instead of a generic fallback. Never fabricated -
// it's just the tenant's first paragraph block, trimmed to a sane length.
function excerptFromBlocks(blocks: Block[]): string {
  const firstParagraph = blocks.find(
    (b): b is { type: "paragraph"; text: string } =>
      b.type === "paragraph" && !!b.text?.trim()
  );
  const text = firstParagraph?.text?.trim() || "";
  if (text.length <= 160) return text;
  return text.slice(0, 157).trimEnd() + "...";
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const organization = await getCurrentOrganization().catch(() => null);
  if (!organization) return {};

  const page = await prisma.page.findFirst({
    where: { organizationId: organization.id, slug: params.slug, isPublished: true },
  });
  if (!page) return {};

  const blocks = parseBlocks(page.content);
  const title = page.title + " — " + organization.name;
  const description =
    excerptFromBlocks(blocks) ||
    page.title + " — " + organization.name + ".";

  return {
    ...pageMetadata({
      title,
      description,
      path: "/t/" + organization.slug + "/" + params.slug,
    }),
    title: { absolute: title },
  };
}

// Public-facing renderer for tenant-created custom pages (About Us, FAQ,
// Policies, etc.), built via the dashboard's Website Pages editor. Any
// path that isn't one of the platform's reserved routes (book, checkout,
// login, dashboard, ...) falls through to this dynamic segment.
//
// A platform visitor with no resolvable tenant (e.g. someone on the
// marketing site who mistyped a URL) must get a normal 404, not a thrown
// error — so this uses getCurrentOrganization() and checks for null
// instead of requireCurrentOrganization(), which throws.
export default async function CustomPage({
  params,
}: {
  params: { slug: string };
}) {
  const organization = await getCurrentOrganization();

  if (!organization) {
    notFound();
  }

  const page = await prisma.page.findFirst({
    where: { organizationId: organization.id, slug: params.slug, isPublished: true },
  });

  if (!page) {
    notFound();
  }

  const blocks = parseBlocks(page.content);
  const accent = organization.primaryColor || "#2563eb";

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <StorefrontNav organizationId={organization.id} activeSlug={params.slug} />
      <div className="max-w-3xl mx-auto px-4 py-12 space-y-6 flex-1 w-full">
        <h1 className="text-3xl font-bold text-gray-900">{page.title}</h1>
        {blocks.map((block, i) => {
          if (block.type === "heading") {
            return (
              <h2 key={i} className="text-2xl font-semibold text-gray-900">
                {block.text}
              </h2>
            );
          }
          if (block.type === "paragraph") {
            return (
              <p key={i} className="text-gray-600 whitespace-pre-line">
                {block.text}
              </p>
            );
          }
          if (block.type === "image") {
            return (
              block.url && (
                <img key={i} src={block.url} alt={block.alt} className="rounded-lg max-w-full" />
              )
            );
          }
          if (block.type === "button") {
            return (
              <a
                key={i}
                href={block.href}
                className="inline-block text-white px-5 py-2 rounded font-medium"
                style={{ backgroundColor: accent }}
              >
                {block.label}
              </a>
            );
          }
          return null;
        })}
      </div>
      <StorefrontFooter organizationId={organization.id} />
    </div>
  );
}
