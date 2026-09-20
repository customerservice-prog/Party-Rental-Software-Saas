import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentOrganization } from "@/lib/tenant";
import { getBillingStatus } from "@/lib/billing";
import { runBookingAutomations } from "@/lib/automations";
import DashboardNav from "./DashboardNav";
import PlatformSupportBanner from "./PlatformSupportBanner";
import { getActivePlatformAnnouncements, getPlatformSetting } from "@/lib/platformControl";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }

  const organization = await getCurrentOrganization();
  const sessionRole = (session.user as any).role;
  const isPlatformSupport = sessionRole === "platform_admin";
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

  // Best-effort booking-lifecycle automation trigger (real booking
  // confirmations/reminders - see lib/automations.ts). There is no separate
  // cron worker deployed for this app, so this runs whenever any staff
  // member loads a dashboard page (rate-limited internally to once per
  // minute per organization). Wrapped in try/catch so a failure here can
  // never break the dashboard itself.
  try {
    await runBookingAutomations(organization.id);
  } catch (err) {
    console.error("runBookingAutomations failed:", err);
  }

  const [billing, platformAnnouncements, maintenanceEnabled, maintenanceMessage] = await Promise.all([
    getBillingStatus(organization),
    getActivePlatformAnnouncements(organization.id, organization.planTier).catch(() => []),
    getPlatformSetting<boolean>("maintenance_enabled", false).catch(() => false),
    getPlatformSetting<string>("maintenance_message", "").catch(() => ""),
  ]);
  const role = sessionRole;
  const userName = (session.user as any).name || (session.user as any).email || "User";

  return (
    <div className="min-h-screen">
      {isPlatformSupport && <PlatformSupportBanner tenantName={organization.name} />}
      <DashboardNav
        showSettings={role === "owner" || role === "platform_admin"}
        orgName={organization.name}
        userName={userName}
        role={role}
      />
      <div className="pt-20 flex flex-1 flex-col min-h-screen">
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
        <div className="flex-1 p-6 bg-gray-50">{children}</div>
      </div>
    </div>
  );
}
