import { pageMetadata } from "@/lib/seo";
import Link from "next/link";

export const metadata = pageMetadata({
  title: "How Inventory Condition Tracking Prevents Bad Rental Days",
  description:
    "Why marking rental items by condition and status, not just counting them, keeps damaged or dirty equipment from ever reaching a customer's event.",
  path: "/resources/inventory-condition-tracking",
});

export default function InventoryConditionTrackingPage() {
  return (
    <article className="mx-auto max-w-3xl px-6 py-16">
      <Link href="/resources" className="text-sm text-orange-600 hover:underline">
        ← Back to Resources
      </Link>
      <h1 className="mt-4 text-3xl font-bold text-gray-900">
        How Inventory Condition Tracking Prevents Bad Rental Days
      </h1>
      <p className="mt-6 text-gray-700">
        A tent with a broken pole or a chocolate fountain that was never cleaned after
        the last event is worse than not having the item at all. It shows up at the
        customer's event, it doesn't work, and now it's your problem to fix in front
        of a hundred guests. The fix starts with treating condition as part of the
        inventory record, not a side note.
      </p>
      <h2 className="mt-10 text-xl font-semibold text-gray-900">
        Every item has a status, not just a count
      </h2>
      <p className="mt-4 text-gray-700">
        Knowing you own twelve cocktail tables is not the same as knowing eleven of
        them are rentable today. Item counts paired with a condition or status field
        mean the number available for booking reflects reality, not just what's sitting
        in the warehouse somewhere.
      </p>
      <h2 className="mt-10 text-xl font-semibold text-gray-900">
        Marking items do-not-rent removes them from bookings automatically
      </h2>
      <p className="mt-4 text-gray-700">
        When a piece of equipment comes back damaged, marking it do-not-rent takes it
        out of the available pool immediately. Nobody has to remember to tell the
        booking desk, and nothing gets sent out with a sticky note taped to it that
        says "don't use."
      </p>
      <h2 className="mt-10 text-xl font-semibold text-gray-900">
        Categories keep customers browsing what's actually available
      </h2>
      <p className="mt-4 text-gray-700">
        Because the storefront's availability is tied to the same inventory records,
        a customer browsing categories only ever sees items that are genuinely in
        rentable condition. There's no gap between what the website shows and what the
        warehouse can actually load onto a truck.
      </p>
      <p className="mt-10 text-gray-700">
        See how this fits into the rest of the system on the{" "}
        <Link href="/features" className="text-orange-600 hover:underline">
          features page
        </Link>
        , or read how{" "}
        <Link href="/resources/online-booking-availability" className="text-orange-600 hover:underline">
          real-time availability
        </Link>{" "}
        keeps bookings and inventory in sync.
      </p>
    </article>
  );
}
