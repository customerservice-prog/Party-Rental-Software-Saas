import Link from "next/link";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Resources for Party & Event Rental Businesses",
  description:
    "Practical guides on running a party and event rental business, from tracking orders to dispatching drivers and protecting revenue with deposits.",
  path: "/resources",
});

const articles = [
  {
    title: "How Order Status Tracking Keeps a Rental Business Organized",
    description:
      "A look at how moving orders through clear stages, from quote to return, cuts down on missed pickups and double-booked inventory.",
    href: "/resources/order-status-tracking",
  },
  {
    title: "How Driver Dispatch and Route Planning Works",
    description:
      "Why grouping deliveries into driver runs and giving drivers a simple checklist reduces the back-and-forth phone calls on event day.",
    href: "/resources/driver-dispatch-planning",
  },
  {
    title: "How Deposits and Coupons Protect Rental Revenue",
    description:
      "The case for collecting a deposit up front and using coupon codes deliberately, rather than discounting every order that asks.",
    href: "/resources/deposits-and-coupons",
  },
  {
    title: "Why Real-Time Availability Matters for Online Bookings",
    description:
      "How showing customers real inventory availability, instead of a static booking form, prevents double-booked equipment and phone-tag.",
    href: "/resources/online-booking-availability",
  },
  {
    title: "How Staff Roles Keep a Rental Business Secure Without Slowing Anyone Down",
    description:
      "Why giving office staff, warehouse staff, and drivers their own logins and permissions matters more as a rental business grows.",
    href: "/resources/staff-roles-and-permissions",
  },
  {
    title: "Why Best-Seller Reports Beat a Gut Feeling",
    description:
      "How seeing recent orders, best-selling items, and an activity log in one place turns rental business decisions into something based on data, not memory.",
    href: "/resources/reports-and-analytics",
  },
  {
    title: "Why One Shared Calendar Prevents Double-Booked Event Dates",
    description:
      "How a shared calendar of events, deliveries, and internal meetings keeps setup crews, office staff, and drivers from colliding on the same day.",
    href: "/resources/scheduling-and-calendar",
  },
];

export default function ResourcesPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
          Resources
        </h1>
        <p className="mt-4 text-lg text-gray-600">
          Practical guides for people who run party and event rental
          businesses, written from the day-to-day mechanics of taking
          orders, dispatching trucks, and getting paid.
        </p>
      </div>

      <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {articles.map((article) => (
          <Link
            key={article.href}
            href={article.href}
            className="flex flex-col rounded-lg border border-gray-200 p-6 transition hover:border-orange-300 hover:shadow-sm"
          >
            <h2 className="text-lg font-semibold text-gray-900">
              {article.title}
            </h2>
            <p className="mt-2 flex-1 text-sm text-gray-600">
              {article.description}
            </p>
            <span className="mt-4 text-sm font-medium text-orange-600">
              Read more &rarr;
            </span>
          </Link>
        ))}
      </div>

      <div className="mt-16 rounded-lg border border-gray-200 bg-gray-50 p-8">
        <h2 className="text-xl font-semibold text-gray-900">
          Free tool: Party Size &amp; Inventory Calculator
        </h2>
        <p className="mt-2 text-gray-600">
          Estimate how many tables, chairs, and linens a guest count
          typically needs before you build a quote.
        </p>
        <Link
          href="/resources/inventory-calculator"
          className="mt-4 inline-block text-sm font-medium text-orange-600"
        >
          Try the calculator &rarr;
        </Link>
      </div>
    </div>
  );
}
