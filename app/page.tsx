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
  try { return validateSections(JSON.parse(value)); } catch { return null; }
}

export async function generateMetadata(): Promise<Metadata> {
  const organization = await getOrganizationFromHost().catch(() => null);
  if (!organization) {
    const title = "Party Rental Software for Bookings, Inventory & Delivery | Party Rental CRM";
    return {
      ...pageMetadata({ title, description: "Party rental software with an included rental website, online booking, real-time inventory, deposits, contracts, customer CRM, delivery and pickup tools for party and event rental businesses.", path: "/" }),
      title: { absolute: title },
      keywords: ["party rental software","event rental software","party rental booking software","bounce house rental software","tent rental software","party rental inventory software","party rental website","rental management software","event rental booking system"],
      openGraph: { title, description: "Run your party rental business from one place: website, online bookings, inventory, payments, customers and delivery workflow.", type: "website" },
    };
  }

  const website = await prisma.website.findUnique({ where: { organizationId: organization.id }, select: { publishedSections: true } });
  const sections = parsePublishedSections(website?.publishedSections);
  const hero = sections?.find((section) => section.type === "hero" && section.visible);
  const heroHeading = hero?.config.heading?.trim() || "";
  const heroSubheading = hero?.config.subheading?.trim() || "";
  const title = organization.seoTitle?.trim() || heroHeading || organization.name + " — Book Your Event Rentals Online";
  const description = organization.seoDescription?.trim() || heroSubheading || "Browse rental categories and book your next event online with " + organization.name + ".";
  return { ...pageMetadata({ title, description, path: organization.slug ? "/t/" + organization.slug : "/", noIndex: !sections }), title: { absolute: title } };
}

export default async function RootPage() {
  const organization = await getOrganizationFromHost();
  if (!organization) {
    const softwareSchema = { "@context":"https://schema.org", "@type":"SoftwareApplication", name:"Party Rental CRM", applicationCategory:"BusinessApplication", operatingSystem:"Web", description:"Party rental management software for online bookings, inventory, payments, customers, contracts and delivery operations.", offers:{"@type":"Offer", price:"49", priceCurrency:"USD"} };
    const faqSchema = { "@context":"https://schema.org", "@type":"FAQPage", mainEntity:[
      {"@type":"Question",name:"What is party rental software?",acceptedAnswer:{"@type":"Answer",text:"Party rental software helps event rental companies manage online bookings, inventory availability, customers, payments, contracts, delivery and pickup work from one connected system."}},
      {"@type":"Question",name:"Does Party Rental CRM include a rental website?",acceptedAnswer:{"@type":"Answer",text:"Yes. Party Rental CRM includes a customer-facing rental catalog and booking flow connected to the same rental data used by the business."}},
      {"@type":"Question",name:"Can party rental software help prevent double bookings?",acceptedAnswer:{"@type":"Answer",text:"Availability can be tied to rental quantities and event dates so already-committed inventory is surfaced before another reservation is accepted."}}
    ]};
    return <div className="flex min-h-screen flex-col"><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(softwareSchema)}}/><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(faqSchema)}}/><MarketingHeader/><main className="flex-1"><MarketingHomePage/></main><MarketingFooter/></div>;
  }

  const [categories, website] = await Promise.all([
    prisma.category.findMany({ where: { organizationId: organization.id, displayToCustomer: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    prisma.website.findUnique({ where: { organizationId: organization.id }, select: { publishedSections: true } }),
  ]);
  const sections = parsePublishedSections(website?.publishedSections);
  const accent = organization.primaryColor || "#2563eb";
  return <div className="flex min-h-screen flex-col bg-white"><StorefrontNav organizationId={organization.id} activeSlug=""/><main className="flex-1">{sections ? <WebsiteSectionRenderer sections={sections} categories={categories} accentColor={accent}/> : <><section className="px-4 py-16 text-center" style={{backgroundColor:"color-mix(in srgb, "+accent+" 8%, white)"}}><h1 className="mb-4 text-3xl font-bold">Party & Event Rentals from {organization.name}</h1><p className="mx-auto mb-6 max-w-xl text-gray-600">Browse our rental categories and check availability for your event.</p><Link href="/book" className="inline-block rounded px-6 py-3 font-medium text-white" style={{backgroundColor:accent}}>Check Availability</Link></section><section className="mx-auto max-w-5xl px-4 py-12"><h2 className="mb-6 text-2xl font-bold">Browse Our Rentals</h2>{categories.length ? <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">{categories.map(category=><Link key={category.id} href={"/rentals/"+category.slug} className="rounded border p-4 transition hover:shadow-md"><div className="font-semibold">{category.name}</div>{category.description&&<p className="mt-1 text-sm text-gray-500">{category.description}</p>}</Link>)}</div>:<p className="text-gray-500">Rental categories will appear here when they are published.</p>}</section></>}</main><StorefrontFooter organizationId={organization.id}/></div>;
}
