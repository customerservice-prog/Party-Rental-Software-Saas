import Link from "next/link";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Tent & Event Rental Software",
  description:
    "Run a tent and event rental company on one system: multi-item quotes that become orders, a shared calendar for setup and teardown, organized driver runs, and packing lists for the warehouse.",
});

export default function TentEventSolutionPage() {
  return (
    <div>
      <section className="mx-auto max-w-4xl px-6 py-20">
        <p className="text-sm font-semibold uppercase tracking-wide text-orange-600">
          Tent & Event Rentals
        </p>
        <h1 className="mt-3 text-4xl font-bold text-gray-900 sm:text-5xl">
          One order can mean a tent, forty chairs, and a crew — tracked as one thing, not three
        </h1>
        <p className="mt-6 text-lg text-gray-600">
          Tent and event orders are rarely one item. They're a quote that becomes a
          multi-item order, a setup date that isn't the event date, and a teardown that
          has to happen before the next event can be scheduled in the same space.
        </p>
        <div className="mt-8 flex gap-4">
          <Link
            href="/signup"
            className="rounded-md bg-orange-600 px-6 py-3 font-semibold text-white transition hover:bg-orange-700"
          >
            Get Started
          </Link>
          <Link
            href="/demo"
            className="rounded-md border border-gray-300 px-6 py-3 font-semibold text-gray-700 transition hover:border-gray-400"
          >
            See Product Tour
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-4xl border-t border-gray-200 px-6 py-16">
        <h2 className="text-2xl font-bold text-gray-900">
          What actually matters for a tent & event rental business
        </h2>
        <div className="mt-8 space-y-8">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Quotes that become real orders
            </h3>
            <p className="mt-2 text-gray-600">
              A multi-item quote converts into an order without anyone re-typing the
              tent, tables, chairs, and linens into a second system.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              One calendar for every crew
            </h3>
            <p className="mt-2 text-gray-600">
              Business hours and closed dates are respected automatically, so setup
              crews, office staff, and drivers are all looking at the same shared
              schedule.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Driver runs organized by route
            </h3>
            <p className="mt-2 text-gray-600">
              Assign delivery and pickup drivers per order, with stops organized by route
              instead of figured out on the fly the morning of an event.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Printable packing lists for the warehouse
            </h3>
            <p className="mt-2 text-gray-600">
              Know exactly what needs to be loaded for a large order before the truck
              leaves, instead of counting chairs in the parking lot.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl border-t border-gray-200 px-6 py-16">
        <h2 className="text-2xl font-bold text-gray-900">
          Also rent inflatables or small party goods?
        </h2>
        <p className="mt-4 text-gray-600">
          Categories and inventory are flexible, so tents sit alongside anything else you
          rent in the same system.
        </p>
        <p className="mt-4">
          <Link href="/features" className="font-medium text-orange-600">
            See everything it does →
          </Link>
        </p>
      </section>
    </div>
  );
}
