import Link from "next/link";
import type { Metadata } from "next";
import { getOrganizationFromHost } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import StorefrontNav from "./StorefrontNav";
import StorefrontFooter from "./StorefrontFooter";
import MarketingHomePage from "./(marketing)/_components/MarketingHomePage";
import MarketingHeader from "./(marketing)/_components/MarketingHeader";
import MarketingFooter from "./(marketing)/_components/MarketingFooter";
import { pageMetadata, SITE_NAME } from "@/lib/seo";
import { WebsiteSectionRenderer } from "./WebsiteSectionRenderer";
import { validateSections, type WebsiteSection } from "@/lib/websiteSections";

function parsePublishedSections(value: string | null | undefined): WebsiteSection[] | null {
  if (!value) return null;
  try {
    return validateSections(JSON.parse(value));
  } catch {
    return null;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const organization = await getOrganizationFromHost().catch(() => null);
  if (!organization) {
    const title = SITE_NAME + " — Party & Event Rental Software Built to Run Your Whole Rental Business";
    return {
      ...pageMetadata({
        title,
        description: "Party Rental CRM runs bookings, inventory, scheduling, delivery, drivers, payments, staff, and reporting for party and event rental companies in one system.",
        path: "/",
      }),
      title: { absolute: title },
    };
  }

  const website = await prisma.website.findUnique({
    where: { organizationId: organization.id },
    select: { publishedSections: true },
  });
  const sections = parsePublishedSections(website?.publishedSections);
  const hero = sections?.find((section) => section.type === "hero" && section.visible);
  const heroHeading = hero?.config.heading?.trim() || "";
  const heroSubheading = hero?.config.subheading?.trim() || "";
  const title = organization.seoTitle?.trim() || heroHeading || organization.name + " — Book Your Event Rentals Online";
  const description = organization.seoDescription?.trim() || heroSubheading || "Browse rental categories and book your next event online with " + organization.name + ".";

  return {
    ...pageMetadata({
      title,
      description,
      path: organization.slug ? "/t/" + organization.slug : "/",
      noIndex: !sections,
    }),
    title: { absolute: title },
  };
}

export default async function RootPage() {
  const organization = await getOrganizationFromHost();
  if (!organization) {
    return (
      <div className="flex min-h-screen flex-col">
        <MarketingHeader />
        <main className="flex-1"><MarketingHomePage /></main>
        <MarketingFooter />
      </div>
    );
  }

  const [categories, website] = await Promise.all([
    prisma.category.findMany({
      where: { organizationId: organization.id, displayToCustomer: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.website.findUnique({
      where: { organizationId: organization.id },
      select: { publishedSections: true },
    }),
  ]);
  const sections = parsePublishedSections(website?.publishedSections);
  const accent = organization.primaryColor || "#2563eb";

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <StorefrontNav organizationId={organization.id} activeSlug="" />
      <main className="flex-1">
        {sections ? (
          <WebsiteSectionRenderer sections={sections} categories={categories} accentColor={accent} />
        ) : (
          <>
            <section className="px-4 py-16 text-center" style={{ backgroundColor: "color-mix(in srgb, " + accent + " 8%, white)" }}>
              <h1 className="mb-4 text-3xl font-bold">Party & Event Rentals from {organization.name}</h1>
              <p className="mx-auto mb-6 max-w-xl text-gray-600">Browse our rental categories and check availability for your event.</p>
              <Link href="/book" className="inline-block rounded px-6 py-3 font-medium text-white" style={{ backgroundColor: accent }}>Check Availability</Link>
            </section>
            <section className="mx-auto max-w-5xl px-4 py-12">
              <h2 className="mb-6 text-2xl font-bold">Browse Our Rentals</h2>
              {categories.length ? (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
                  {categories.map((category) => (
                    <Link key={category.id} href={"/rentals/" + category.slug} className="rounded border p-4 transition hover:shadow-md">
                      <div className="font-semibold">{category.name}</div>
                      {category.description && <p className="mt-1 text-sm text-gray-500">{category.description}</p>}
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">Rental categories will appear here when they are published.</p>
              )}
            </section>
          </>
        )}
      </main>
      <StorefrontFooter organizationId={organization.id} />
    </div>
  );
}
