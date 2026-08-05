import { notFound } from "next/navigation";
import { requireCurrentOrganization } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import StorefrontNav from "../StorefrontNav";

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

// Public-facing renderer for tenant-created custom pages (About Us, FAQ,
// Policies, etc.), built via the dashboard's Website Pages editor. Any
// path that isn't one of the platform's reserved routes (book, checkout,
// login, dashboard, ...) falls through to this dynamic segment.
export default async function CustomPage({
  params,
}: {
  params: { slug: string };
}) {
  const organization = await requireCurrentOrganization();

  const page = await prisma.page.findFirst({
    where: { organizationId: organization.id, slug: params.slug, isPublished: true },
  });

  if (!page) {
    notFound();
  }

  const blocks = parseBlocks(page.content);

  return (
    <div className="min-h-screen bg-gray-50">
      <StorefrontNav organizationId={organization.id} activeSlug={params.slug} />
      <div className="max-w-3xl mx-auto px-4 py-12 space-y-6">
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
                className="inline-block bg-brand-600 text-white px-5 py-2 rounded font-medium"
              >
                {block.label}
              </a>
            );
          }
          return null;
        })}
      </div>
    </div>
  );
}
