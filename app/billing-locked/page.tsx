import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { requireCurrentOrganization } from "@/lib/tenant";
import { getBillingStatus } from "@/lib/billing";

// Full-page lock screen shown instead of the dashboard when an
// organization's billing status is blocked (trial ended, unpaid, canceled,
// past_due past its grace period, or suspended). See lib/billing.ts for the
// rules. This page intentionally lives outside app/dashboard so it never
// gets caught by the same billing gate it exists to display.

export default async function BillingLockedPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }

  const organization = await requireCurrentOrganization();
  const billing = await getBillingStatus(organization);

  if (!billing.blocked) {
    redirect("/dashboard");
  }

  const role = (session.user as { role?: string }).role;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white border rounded-lg shadow-sm p-8 text-center">
        <h1 className="text-xl font-bold text-gray-900 mb-2">{organization.name}</h1>
        <p className="text-sm font-medium text-red-600 mb-4">
          Dashboard access is currently locked
        </p>
        <p className="text-sm text-gray-600 mb-6">{billing.message}</p>
        {role === "owner" ? (
          <p className="text-xs text-gray-400">
            Payment processing isn&apos;t connected on this account yet. Contact
            support to update your plan and restore access.
          </p>
        ) : (
          <p className="text-xs text-gray-400">
            Please contact your account owner to resolve this.
          </p>
        )}
        <a
          href="/api/auth/signout"
          className="inline-block mt-6 text-sm font-medium text-indigo-600 hover:underline"
        >
          Sign out
        </a>
      </div>
    </div>
  );
}
