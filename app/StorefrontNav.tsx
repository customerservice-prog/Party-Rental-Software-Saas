import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { StorefrontCartLink } from "./StorefrontCartControls";

export default async function StorefrontNav({ organizationId, activeSlug }: { organizationId: string; activeSlug?: string }) {
  const [organization, pages] = await Promise.all([
    prisma.organization.findUnique({ where: { id: organizationId }, select: { name: true, primaryColor: true, logoUrl: true } }),
    prisma.page.findMany({ where: { organizationId, showInNav: true, isPublished: true }, orderBy: { navOrder: "asc" } }),
  ]);
  const accent = organization?.primaryColor || "#4f46e5";
  const linkClass = (slug: string) => `rounded-lg px-3 py-2 text-sm font-semibold transition hover:bg-slate-100 ${activeSlug === slug ? "bg-slate-100 text-slate-950" : "text-slate-600 hover:text-slate-950"}`;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/90 bg-white/95 shadow-sm backdrop-blur" style={{ "--brand": accent } as React.CSSProperties}>
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          {organization?.logoUrl ? <img src={organization.logoUrl} alt="" className="h-10 w-10 shrink-0 rounded-lg object-contain" /> : <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg font-black text-white" style={{ backgroundColor: accent }}>{organization?.name?.charAt(0) || "R"}</span>}
          <span className="truncate text-base font-black tracking-tight text-slate-950 sm:text-lg">{organization?.name || "Rental Storefront"}</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          <Link href="/" className={linkClass("")}>Home</Link>
          <Link href="/book" className={linkClass("book")}>Rentals</Link>
          <Link href="/order-status" className={linkClass("order-status")}>Track Order</Link>
          {pages.map((page: { id: string; slug: string; navLabel: string | null; title: string }) => <Link key={page.id} href={`/${page.slug}`} className={linkClass(page.slug)}>{page.navLabel || page.title}</Link>)}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <StorefrontCartLink organizationId={organizationId} accent={accent} />
          <Link href="/book" className="hidden rounded-xl px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:brightness-95 sm:inline-flex" style={{ backgroundColor: accent }}>Check availability</Link>
        </div>
      </div>
      <nav className="flex gap-1 overflow-x-auto border-t border-slate-100 px-3 py-2 md:hidden">
        <Link href="/" className={linkClass("")}>Home</Link><Link href="/book" className={linkClass("book")}>Rentals</Link><Link href="/order-status" className={linkClass("order-status")}>Track Order</Link>{pages.map((page) => <Link key={page.id} href={`/${page.slug}`} className={`${linkClass(page.slug)} whitespace-nowrap`}>{page.navLabel || page.title}</Link>)}
      </nav>
    </header>
  );
}
