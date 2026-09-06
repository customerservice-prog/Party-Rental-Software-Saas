import Link from "next/link";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Table, Chair & Linen Rental Software",
  description:
    "Run a table, chair, and linen rental business on one system: high-volume inventory tracking, an online storefront customers can book from directly, and reports on what's actually renting.",
});

export default function PartySupplySolutionPage() {
  return (
    <div>
      <section className="mx-auto max-w-4xl px-6 py-20">
        <p className="text-sm font-semibold uppercase tracking-wide text-orange-600">
          Tables, Chairs & Linen Rentals
        </p>
        <h1 className="mt-3 text-4xl font-bold text-gray-900 sm:text-5xl">
          Hundreds of small items, one place to know what's actually left
        </h1>
        <p className="mt-6 text-lg text-gray-600">
          Table, chair, and linen rentals run on volume — dozens of categories, hundreds
          of units, and customers who'd rather book online at 9pm than call during
          business hours.
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
          What actually matters for a high-volume party supply rental business
        </h2>
        <div className="mt-8 space-y-8">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              A storefront customers can book from themselves
            </h3>
            <p className="mt-2 text-gray-600">
              Customers browse categories, check real availability, and submit a booking
              without your office taking the request over the phone.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Availability that reflects what's actually booked
            </h3>
            <p className="mt-2 text-gray-600">
              Inventory updates as orders are placed, so you're not confirming the same
              120 chairs to two different events on the same day.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Know what's actually renting
            </h3>
            <p className="mt-2 text-gray-600">
              See best-selling items over the last 60 days, so buying and repair
              decisions are based on what's actually moving, not a guess.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Coupons and deposits applied automatically
            </h3>
            <p className="mt-2 text-gray-600">
              Discount codes and deposit rules are applied at booking, without a manual
              adjustment on every order.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl border-t border-gray-200 px-6 py-16">
        <h2 className="text-2xl font-bold text-gray-900">
          Also rent tents or inflatables?
        </h2>
        <p className="mt-4 text-gray-600">
          Categories and inventory are flexible, so tables and linens sit alongside
          anything else you rent in the same system.
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
