import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getCurrentOrganization } from "@/lib/tenant";
import { getBillingStatus } from "@/lib/billing";
import DashboardNav from "./DashboardNav";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }

  const organization = await getCurrentOrganization();
  if (!organization || (session.user as any).organizationId !== organization.id) {
    redirect("/login");
  }

  const billing = await getBillingStatus(organization.id);
  const role = (session.user as any).role;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="bg-indigo-600 text-white px-6 py-3 flex items-center justify-between gap-3 shadow relative z-40">
        <div className="flex items-center gap-3">
          <svg
            className="w-6 h-6"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 21l1.5-9h15L21 21" />
            <path d="M4.5 12l2-7h11l2 7" />
            <path d="M12 5V2" />
          </svg>
          <span className="font-semibold text-lg">{organization.name}</span>
        </div>
        <DashboardNav showSettings={role === "owner"} orgName={organization.name} />
      </header>
      {billing.message && role === "owner" && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-800 text-sm px-6 py-2">
          {billing.message}
        </div>
      )}
      {billing.trialDaysLeft !== null &&
        billing.trialDaysLeft <= 5 &&
        billing.trialDaysLeft >= 0 &&
        !billing.message &&
        role === "owner" && (
          <div className="bg-amber-50 border-b border-amber-200 text-amber-800 text-sm px-6 py-2">
            {billing.trialDaysLeft === 0
              ? "Your free trial ends today."
              : "Your free trial ends in " + billing.trialDaysLeft + " day(s)."}
          </div>
        )}
      <div className="flex-1 p-6 bg-gray-50">{children}</div>
    </div>
  );
}
