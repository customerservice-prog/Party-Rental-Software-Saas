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

  const billing = await getBillingStatus(organization);
  const role = (session.user as any).role;
  const userName = (session.user as any).name || session.user.email || "User";

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardNav
        showSettings={role === "owner"}
        orgName={organization.name}
        userName={userName}
        role={role}
      />
      <div className="pt-20 flex flex-1 flex-col">
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
    </div>
  );
}
