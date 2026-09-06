import Link from "next/link";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Features",
  description:
    "Everything included for running a party and event rental business: online booking, inventory, scheduling, delivery and dispatch, payments, staff roles, and reporting.",
  path: "/features",
});

const SECTIONS: {
  title: string;
  summary: string;
  points: string[];
}[] = [
  {
    title: "Online booking & storefront",
    summary:
      "Every account gets its own branded storefront so customers can browse categories, check availability, and submit a booking without calling your office.",
    points: [
      "Category and item browsing with photos and descriptions",
      "Availability reflects real inventory, not a static form",
      "Bookings create real orders — no separate inbox to check",
    ],
  },
  {
    title: "Inventory & categories",
    summary:
      "Every rental item lives in one system, organized into categories, so you always know what you actually have.",
    points: [
      "Track item counts and condition/status",
      "Organize items into customer-facing categories",
      "Mark items as do-not-rent when damaged or out of service",
    ],
  },
  {
    title: "Order & quote management",
    summary:
      "See every order’s items, delivery details, balance, and status from one screen.",
    points: [
      "Order status tracking from booking through return",
      "Coupons and deposit rules applied automatically",
      "Contracts attached to the order itself",
    ],
  },
  {
    title: "Scheduling & calendar",
    summary:
      "A shared calendar of every event date keeps your team looking at the same schedule.",
    points: [
      "Calendar view of upcoming events and deliveries",
      "Business hours and closed dates respected automatically",
      "Meetings and internal scheduling alongside customer orders",
    ],
  },
  {
    title: "Delivery & driver dispatch",
    summary:
      "Turn a day’s orders into an organized driver plan instead of a group text.",
    points: [
      "Assign delivery and pickup drivers per order",
      "Driver run stops organized by route",
      "Printable packing lists for the warehouse",
    ],
  },
  {
    title: "Payments & balances",
    summary:
      "Know what’s been collected and what’s still outstanding, order by order and month by month.",
    points: [
      "Amount paid tracked against every order",
      "Monthly payments received, visualized over time",
      "Collected-today totals on the dashboard",
    ],
  },
  {
    title: "Staff roles & permissions",
    summary:
      "Give staff and drivers their own logins instead of sharing one account.",
    points: [
      "Owner, staff, and driver roles",
      "Role-based access to sensitive areas like reports and settings",
      "Login security with lockout protection",
    ],
  },
  {
    title: "Reports & analytics",
    summary:
      "See how the business is actually doing without reconstructing it by hand.",
    points: [
      "Recent orders and upcoming events at a glance",
      "Best-selling items over the last 60 days",
      "Activity log for accountability",
    ],
  },
  {
    title: "Tasks & team coordination",
    summary:
      "A running list of what still needs to happen, visible to the whole team.",
    points: [
      "Add and complete tasks from the dashboard",
      "Message templates and sent-message history",
      "Custom pages for your own storefront content",
    ],
  },
];

export default function FeaturesPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-20">
      <div className="max-w-2xl">
        <h1 className="text-4xl font-bold text-gray-900">
          Everything a rental business needs to run, in one system
        </h1>
        <p className="mt-4 text-gray-600">
          Below is what’s actually included today. We’d rather show you
          real capability than a longer list of features that don’t exist
          yet.
        </p>
      </div>

      <div className="mt-14 space-y-12">
        {SECTIONS.map((section) => (
          <div key={section.title} className="border-t pt-8">
            <h2 className="text-xl font-bold text-gray-900">{section.title}</h2>
            <p className="mt-2 text-gray-600 max-w-2xl">{section.summary}</p>
            <ul className="mt-4 grid sm:grid-cols-2 gap-2 text-sm text-gray-700">
              {section.points.map((point) => (
                <li key={point} className="flex items-start gap-2">
                  <span className="text-brand-600">{"✓"}</span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mt-16 bg-brand-50 border border-brand-100 rounded-xl p-8 text-center">
        <h2 className="text-2xl font-bold text-gray-900">
          See it running with sample data
        </h2>
        <p className="mt-2 text-gray-600">
          Walk through a real booking-to-delivery workflow on a demo account.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-4">
          <Link
            href="/demo"
            className="bg-brand-600 text-white px-6 py-3 rounded font-semibold hover:bg-brand-700"
          >
            See Product Tour
          </Link>
          <Link
            href="/signup"
            className="border border-gray-300 bg-white px-6 py-3 rounded font-semibold text-gray-800 hover:border-brand-600 hover:text-brand-600"
          >
            Get Started
          </Link>
        </div>
      </div>
    </div>
  );
}
