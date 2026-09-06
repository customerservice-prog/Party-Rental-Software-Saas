import Link from "next/link";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Pricing",
  description:
    "Simple, transparent pricing for party and event rental software. Currently in early access — see what's included and what happens at launch.",
  path: "/pricing",
});

const INCLUDED = [
  "Online booking storefront",
  "Inventory & category management",
  "Order & quote management",
  "Scheduling calendar",
  "Delivery & driver dispatch",
  "Payment & balance tracking",
  "Staff accounts & roles",
  "Reports & analytics",
  "Task management",
];

export default function PricingPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-20">
      <div className="text-center max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900">Pricing</h1>
        <p className="mt-4 text-gray-600">
          We are in an early access period while we finish building out
          billing. Here is exactly where things stand — no hidden fees,
          no surprise charges.
        </p>
      </div>

      <div className="mt-12 border rounded-xl p-8 max-w-lg mx-auto">
        <div className="text-sm font-semibold text-brand-600">EARLY ACCESS</div>
        <div className="mt-2 text-3xl font-bold text-gray-900">
          One plan, everything included
        </div>
        <p className="mt-3 text-gray-600">
          Every account currently includes the full feature set below. We
          have not finalized published subscription pricing yet. When we
          do, you will see the exact price before you are ever charged, and
          existing early access accounts will be notified in advance.
        </p>
        <ul className="mt-6 space-y-2 text-gray-700">
          {INCLUDED.map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span className="text-brand-600">✓</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <Link
          href="/signup"
          className="mt-8 block text-center bg-brand-600 text-white px-6 py-3 rounded font-semibold hover:bg-brand-700"
        >
          Get Started
        </Link>
        <p className="mt-3 text-center text-xs text-gray-500">
          No credit card required to create an account.
        </p>
      </div>

      <div className="mt-16 max-w-2xl mx-auto text-sm text-gray-600 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">
          What happens when paid plans launch?
        </h2>
        <p>
          We will publish specific plan tiers and pricing here, along with
          any limits on orders, staff seats, or locations tied to each tier.
          Nothing changes automatically or silently — you will always be
          asked to confirm before you are charged for the first time.
        </p>
        <h2 className="text-lg font-semibold text-gray-900">Can I cancel?</h2>
        <p>
          Yes. There is no long-term contract requirement planned for
          standard accounts.
        </p>
        <h2 className="text-lg font-semibold text-gray-900">
          Questions about pricing for a larger or multi-location business?
        </h2>
        <p>
          <Link href="/contact" className="text-brand-600 hover:underline">
            Contact us
          </Link>{" "}
          and we’ll talk through what you need.
        </p>
      </div>
    </div>
  );
}
