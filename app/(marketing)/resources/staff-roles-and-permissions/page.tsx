import Link from "next/link";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "How Staff Roles Keep a Rental Business Secure Without Slowing Anyone Down",
  description:
    "Why giving office staff, warehouse staff, and drivers their own logins and permissions matters more as a rental business grows.",
  path: "/resources/staff-roles-and-permissions",
});

export default function StaffRolesArticle() {
  return (
    <article className="mx-auto max-w-3xl px-6 py-16">
      <Link href="/resources" className="text-sm font-medium text-orange-600">
        &larr; Back to Resources
      </Link>

      <h1 className="mt-6 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
        How Staff Roles Keep a Rental Business Secure Without Slowing Anyone Down
      </h1>

      <div className="prose prose-gray mt-8 max-w-none text-gray-700">
        <p>
          A single shared login is easy to hand out and hard to walk
          back. Once several people, office staff, warehouse staff, and
          drivers, are all using the same account, there's no way to
          tell who changed an order or approved a refund, and no way to
          remove access from just one person without changing the
          password for everyone.
        </p>

        <h2>Separate roles for separate jobs</h2>
        <p>
          Owner, staff, and driver roles reflect how a rental business
          actually splits work. A driver needs to see today's run and
          mark deliveries complete. Office staff need orders,
          customers, and the calendar. Neither necessarily needs access
          to reports or account settings.
        </p>

        <h2>Sensitive areas stay restricted</h2>
        <p>
          Role-based access means reports, settings, and other
          sensitive areas are only visible to the roles that need them,
          instead of being one click away for anyone with the shared
          password.
        </p>

        <h2>Removing access doesn't mean resetting everyone's password</h2>
        <p>
          When someone leaves, their own login can be disabled on its
          own. Nobody else's access changes, and there's no scramble to
          text a new shared password to everyone still on staff.
        </p>

        <h2>Login security that slows down guessing, not your team</h2>
        <p>
          Repeated failed login attempts are throttled automatically, so
          a stolen or guessed password doesn't turn into an open door
          just because someone kept trying.
        </p>

        <p>
          This is one piece of how the platform handles access and
          security. See the full breakdown on the{" "}
          <Link href="/features" className="text-orange-600">
            features page
          </Link>
          , or see the underlying architecture on the{" "}
          <Link href="/security" className="text-orange-600">
            security page
          </Link>
          .
        </p>
      </div>
    </article>
  );
}
