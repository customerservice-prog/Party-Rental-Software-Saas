import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentOrganization } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";

export default async function StorefrontHomePage() {
    const organization = await getCurrentOrganization();

  if (!organization) {
    redirect("/signup");
  }

  const categories = await prisma.category.findMany({
        where: { organizationId: organization.id, displayToCustomer: true },
        orderBy: { sortOrder: "asc" },
  });

  return (
        <div>
              <section className="bg-brand-50 py-16 px-4 text-center">
                      <h1 className="text-3xl font-bold mb-4">
                                Party & Event Rentals from {organization.name}
                      </h1>
                      <p className="text-gray-600 max-w-xl mx-auto mb-6">
                                Browse our rental categories below and book your next event online
                                in minutes.
                      </p>
                      <Link
                                  href="/book"
                                  className="inline-block bg-brand-600 text-white px-6 py-3 rounded font-medium"
                                >
                                Book Now
                      </Link>
              </section>
        
              <section className="max-w-5xl mx-auto py-12 px-4">
                      <h2 className="text-2xl font-bold mb-6">Browse Our Rentals</h2>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                        {categories.map((category) => (
                      <Link
                                      key={category.id}
                                      href={"/rentals/" + category.slug}
                                      className="border rounded p-4 hover:shadow-md transition"
                                    >
                                    <div className="font-semibold">{category.name}</div>
                        {category.description && (
                                                      <p className="text-sm text-gray-500 mt-1">
                                                        {category.description}
                                                      </p>
                                    )}
                      </Link>
                    ))}
                      </div>
              </section>
        </div>
      );
}
