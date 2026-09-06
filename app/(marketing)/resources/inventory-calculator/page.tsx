import Link from "next/link";
import { pageMetadata } from "@/lib/seo";
import InventoryCalculator from "./InventoryCalculator";

export const metadata = pageMetadata({
  title: "Party Size & Inventory Calculator",
  description:
    "A free tool that estimates how many tables, chairs, and linens a guest count typically needs before you build a quote.",
  path: "/resources/inventory-calculator",
});

export default function InventoryCalculatorPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <Link href="/resources" className="text-sm font-medium text-orange-600">
        &larr; Back to Resources
      </Link>

      <h1 className="mt-6 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
        Party Size &amp; Inventory Calculator
      </h1>
      <p className="mt-4 text-lg text-gray-600">
        Enter a guest count to get a starting estimate for tables, chairs,
        and linens. This is a general planning guide, not a quote, actual
        needs vary by seating style and event layout.
      </p>

      <div className="mt-10">
        <InventoryCalculator />
      </div>

      <div className="mt-16 rounded-lg border border-gray-200 bg-gray-50 p-8">
        <h2 className="text-xl font-semibold text-gray-900">
          Ready to take orders like this?
        </h2>
        <p className="mt-2 text-gray-600">
          See how order tracking, driver dispatch, and inventory management
          come together on the{" "}
          <Link href="/features" className="text-orange-600">
            features page
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
