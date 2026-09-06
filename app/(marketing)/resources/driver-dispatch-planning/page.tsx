import Link from "next/link";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "How Driver Dispatch and Route Planning Works",
  description:
    "Why grouping deliveries into driver runs and giving drivers a simple checklist reduces the back-and-forth phone calls on event day.",
  path: "/resources/driver-dispatch-planning",
});

export default function DriverDispatchArticle() {
  return (
    <article className="mx-auto max-w-3xl px-6 py-16">
      <Link href="/resources" className="text-sm font-medium text-orange-600">
        &larr; Back to Resources
      </Link>

      <h1 className="mt-6 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
        How Driver Dispatch and Route Planning Works
      </h1>

      <div className="prose prose-gray mt-8 max-w-none text-gray-700">
        <p>
          On a busy Saturday, a rental business might have a dozen trucks
          worth of deliveries due before noon. Figuring out which driver
          takes which stops, and in what order, is normally done with a
          whiteboard and a lot of phone calls. That approach breaks down
          fast once the order count grows past what one dispatcher can
          hold in their head.
        </p>

        <h2>Group deliveries into driver runs</h2>
        <p>
          Orders due on the same day can be grouped into a run assigned to
          a specific driver and vehicle. Instead of a driver finding out
          about their stops one phone call at a time, they get a full run
          with every stop for the day in one place.
        </p>

        <h2>Give drivers a packing list, not just an address</h2>
        <p>
          Each stop on a run can carry its own packing list generated from
          the order, so a driver loading the truck at 6am can check off
          items against the list rather than trying to remember what a
          dispatcher told them the night before.
        </p>

        <h2>Keep the office and the truck in sync</h2>
        <p>
          When a delivery is marked complete from the field, the order's
          status updates immediately, so office staff answering a
          customer's call already know whether that delivery went out
          without needing to radio the driver to check.
        </p>

        <h2>Plan tomorrow's runs today</h2>
        <p>
          Because every order already carries a delivery date and
          address, building tomorrow's driver runs is a matter of
          reviewing what's already on the books rather than starting from
          a blank sheet of paper each evening.
        </p>

        <p>
          This is one piece of how the platform handles logistics. See
          the full breakdown on the{" "}
          <Link href="/features" className="text-orange-600">
            features page
          </Link>
          , or look at how it applies to tent and event rentals on the{" "}
          <Link
            href="/solutions/tent-event-rental"
            className="text-orange-600"
          >
            tent rental solutions page
          </Link>
          .
        </p>
      </div>
    </article>
  );
}
