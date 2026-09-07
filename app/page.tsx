import Link from "next/link";
import type { Metadata } from "next";
import { getOrganizationFromHost } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import StorefrontNav from "./StorefrontNav";
import MarketingHomePage from "./(marketing)/_components/MarketingHomePage";
import MarketingHeader from "./(marketing)/_components/MarketingHeader";
import MarketingFooter from "./(marketing)/_components/MarketingFooter";
import { pageMetadata, SITE_NAME } from "@/lib/seo";

// The root route serves two very different audiences depending on how it
// was reached: a platform visitor with no resolved tenant sees the
// marketing homepage (this is the SaaS's own front door), while a request
// that resolves to a tenant organization sees that tenant's storefront.
export async function generateMetadata(): Promise<Metadata> {
  const organization = await getOrganizationFromHost().catch(() => null);

  if (!organization) {
    return {
      ...pageMetadata({
        title:
          SITE_NAME +
          " — Party & Event Rental Software Built to Run Your Whole Rental Business",
        description:
          "Party Rental CRM runs bookings, inventory, scheduling, delivery, drivers, payments, staff, and reporting for party and event rental companies in one system.",
        path: "/",
      }),
      title: {
        absolute:
          SITE_NAME +
          " — Party & Event Rental Software Built to Run Your Whole Rental Business",
      },
    };
  }

  return {
    title: organization.name + " — Book Your Event Rentals Online",
    description:
      "Browse rental categories and book your next event online with " +
      organization.name +
      ".",
    robots: { index: false, follow: false },
  };
}

export default async function RootPage() {
  const organization = await getOrganizationFromHost();

  if (!organization) {
    return (
      <div className="flex min-h-screen flex-col">
        <MarketingHeader />
        <main className="flex-1">
          <MarketingHomePage />
        </main>
        <MarketingFooter />
      </div>
    );
  }

  const categories = await prisma.category.findMany({
    where: { organizationId: organization.id, displayToCustomer: true },
    orderBy: { sortOrder: "asc" },
  });

  return (
    <div>
      <StorefrontNav organizationId={organization.id} activeSlug="" />
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
