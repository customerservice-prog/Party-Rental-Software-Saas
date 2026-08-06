import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCurrentOrganization } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import StorefrontNav from "../../StorefrontNav";

// Public category listing page, e.g. /rentals/bounce-houses. Linked to from
// the storefront home page's "Browse Our Rentals" category cards.
export default async function CategoryPage({
  params,
}: {
  params: { slug: string };
}) {
  const organization = await requireCurrentOrganization();

  const category = await prisma.category.findFirst({
    where: {
      organizationId: organization.id,
      slug: params.slug,
      displayToCustomer: true,
    },
  });

  if (!category) {
    notFound();
  }

  const items = await prisma.item.findMany({
    where: {
      organizationId: organization.id,
      categoryId: category.id,
      displayToCustomer: true,
    },
    orderBy: { name: "asc" },
  });

  const accent = organization.primaryColor || "#4f46e5";

  return (
    <div className="min-h-screen bg-gray-50">
      <StorefrontNav organizationId={organization.id} activeSlug="" />
      <header className="text-white" style={{ backgroundColor: accent }}>
        <div className="max-w-6xl mx-auto px-8 py-10">
          <Link href="/" className="text-white/80 text-sm hover:underline">
            &larr; All categories
          </Link>
          <h1 className="text-3xl font-bold mt-2">{category.name}</h1>
          {category.description && (
            <p className="text-white/90 mt-2 max-w-2xl">{category.description}</p>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.length === 0 && (
            <p className="text-gray-500 col-span-full">
              No rental items are available in this category yet. Please check back soon.
            </p>
          )}
          {items.map((item) => (
            <div key={item.id} className="bg-white rounded-lg shadow overflow-hidden flex flex-col">
              <div className="h-40 bg-gray-100 flex items-center justify-center text-gray-400 text-sm">
                {item.picture ? (
                  <img src={item.picture} alt={item.name} className="h-full w-full object-cover" />
                ) : (
                  "No image"
                )}
              </div>
              <div className="p-4 flex flex-col flex-1">
                <h3 className="font-semibold text-gray-900">{item.name}</h3>
                <p className="text-sm text-gray-500 mt-1 flex-1">{item.description}</p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="font-bold" style={{ color: accent }}>
                    ${item.cost.toFixed(2)}
                  </span>
                  <Link
                    href={"/checkout?itemId=" + item.id}
                    className="text-white text-sm px-3 py-1.5 rounded-md"
                    style={{ backgroundColor: accent }}
                  >
                    Book Now
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
