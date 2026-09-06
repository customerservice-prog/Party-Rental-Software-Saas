import Link from "next/link";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Why Best-Seller Reports Beat a Gut Feeling",
  description:
    "How seeing recent orders, best-selling items, and an activity log in one place turns rental business decisions into something based on data, not memory.",
  path: "/resources/reports-and-analytics",
});

export default function ReportsAndAnalyticsArticle() {
  return (
    <article className="mx-auto max-w-3xl px-6 py-16">
      <Link href="/resources" className="text-sm font-medium text-orange-600">
        &larr; Back to Resources
      </Link>

      <h1 className="mt-6 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
        Why Best-Seller Reports Beat a Gut Feeling
      </h1>

      <div className="prose prose-gray mt-8 max-w-none text-gray-700">
        <p>
          Ask most rental business owners which items make them the most
          money, and they'll answer instantly with confidence, and often
          be wrong. Memory is shaped by what was booked recently or what
          broke last, not by what actually rented the most over time.
        </p>

        <h2>Recent orders and upcoming events at a glance</h2>
        <p>
          A dashboard that shows recent orders and upcoming events
          without anyone pulling a report answers the question "what's
          happening this week" the moment it's asked, instead of after
          someone reconstructs it from the calendar and a stack of
          tickets.
        </p>

        <h2>Best-selling items over time, not a guess</h2>
        <p>
          Seeing which items actually rented the most over the last 60
          days turns buying and repair decisions into something based
          on real numbers. An item that looks popular because it's
          visible in the warehouse isn't the same as an item that's
          actually booked every weekend.
        </p>

        <h2>An activity log for accountability</h2>
        <p>
          When a change to an order or a customer record is logged
          automatically, questions like "who canceled this" or "when
          was this moved" have an answer that doesn't depend on anyone
          remembering a conversation from two weeks ago.
        </p>

        <h2>Reports that exist without extra work</h2>
        <p>
          None of this requires someone to build a spreadsheet at month
          end. Because the data already lives in the orders and
          inventory system, the reports are just a different view of
          information that's already there.
        </p>

        <p>
          This is one piece of how the platform handles reporting. See
          the full breakdown on the{" "}
          <Link href="/features" className="text-orange-600">
            features page
          </Link>
          , or see how order and coupon data feeds into revenue
          decisions on the{" "}
          <Link href="/resources/deposits-and-coupons" className="text-orange-600">
            deposits and coupons article
          </Link>
          .
        </p>
      </div>
    </article>
  );
}
