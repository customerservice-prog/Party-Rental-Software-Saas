import { pageMetadata } from "@/lib/seo";
import Link from "next/link";

export const metadata = pageMetadata({
  title: "Why Task Lists and Message Templates Keep a Rental Team on the Same Page",
  description:
    "How a shared task list and reusable message templates cut down on the sticky notes, group texts, and repeated typing that slow down a rental business.",
  path: "/resources/task-management-and-communication",
});

export default function TaskManagementAndCommunicationPage() {
  return (
    <article className="mx-auto max-w-3xl px-6 py-16">
      <Link href="/resources" className="text-sm text-orange-600 hover:underline">
        ← Back to Resources
      </Link>
      <h1 className="mt-4 text-3xl font-bold text-gray-900">
        Why Task Lists and Message Templates Keep a Rental Team on the Same Page
      </h1>
      <p className="mt-6 text-gray-700">
        A rental business runs on a dozen small commitments a day: call a customer
        back about a delivery window, follow up on a damaged linen, confirm a
        Saturday setup time. None of these are complicated on their own, but they
        add up fast, and they're easy to lose track of when they live in someone's
        head or a pile of sticky notes.
      </p>
      <h2 className="mt-10 text-xl font-semibold text-gray-900">
        A running task list beats sticky notes and group texts
      </h2>
      <p className="mt-4 text-gray-700">
        Adding and completing tasks from the dashboard gives the whole team one place
        to see what still needs to happen, instead of everyone keeping their own
        mental list. Nothing gets forgotten just because the person who knew about it
        was out sick or busy loading a truck.
      </p>
      <h2 className="mt-10 text-xl font-semibold text-gray-900">
        Message templates and sent-message history save repetitive typing
      </h2>
      <p className="mt-4 text-gray-700">
        The same handful of messages get sent over and over: delivery reminders,
        balance-due notices, thank-you follow-ups. Message templates mean staff aren't
        retyping the same note every time, and a sent-message history means anyone on
        the team can check what a customer was already told without having to ask.
      </p>
      <h2 className="mt-10 text-xl font-semibold text-gray-900">
        Custom pages let you add your own storefront content
      </h2>
      <p className="mt-4 text-gray-700">
        Beyond day-to-day coordination, custom pages let a business add its own
        content to the storefront, such as policies or event guides, without waiting
        on anyone else to publish it.
      </p>
      <p className="mt-10 text-gray-700">
        See how this fits into the rest of the system on the{" "}
        <Link href="/features" className="text-orange-600 hover:underline">
          features page
        </Link>
        , or read how{" "}
        <Link href="/resources/staff-roles-and-permissions" className="text-orange-600 hover:underline">
          staff roles and permissions
        </Link>{" "}
        keep the right people doing the right things.
      </p>
    </article>
  );
}
