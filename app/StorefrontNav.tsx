import Link from "next/link";
import { prisma } from "@/lib/prisma";

// Shared navigation bar for tenant storefront pages (home, book, and any
// custom Pages the tenant has created). Always resolves nav links from the
// database so tenant-created pages show up automatically.
//
// This also renders the tenant's brand name. It intentionally does NOT rely
// on the root layout for branding (that layout is shared with platform
// marketing pages and must stay tenant-neutral), so this is the one place
// storefront pages get their business name from.
//
// The accent color mirrors the tenant's chosen brand color
// (Organization.primaryColor, set in Settings) so the nav always matches
// the same color used elsewhere on the storefront (book/category page
// headers, buttons) instead of a fixed platform blue.
export default async function StorefrontNav({
  organizationId,
  activeSlug,
}: {
  organizationId: string;
  activeSlug?: string;
}) {
  const [organization, pages] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true, primaryColor: true },
    }),
    prisma.page.findMany({
      where: { organizationId, showInNav: true, isPublished: true },
      orderBy: { navOrder: "asc" },
    }),
  ]);

  const accent = organization?.primaryColor || "#4f46e5";

  const linkClass = (slug: string) =>
    "hover:text-[var(--brand)] " +
    (activeSlug === slug ? "font-semibold" : "text-gray-700");

  const linkStyle = (slug: string) =>
    activeSlug === slug ? { color: accent } : undefined;

  return (
    <div className="bg-white border-b" style={{ "--brand": accent } as any}>
      <div className="max-w-6xl mx-auto px-4 pt-3">
        <Link href="/" className="font-bold text-lg" style={{ color: accent }}>
          {organization?.name || "Rental Storefront"}
        </Link>
      </div>
      <nav>
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap gap-5 text-sm">
          <Link href="/" className={linkClass("")} style={linkStyle("")}>
            Home
          </Link>
          <Link href="/book" className={linkClass("book")} style={linkStyle("book")}>
            Book Now
          </Link>
          <Link
            href="/order-status"
            className={linkClass("order-status")}
            style={linkStyle("order-status")}
          >
            Track Order
          </Link>
          {pages.map((page) => (
            <Link
              key={page.id}
              href={"/" + page.slug}
              className={linkClass(page.slug)}
              style={linkStyle(page.slug)}
            >
              {page.navLabel || page.title}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
