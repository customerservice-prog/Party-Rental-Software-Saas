import Link from "next/link";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Why Real-Time Availability Matters for Online Bookings",
  description:
    "How showing customers real inventory availability, instead of a static booking form, prevents double-booked equipment and phone-tag.",
  path: "/resources/online-booking-availability",
});

export default function OnlineBookingAvailabilityArticle() {
  return (
    <article className="mx-auto max-w-3xl px-6 py-16">
      <Link href="/resources" className="text-sm font-medium text-orange-600">
        &larr; Back to Resources
      </Link>

      <h1 className="mt-6 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
        Why Real-Time Availability Matters for Online Bookings
      </h1>

      <div className="prose prose-gray mt-8 max-w-none text-gray-700">
        <p>
          A booking form that just collects a request looks the same to a
          customer whether you have twenty tables free or none. The
          difference only shows up later, in a phone call telling them
          the date they already booked doesn't actually work.
        </p>

        <h2>Availability tied to real inventory</h2>
        <p>
          When a storefront checks a customer's requested date and items
          against actual inventory counts, rather than a fixed calendar
          of open slots, the booking that gets submitted is already a
          booking you can honor. Items that are already reserved for
          that date simply aren't offered.
        </p>

        <h2>Bookings become orders automatically</h2>
        <p>
          A booking that has to be manually re-entered into an order
          system is a second chance for a typo or a missed item. When a
          submitted booking becomes an order on its own, with the
          requested items, date, and customer details already attached,
          nothing depends on someone retyping it correctly the same day.
        </p>

        <h2>Photos and categories reduce back-and-forth</h2>
        <p>
          Customers browsing categories with real photos and
          descriptions can compare options and pick what they actually
          want before booking, instead of calling to ask what a "10x20
          frame tent" looks like partway through placing an order.
        </p>

        <h2>Fewer calls during business hours, not more</h2>
        <p>
          A storefront that can accept a complete, accurate booking at
          9pm on a Sunday takes that booking off your office's plate
          entirely, rather than generating a voicemail that still needs
          to be called back and manually entered on Monday.
        </p>

        <p>
          This is one piece of how the platform handles booking and
          inventory. See the full breakdown on the{" "}
          <Link href="/features" className="text-orange-600">
            features page
          </Link>
          , or see how it applies to high-volume bookings on the{" "}
          <Link href="/solutions/party-supply-rental" className="text-orange-600">
            table, chair &amp; linen rental solutions page
          </Link>
          .
        </p>
      </div>
    </article>
  );
}
