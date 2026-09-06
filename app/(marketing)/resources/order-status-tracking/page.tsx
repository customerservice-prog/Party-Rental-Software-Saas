import Link from "next/link";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "How Order Status Tracking Keeps a Rental Business Organized",
  description:
    "How moving rental orders through clear stages, from quote to return, cuts down on missed pickups and double-booked inventory.",
  path: "/resources/order-status-tracking",
});

export default function OrderStatusTrackingArticle() {
  return (
    <article className="mx-auto max-w-3xl px-6 py-16">
      <Link href="/resources" className="text-sm font-medium text-orange-600">
        &larr; Back to Resources
      </Link>

      <h1 className="mt-6 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
        How Order Status Tracking Keeps a Rental Business Organized
      </h1>

      <div className="prose prose-gray mt-8 max-w-none text-gray-700">
        <p>
          A tent, a stack of chairs, or a bounce house can only be in one
          place at a time. Once a rental business books more than a
          handful of events a week, keeping track of where every item is
          supposed to be, and whether it actually got there, becomes the
          hardest part of the job.
        </p>

        <h2>Give every order a clear stage</h2>
        <p>
          Instead of tracking orders in a spreadsheet or a stack of paper
          tickets, each order can move through a small set of stages:
          quote, reserved, packed, out for delivery, delivered, and
          returned. At any moment, staff can see exactly which stage an
          order is in without calling the warehouse or the driver.
        </p>

        <h2>Catch problems before the truck leaves</h2>
        <p>
          When an order sits in the "packed" stage, staff can check it
          against the original order before it goes on the truck, rather
          than discovering a missing table linen after the crew is already
          on site. A visible status also makes it obvious when an order
          has not moved forward and needs attention.
        </p>

        <h2>Flag accounts that need a closer look</h2>
        <p>
          Not every customer relationship works out. A do-not-rent flag on
          a customer record surfaces a warning the moment staff try to
          create a new order for that account, so a past issue with
          damaged equipment or a missed payment does not get repeated
          months later by someone who was not involved the first time.
        </p>

        <h2>Close the loop when equipment comes back</h2>
        <p>
          Marking an order as returned updates the availability of every
          item on it, which is what makes it possible to quote a
          same-day turnaround with confidence instead of guessing whether
          last weekend's tables are actually back in the warehouse yet.
        </p>

        <p>
          This is one piece of how the platform's order workflow is built.
          See the full breakdown on the{" "}
          <Link href="/features" className="text-orange-600">
            features page
          </Link>
          , or look at how it applies to a specific type of rental business
          on the{" "}
          <Link href="/solutions" className="text-orange-600">
            solutions page
          </Link>
          .
        </p>
      </div>
    </article>
  );
}
