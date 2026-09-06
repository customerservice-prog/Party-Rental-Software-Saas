import Link from "next/link";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Product Tour",
  description:
    "Walk through a full booking-to-delivery workflow using a fictional demo rental company.",
  path: "/demo",
});

const STEPS: { title: string; description: string }[] = [
  {
    title: "1. Customer books online",
    description:
      "A customer visits Demo Event Rentals’ storefront, picks an event date, and books a 20x30 tent, 8 round tables, and 60 chairs. Availability is checked against real inventory before the booking is accepted.",
  },
  {
    title: "2. The order is created automatically",
    description:
      "The booking becomes an order with a deposit calculated, the items reserved against inventory, and the event added to the shared calendar — no one has to re-type it anywhere.",
  },
  {
    title: "3. The warehouse gets a packing list",
    description:
      "As the event date approaches, staff print a packing list showing exactly what needs to be loaded for that order.",
  },
  {
    title: "4. A driver is assigned",
    description:
      "The order is added to a driver’s run for the day, alongside any other deliveries and pickups scheduled for the same date and area.",
  },
  {
    title: "5. Delivery and pickup are tracked",
    description:
      "The order status updates as it moves from scheduled to delivered to picked up, so staff always know where things stand without a phone call.",
  },
  {
    title: "6. Payment and balance are tracked",
    description:
      "The deposit and any remaining balance are tracked against the order, and roll up into the monthly payments view on the dashboard.",
  },
  {
    title: "7. The owner sees it all on the dashboard",
    description:
      "Recent orders, upcoming events, best-selling items, and collected-today totals are visible from a single dashboard — without reconstructing any of it by hand.",
  },
];

export default function DemoPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-20">
      <div className="max-w-2xl">
        <h1 className="text-4xl font-bold text-gray-900">Product Tour</h1>
        <p className="mt-4 text-gray-600">
          This walks through one order from booking to payment using a
          fictional rental company, “Demo Event Rentals.” No real
          customer or business data appears anywhere on this page.
        </p>
      </div>

      <div className="mt-14 space-y-8">
        {STEPS.map((step) => (
          <div key={step.title} className="border rounded-lg p-6">
            <h2 className="font-semibold text-gray-900">{step.title}</h2>
            <p className="mt-2 text-gray-600">{step.description}</p>
          </div>
        ))}
      </div>

      <div className="mt-16 bg-brand-50 border border-brand-100 rounded-xl p-8 text-center">
        <h2 className="text-2xl font-bold text-gray-900">
          Ready to see it with your own inventory?
        </h2>
        <p className="mt-2 text-gray-600">
          Create an account and set up your first category and item in a
          few minutes.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-4">
          <Link
            href="/signup"
            className="bg-brand-600 text-white px-6 py-3 rounded font-semibold hover:bg-brand-700"
          >
            Get Started
          </Link>
          <Link
            href="/features"
            className="border border-gray-300 bg-white px-6 py-3 rounded font-semibold text-gray-800 hover:border-brand-600 hover:text-brand-600"
          >
            See All Features
          </Link>
        </div>
      </div>
    </div>
  );
}
