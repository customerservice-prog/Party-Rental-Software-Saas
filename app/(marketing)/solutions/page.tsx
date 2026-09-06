import Link from "next/link";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Solutions by Rental Type",
  description:
    "How Party Rental CRM fits bounce house and inflatable rentals, tent and event rentals, and table, chair, and linen rental businesses.",
  path: "/solutions",
});

const segments = [
  {
    slug: "bounce-house-rental",
    name: "Bounce House & Inflatable Rentals",
    summary:
      "Same-day delivery and pickup, and inventory that needs to come out of service the moment something is damaged.",
  },
  {
    slug: "tent-event-rental",
    name: "Tent & Event Rentals",
    summary:
      "Larger multi-item orders, setup dates that aren't the event date, and driver runs that need to be planned, not improvised.",
  },
  {
    slug: "party-supply-rental",
    name: "Tables, Chairs & Linen Rentals",
    summary:
      "High item counts across many small categories, customers who book online themselves, and knowing what's actually left to rent.",
  },
];

export default function SolutionsPage() {
  return (
    <div>
      <section className="mx-auto max-w-5xl px-6 py-20">
        <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl">
          One system, built around how different rental businesses actually operate
        </h1>
        <p className="mt-6 max-w-3xl text-lg text-gray-600">
          Party Rental CRM runs on the same core system for every account — booking, inventory,
          scheduling, delivery, and payments — because that operational chain is what
          every rental business shares. What differs is which parts matter most day to
          day, depending on what you rent.
        </p>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-20">
        <div className="grid gap-6 sm:grid-cols-3">
          {segments.map((s) => (
            <Link
              key={s.slug}
              href={`/solutions/${s.slug}`}
              className="block rounded-lg border border-gray-200 p-6 transition hover:border-orange-300 hover:shadow-sm"
            >
              <h2 className="text-lg font-semibold text-gray-900">{s.name}</h2>
              <p className="mt-3 text-sm text-gray-600">{s.summary}</p>
              <span className="mt-4 inline-block text-sm font-medium text-orange-600">
                See how it fits →
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl border-t border-gray-200 px-6 py-16">
        <h2 className="text-2xl font-bold text-gray-900">Not sure which fits?</h2>
        <p className="mt-4 max-w-2xl text-gray-600">
          Most rental businesses rent more than one type of item. Party Rental CRM doesn't
          require picking a category — every account can manage inflatables, tents,
          tables, chairs, linens, and anything else you rent side by side. See{" "}
          <Link href="/features" className="font-medium text-orange-600">
            everything it does
          </Link>{" "}
          or{" "}
          <Link href="/demo" className="font-medium text-orange-600">
            walk through the product tour
          </Link>
          .
        </p>
        <div className="mt-8">
          <Link
            href="/signup"
            className="inline-block rounded-md bg-orange-600 px-6 py-3 font-semibold text-white transition hover:bg-orange-700"
          >
            Get Started
          </Link>
        </div>
      </section>
    </div>
  );
}
