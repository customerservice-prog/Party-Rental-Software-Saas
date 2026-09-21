import "./tenant.css";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentOrganization } from "@/lib/tenant";
import { getBillingStatus } from "@/lib/billing";
import { runBookingAutomations } from "@/lib/automations";
import DashboardNav from "./DashboardNav";
import InventoryTableLayout from "./InventoryTableLayout";
import PlatformSupportBanner from "./PlatformSupportBanner";
import { getActivePlatformAnnouncements, getPlatformSetting } from "@/lib/platformControl";
import { resolveTenantViewer } from "@/lib/tenantViewer";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }

  const organization = await getCurrentOrganization();
  const sessionRole = (session.user as any).role;
  if ((session.user as any).revoked || sessionRole === "revoked") redirect("/login");
  const isPlatformSupport = sessionRole === "platform_admin";
  const viewer = isPlatformSupport ? await resolveTenantViewer(session.user as any) : null;
  if (isPlatformSupport && !viewer) redirect("/admin/organizations");
  if (!isPlatformSupport) {
    const currentUser = await prisma.user.findUnique({
      where: { id: (session.user as any).id },
      select: { forcePasswordReset: true, isActive: true },
    });
    if (!currentUser?.isActive) redirect("/login");
    if (currentUser.forcePasswordReset) redirect("/change-password");
  }
  if (!organization || (!isPlatformSupport && (session.user as any).organizationId !== organization.id)) {
    redirect(isPlatformSupport ? "/admin" : "/login");
  }

  const supportBanner = viewer?.support ? <PlatformSupportBanner tenantName={organization.name} userName={viewer.name} role={viewer.role} organizationId={organization.id} expiresAt={viewer.support.expiresAt} /> : null;
  if (viewer && (viewer.forcePasswordReset || organization.status === "suspended")) {
    return <div className="min-h-screen bg-slate-50">{supportBanner}<main className="mx-auto max-w-lg p-8">
      <h1 className="text-2xl font-black">{viewer.forcePasswordReset ? "Choose a new password" : "Account suspended"}</h1>
      <p className="mt-3 text-sm text-slate-600">{viewer.forcePasswordReset ? "This user must replace their temporary password before they can enter the dashboard." : "This tenant cannot currently sign in because the organization is suspended."}</p>
      <a href={"/admin/organizations/"+organization.id+"/support"} className="mt-5 inline-block font-bold text-blue-600">Return to support workspace →</a>
    </main></div>;
  }

  // Best-effort booking-lifecycle automation trigger (real booking
  // confirmations/reminders - see lib/automations.ts). There is no separate
  // cron worker deployed for this app, so this runs whenever any staff
  // member loads a dashboard page (rate-limited internally to once per
  // minute per organization). Wrapped in try/catch so a failure here can
  // never break the dashboard itself.
  try {
    if (!isPlatformSupport) await runBookingAutomations(organization.id);
  } catch (err) {
    console.error("runBookingAutomations failed:", err);
  }

  const [billing, platformAnnouncements, maintenanceEnabled, maintenanceMessage] = await Promise.all([
    getBillingStatus(organization),
    getActivePlatformAnnouncements(organization.id, organization.planTier).catch(() => []),
    getPlatformSetting<boolean>("maintenance_enabled", false).catch(() => false),
    getPlatformSetting<string>("maintenance_message", "").catch(() => ""),
  ]);
  const role = viewer?.role ?? sessionRole;
  const userName = viewer?.name || (session.user as any).name || (session.user as any).email || "User";

  return (
      <DashboardNav
        showSettings={role === "owner"}
        orgName={organization.name}
        userName={userName}
        role={role}
        supportBanner={supportBanner}
      >
      <InventoryTableLayout/>
      <div className="space-y-4">
        {maintenanceEnabled && (
          <div className="border-b border-amber-300 bg-amber-100 px-6 py-3 text-sm font-semibold text-amber-950">
            <b>Platform maintenance</b>{maintenanceMessage ? <span className="ml-2">{maintenanceMessage}</span> : <span className="ml-2">Some features may be temporarily unavailable.</span>}
          </div>
        )}
        {platformAnnouncements.map((announcement) => (
          <div key={announcement.id} className={
            "border-b px-6 py-3 text-sm " +
            (announcement.tone === "danger" ? "border-rose-200 bg-rose-50 text-rose-800" :
             announcement.tone === "warning" ? "border-amber-200 bg-amber-50 text-amber-800" :
             announcement.tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" :
             "border-blue-200 bg-blue-50 text-blue-800")
          }>
            <b>{announcement.title}</b>{announcement.body ? <span className="ml-2">{announcement.body}</span> : null}
          </div>
        ))}
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
        <div>{children}</div>
      </div>
    </DashboardNav>
  );
}
