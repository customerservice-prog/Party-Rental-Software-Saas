import Link from "next/link";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "How Tracking Payments and Balances Keeps a Rental Business Ahead of Cash Flow Surprises",
  description:
    "Why knowing the balance on every order, a collected-today total, and monthly payment trends matter more than a single revenue number.",
  path: "/resources/payments-and-balances",
});

export default function PaymentsAndBalancesPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-16">
      <Link href="/resources" className="text-sm text-orange-600 hover:underline">
        ← Back to Resources
      </Link>
      <h1 className="mt-4 text-3xl font-bold tracking-tight text-gray-900">
        How Tracking Payments and Balances Keeps a Rental Business Ahead of Cash Flow Surprises
      </h1>
      <div className="mt-8 space-y-6 text-gray-700">
        <p>
          A rental order rarely gets paid in one clean transaction. A customer puts down a
          deposit when they book, pays more when the contract is signed, and settles the rest
          closer to the event, or sometimes after it. Without a clear way to see what has
          actually been collected on each order, it is easy to lose track of who still owes
          money and how much is really coming in each month.
        </p>
        <h2 className="text-xl font-semibold text-gray-900">
          Knowing the balance on every order, not just the total
        </h2>
        <p>
          Tracking the amount paid against every order means anyone looking at a booking can
          see exactly what has been collected and what is still outstanding, instead of digging
          through a separate spreadsheet or asking whoever took the original payment.
        </p>
        <h2 className="text-xl font-semibold text-gray-900">
          A collected-today total keeps the front office in sync
        </h2>
        <p>
          A collected-today total on the dashboard gives the office a quick, shared answer to
          a question that comes up constantly: how much has actually come in today. It is a
          small thing, but it saves a lot of back-and-forth at the end of a shift.
        </p>
        <h2 className="text-xl font-semibold text-gray-900">
          Monthly payment trends turn scattered numbers into a pattern
        </h2>
        <p>
          Looking at monthly payments received over time makes it easier to notice slow months
          coming or busy seasons building, rather than reacting to cash flow only after it
          becomes a problem.
        </p>
        <p>
          See how this fits into the rest of the system on the{" "}
          <Link href="/features" className="text-orange-600 hover:underline">
            features page
          </Link>
          , or read how{" "}
          <Link href="/resources/reports-and-analytics" className="text-orange-600 hover:underline">
            best-seller reports
          </Link>{" "}
          turn day-to-day data into decisions.
        </p>
      </div>
    </article>
  );
}
