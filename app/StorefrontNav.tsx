import Link from "next/link";
import { prisma } from "@/lib/prisma";

// Shared navigation bar for tenant storefront pages (home, book, and any
// custom Pages the tenant has created). Always resolves nav links from the
// database so tenant-created pages show up automatically.
export default async function StorefrontNav({
  organizationId,
  activeSlug,
}: {
  organizationId: string;
  activeSlug?: string;
}) {
  const pages = await prisma.page.findMany({
    where: { organizationId, showInNav: true, isPublished: true },
    orderBy: { navOrder: "asc" },
  });

  const linkClass = (slug: string) =>
    "hover:text-brand-600 " +
    (activeSlug === slug ? "text-brand-600 font-semibold" : "text-gray-700");

  return (
    <nav className="bg-white border-b">
      <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap gap-5 text-sm">
        <Link href="/" className={linkClass("")}>
          Home
        </Link>
        <Link href="/book" className={linkClass("book")}>
          Book Now
        </Link>
        {pages.map((page) => (
          <Link key={page.id} href={"/" + page.slug} className={linkClass(page.slug)}>
            {page.navLabel || page.title}
          </Link>
        ))}
      </div>
    </nav>
  );
}
