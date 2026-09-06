import Link from "next/link";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Why One Shared Calendar Prevents Double-Booked Event Dates",
  description:
    "How a shared calendar of events, deliveries, and internal meetings keeps setup crews, office staff, and drivers from colliding on the same day.",
  path: "/resources/scheduling-and-calendar",
});

export default function SchedulingAndCalendarArticle() {
  return (
    <article className="mx-auto max-w-3xl px-6 py-16">
      <Link href="/resources" className="text-sm font-medium text-orange-600">
        &larr; Back to Resources
      </Link>

      <h1 className="mt-6 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
        Why One Shared Calendar Prevents Double-Booked Event Dates
      </h1>

      <div className="prose prose-gray mt-8 max-w-none text-gray-700">
        <p>
          A rental business often ends up running on two or three
          calendars at once: one for bookings, one someone keeps for
          drivers, and a mental one for internal meetings. The gaps
          between those calendars are exactly where a delivery gets
          double-booked with a staff meeting nobody flagged.
        </p>

        <h2>One calendar for every event date</h2>
        <p>
          When every booking automatically lands on the same calendar
          used for deliveries, pickups, and internal scheduling,
          there's a single place to look to know whether a date is
          actually open, instead of checking two systems and hoping
          they agree.
        </p>

        <h2>Business hours and closed dates respected automatically</h2>
        <p>
          A calendar that already knows the business is closed on a
          given date, or only operates certain hours, won't let a
          booking land somewhere it shouldn't in the first place,
          rather than relying on staff to catch it manually.
        </p>

        <h2>Room for internal scheduling too</h2>
        <p>
          Staff meetings and internal events can sit on the same shared
          calendar as customer orders, so a warehouse team meeting
          shows up as a real commitment next to Saturday's deliveries,
          not as a surprise conflict discovered the morning of.
        </p>

        <h2>Especially important for multi-item orders</h2>
        <p>
          A single tent order can involve a setup date, an event date,
          and a teardown date that are all different days. Seeing all
          three on the same calendar as everything else keeps a crew
          from being double-booked on a setup day that looks free on a
          calendar that only tracks event dates.
        </p>

        <p>
          This is one piece of how the platform handles scheduling. See
          the full breakdown on the{" "}
          <Link href="/features" className="text-orange-600">
            features page
          </Link>
          , or see how this applies to multi-item orders on the{" "}
          <Link href="/solutions/tent-event-rental" className="text-orange-600">
            tent &amp; event rental solutions page
          </Link>
          .
        </p>
      </div>
    </article>
  );
}
