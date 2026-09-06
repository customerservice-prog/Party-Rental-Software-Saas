import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Security",
  description:
    "How tenant data isolation, authentication, and account access work on the platform.",
  path: "/security",
});

export default function SecurityPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-20">
      <h1 className="text-4xl font-bold text-gray-900">Security</h1>
      <p className="mt-4 text-gray-600">
        We would rather explain plainly what is actually true about how this
        platform is built than list certifications we don’t hold. Here is
        the real architecture behind your account.
      </p>

      <div className="mt-12 space-y-10">
        <section>
          <h2 className="text-xl font-semibold text-gray-900">
            Tenant data isolation
          </h2>
          <p className="mt-2 text-gray-600">
            Every business that signs up is its own organization record.
            Every piece of business data — customers, orders, inventory,
            staff accounts, drivers, coupons, and more — is scoped to that
            organization at the database query level. One organization’s
            staff cannot see another organization’s data through the
            application.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900">
            Authentication
          </h2>
          <p className="mt-2 text-gray-600">
            Staff log in with a username and password scoped to their
            business. Passwords are hashed before storage — we do not
            store or ever display plain-text passwords. Repeated failed
            login attempts are throttled to slow down guessing attacks.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900">
            Roles & permissions
          </h2>
          <p className="mt-2 text-gray-600">
            Staff accounts are assigned roles (such as owner, staff, or
            driver) that control which parts of the dashboard they can see
            and act on. A platform administrator role exists separately for
            our own support and billing tools, and cannot see the contents
            of your customer data beyond what’s needed to support your
            account.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900">
            Infrastructure
          </h2>
          <p className="mt-2 text-gray-600">
            The application runs on managed hosting with a managed
            PostgreSQL database. We do not run our own physical servers.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900">
            What we don’t claim
          </h2>
          <p className="mt-2 text-gray-600">
            We are an early-stage platform. We do not currently hold SOC 2,
            PCI, or HIPAA certification, and we won’t claim an uptime
            guarantee we haven’t earned. If and when that changes, this
            page will be updated to reflect it — not before.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900">
            Questions
          </h2>
          <p className="mt-2 text-gray-600">
            If you have a specific security question before signing up,{" "}
            <a href="/contact" className="text-brand-600 hover:underline">
              contact us
            </a>{" "}
            and we’ll answer it directly.
          </p>
        </section>
      </div>
    </div>
  );
}
