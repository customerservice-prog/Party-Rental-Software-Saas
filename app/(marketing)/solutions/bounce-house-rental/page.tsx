import Link from "next/link";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Bounce House & Inflatable Rental Software",
  description:
    "Run a bounce house or inflatable rental business on one system: online booking, inventory that reflects real damage and downtime, order status tracking, and driver dispatch for same-day delivery and pickup.",
});

export default function BounceHouseSolutionPage() {
  return (
    <div>
      <section className="mx-auto max-w-4xl px-6 py-20">
        <p className="text-sm font-semibold uppercase tracking-wide text-orange-600">
          Bounce House & Inflatable Rentals
        </p>
        <h1 className="mt-3 text-4xl font-bold text-gray-900 sm:text-5xl">
          Built for a business that moves fast and can't afford a damaged unit going unnoticed
        </h1>
        <p className="mt-6 text-lg text-gray-600">
          Inflatable rentals move quickly: most orders are booked, delivered, and picked
          up within the same day or two, and a single torn unit can mean a scramble to
          find a substitute before a party starts. RentalOS is built around that pace.
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
          What actually matters for an inflatable rental business
        </h2>
        <div className="mt-8 space-y-8">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Order status tracked from booking through return
            </h3>
            <p className="mt-2 text-gray-600">
              Every order moves through status from booking to delivered to returned, so
              a same-day rental doesn't depend on someone remembering where it stands.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Units come out of service the moment they're damaged
            </h3>
            <p className="mt-2 text-gray-600">
              Mark an item do-not-rent as soon as it comes back torn or unsafe, so it
              can't be booked again by accident before it's repaired or replaced.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Same-day delivery and pickup, organized by driver
            </h3>
            <p className="mt-2 text-gray-600">
              Turn a Saturday's bookings into an organized driver run instead of a group
              text, with delivery and pickup tracked as part of the order itself.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Deposits applied automatically at booking
            </h3>
            <p className="mt-2 text-gray-600">
              Deposit rules apply automatically when a customer books, and every order
              shows exactly what's been paid and what's still owed.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl border-t border-gray-200 px-6 py-16">
        <h2 className="text-2xl font-bold text-gray-900">
          Also rent tables, chairs, or tents?
        </h2>
        <p className="mt-4 text-gray-600">
          Categories and inventory are flexible, so inflatables sit alongside anything
          else you rent in the same system.
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
