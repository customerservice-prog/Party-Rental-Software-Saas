import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireCurrentOrganization } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { pageMetadata } from "@/lib/seo";
import StorefrontNav from "../../StorefrontNav";
import StorefrontFooter from "../../StorefrontFooter";
import { AddToCartButton } from "../../StorefrontCartControls";

export async function generateMetadata({ params: paramsPromise }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const params = await paramsPromise;

  const organization = await requireCurrentOrganization().catch(() => null);
  if (!organization) return {};
  const category = await prisma.category.findFirst({ where: { organizationId: organization.id, slug: params.slug, displayToCustomer: true } });
  if (!category) return {};
  const title = `${category.name} Rentals — ${organization.name}`;
  const description = category.description?.trim() || `Browse ${category.name} rentals, see pricing, and start your reservation online with ${organization.name}.`;
  return { ...pageMetadata({ title, description, path: `/t/${organization.slug}/rentals/${params.slug}` }), title: { absolute: title } };
}

export default async function CategoryPage({ params: paramsPromise }: { params: Promise<{ slug: string }> }) {
  const params = await paramsPromise;

  const organization = await requireCurrentOrganization();
  const category = await prisma.category.findFirst({ where: { organizationId: organization.id, slug: params.slug, displayToCustomer: true } });
  if (!category) notFound();

  const items = await prisma.item.findMany({
    where: { organizationId: organization.id, categoryId: category.id, displayToCustomer: true },
    orderBy: [{ name: "asc" }],
  });
  const accent = organization.primaryColor || "#4f46e5";

  return (
    <div className="min-h-screen bg-[#f7f8fa] text-slate-950" style={{ "--store-accent": accent } as React.CSSProperties}>
      <StorefrontNav organizationId={organization.id} activeSlug="rentals" />

      <main>
        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
              <Link href="/" className="font-medium hover:text-slate-900">Home</Link><span>/</span><span className="text-slate-700">{category.name}</span>
            </div>
            <div className="mt-5 max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-[.18em]" style={{ color: accent }}>Browse rentals</p>
              <h1 className="mt-2 text-3xl font-black tracking-[-.035em] sm:text-5xl">{category.name}</h1>
              <p className="mt-4 text-base leading-7 text-slate-600 sm:text-lg">{category.description || `Choose from our available ${category.name.toLowerCase()} and build your reservation online.`}</p>
            </div>
            <div className="mt-6 flex flex-wrap gap-3 text-sm text-slate-600">
              <span className="rounded-full bg-slate-100 px-3 py-1.5">{items.length} {items.length === 1 ? "rental" : "rentals"}</span>
              <span className="rounded-full bg-slate-100 px-3 py-1.5">Add multiple rentals to one order</span>
              <span className="rounded-full bg-slate-100 px-3 py-1.5">Availability checked before payment</span>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
          {items.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-2xl">↗</div>
              <h2 className="mt-5 text-xl font-bold">More rentals are being added</h2>
              <p className="mx-auto mt-2 max-w-lg text-slate-600">There are no customer-visible items in this category right now. Browse the rest of the rental catalog or contact us for help.</p>
              <Link href="/" className="mt-6 inline-flex rounded-xl px-5 py-3 font-bold text-white" style={{ backgroundColor: accent }}>Browse all rentals</Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {items.map((item) => (
                <article key={item.id} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-xl">
                  <Link href={`/checkout?itemId=${item.id}`} className="block">
                    <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                      {item.picture ? <img src={item.picture} alt={item.name} className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" /> : <div className="flex h-full items-center justify-center px-6 text-center text-sm font-medium text-slate-400">Photo coming soon</div>}
                      <div className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm">Available to reserve</div>
                    </div>
                  </Link>
                  <div className="p-5">
                    <Link href={`/checkout?itemId=${item.id}`}><h2 className="text-lg font-bold leading-6 text-slate-950 group-hover:underline">{item.name}</h2></Link>
                    {item.description && <p className="mt-2 line-clamp-2 min-h-[40px] text-sm leading-5 text-slate-500">{item.description}</p>}
                    <div className="mt-5 border-t border-slate-100 pt-4">
                      <div className="flex items-end justify-between gap-3"><div><p className="text-xs font-medium uppercase tracking-wide text-slate-400">Rental price</p><p className="mt-0.5 text-2xl font-black" style={{ color: accent }}>${item.cost.toFixed(2)}</p></div></div>
                      <div className="mt-4 flex gap-2"><AddToCartButton organizationId={organization.id} item={{ id: item.id, name: item.name, cost: item.cost, picture: item.picture }} accent={accent}/><Link href={`/checkout?itemId=${item.id}`} className="flex-1 rounded-xl px-4 py-2.5 text-center text-sm font-bold text-white shadow-sm transition hover:brightness-95" style={{ backgroundColor: accent }}>Book now</Link></div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}

          {items.length > 0 && <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-5 sm:flex sm:items-center sm:justify-between sm:p-6"><div><h3 className="font-bold text-slate-900">Build one complete event order</h3><p className="mt-1 text-sm text-slate-600">Add tents, tables, chairs, games and other rentals to your cart, then choose one event date and checkout once.</p></div><div className="mt-4 flex gap-3 sm:mt-0"><Link href="/" className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700">All rentals</Link><Link href="/cart" className="rounded-xl px-4 py-2.5 text-sm font-bold text-white" style={{ backgroundColor: accent }}>View cart</Link></div></div>}
        </section>
      </main>
      <StorefrontFooter organizationId={organization.id} />
    </div>
  );
}
