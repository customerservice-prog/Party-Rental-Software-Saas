import Link from "next/link";
import type { Metadata } from "next";
import { pageMetadata, SITE_NAME } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "About",
  description:
    "Why " + SITE_NAME + " exists and who it is built for.",
  path: "/about",
});

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-20">
      <h1 className="text-4xl font-bold text-gray-900">About {SITE_NAME}</h1>

      <div className="mt-8 space-y-6 text-gray-600">
        <p>
          Rental businesses — bounce houses, tents, tables and chairs,
          linens, and everything else that shows up at a party or event —
          run on operations, not just bookings. A booking is the easy part.
          Knowing what’s actually in the warehouse, who’s driving what
          today, what’s been paid, and what still needs to happen before
          Saturday is the hard part.
        </p>
        <p>
          Most of the software built for this industry treats it like a
          generic scheduling or CRM problem. {SITE_NAME} is built around the
          actual operational chain a rental order goes through: booking,
          inventory, scheduling, delivery, driver dispatch, payment, and
          return — as one connected system instead of a booking widget
          bolted on top of whatever you were already using.
          </p>
        <p>
          We are early in building this out in the open. The{" "}
          <Link href="/features" className="text-brand-600 hover:underline">
            features
          </Link>{" "}
          page reflects exactly what’s built today, not a roadmap dressed
          up as a product. As we add capability, that page — and this
          one — will keep reflecting reality rather than getting ahead of
          it.
        </p>
        <p>
          If you run a rental business and want to see whether this fits
          how you actually work, the fastest way is to{" "}
          <Link href="/demo" className="text-brand-600 hover:underline">
            look at the product tour
          </Link>{" "}
          or{" "}
          <Link href="/signup" className="text-brand-600 hover:underline">
            create an account
          </Link>{" "}
          and try it directly.
        </p>
      </div>
    </div>
  );
}
