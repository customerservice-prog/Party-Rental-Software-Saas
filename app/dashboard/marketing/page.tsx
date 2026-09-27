import { requireCurrentOrganization } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { requirePermission, AuthzError } from "@/lib/authz";
import Link from "next/link";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function MarketingPage() {
  const organization = await requireCurrentOrganization();

  try {
    await requirePermission(organization.id, "customers.message");
  } catch (err) {
    if (err instanceof AuthzError) {
      return (
        <div style={{ padding: 32, maxWidth: 640 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Marketing</h1>
          <p style={{ color: "#666" }}>
            You don't have permission to view marketing for this organization. Contact an account owner if you need access.
          </p>
        </div>
      );
    }
    throw err;
  }

  const [customers, restrictions, activeTemplateCount, queuedMessageCount, automatedMessageCount] = await Promise.all([
    prisma.customer.findMany({
      where: { organizationId: organization.id },
      select: {
        id: true,
        email: true,
        phone: true,
        orders: { select: { eventDate: true } },
      },
    }),
    prisma.doNotRentRestriction.findMany({
      where: { organizationId: organization.id, isActive: true },
      select: { email: true, phone: true },
    }),
    prisma.messageTemplate.count({
      where: { organizationId: organization.id, isActive: true },
    }),
    prisma.sentMessage.count({
      where: { organizationId: organization.id, status: "queued" },
    }),
    prisma.sentMessage.count({
      where: { organizationId: organization.id, automationType: { not: null } },
    }),
  ]);

  const restrictedEmails = new Set(
    restrictions.map((r) => (r.email || "").trim().toLowerCase()).filter(Boolean)
  );
  const restrictedPhones = new Set(
    restrictions.map((r) => (r.phone || "").trim()).filter(Boolean)
  );

  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;

  let eligible = 0;
  let excludedRestricted = 0;
  let excludedInvalidEmail = 0;
  let upcomingEventCustomers = 0;
  let dormant12Plus = 0;
  let annualRebookingWindow = 0;

  for (const c of customers) {
    const email = (c.email || "").trim().toLowerCase();
    const phone = (c.phone || "").trim();
    const isRestricted = (email && restrictedEmails.has(email)) || (phone && restrictedPhones.has(phone));
    const isInvalidEmail = !email || !EMAIL_RE.test(email);

    if (isRestricted) {
      excludedRestricted += 1;
      continue;
    }
    if (isInvalidEmail) {
      excludedInvalidEmail += 1;
      continue;
    }
    eligible += 1;

    const eventDates = c.orders.map((o) => o.eventDate.getTime());
    const hasFuture = eventDates.some((t) => t > now);
    if (hasFuture) upcomingEventCustomers += 1;

    if (eventDates.length > 0) {
      const latest = Math.max(...eventDates);
      const daysSince = (now - latest) / DAY;
      if (!hasFuture && daysSince >= 365) dormant12Plus += 1;
      if (!hasFuture && daysSince >= 270 && daysSince <= 456) annualRebookingWindow += 1;
    }
  }

  const totalCustomers = customers.length;
  const totalExcluded = excludedRestricted + excludedInvalidEmail;
  const monthName = new Date().toLocaleString("en-US", { month: "long" });

  const TABS = [
    { label: "Overview", href: "/dashboard/marketing", active: true },
    { label: "Automatic marketing", href: "/dashboard/automations" },
    { label: "Campaign library", href: "/dashboard/message-templates" },
    { label: "Audiences", href: "/dashboard/customers" },
    { label: "Performance", href: "/dashboard/analytics" },
    { label: "Send history", href: "/dashboard/messages" },
    { label: "Review queue", href: "/dashboard/automations/schedule" },
    { label: "Seasonal calendar", href: "/dashboard/scheduling" },
    { label: "Settings", href: "/dashboard/settings/business#email" },
  ];

  const sectionStyle = {
    border: "1px solid #e2e2e2",
    borderRadius: 8,
    padding: 20,
    marginBottom: 20,
    background: "#fff",
  } as const;
  const sectionLabelStyle = {
    fontSize: 12,
    fontWeight: 700,
    color: "#8a8a8a",
    letterSpacing: 0.5,
    textTransform: "uppercase" as const,
    marginBottom: 12,
  };
  const cardStyle = {
    border: "1px solid #ddd",
    borderRadius: 8,
    padding: 16,
    flex: "1 1 160px",
  } as const;
  const labelStyle = { fontSize: 13, color: "#666" } as const;
  const valueStyle = { fontSize: 24, fontWeight: 700 } as const;

  return (
    <div className="marketing-parity-page mx-auto max-w-7xl">
      <div className="px-4 pb-4 pt-6 sm:px-6">
        <h1 className="text-2xl font-bold tracking-tight text-gray-950">Marketing</h1>
        <p className="mt-1 text-sm text-gray-500">Bring customers back and see which campaigns lead to bookings.</p>
      </div>

      <nav aria-label="Marketing sections" className="marketing-parity-tabs">
        {TABS.map(tab=><Link key={tab.label} href={tab.href} aria-current={tab.active?"page":undefined} className={tab.active?"is-active":""}>{tab.label}</Link>)}
      </nav>

      <div className="p-4 sm:p-6">
        <section className="marketing-parity-hero">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="max-w-2xl">
              <span className="marketing-mode-badge"><span className={"h-2 w-2 rounded-full "+(organization.resendApiKey?"bg-green-300":"bg-amber-300")}/>{organization.resendApiKey?"Email sending connected":"Review mode · customer sending off"}</span>
              <h2 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">Keep your next season booked</h2>
              <p className="mt-3 text-sm leading-6 text-green-50">Seasonal reminders, repeat bookings and customer follow-ups using your real customer history. Review audiences and messaging before sending.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/dashboard/message-templates" className="marketing-hero-button">Campaign Library</Link>
              <Link href="/dashboard/settings/business#email" className="marketing-hero-button secondary">Settings</Link>
            </div>
          </div>
          <div className="marketing-hero-facts">
            <div><p>Usable contacts</p><strong>{eligible.toLocaleString()}</strong></div>
            <div><p>Queued messages</p><strong>{queuedMessageCount.toLocaleString()}</strong></div>
            <div><p>Sending status</p><strong>{organization.resendApiKey?"Connected":"Draft only"}</strong></div>
          </div>
        </section>

      <div className="friendly-admin-card">
        <div className="friendly-admin-card-title">Next Best Action</div>
        <h2 className="text-base font-bold text-gray-900">Grow {monthName} Bookings</h2>
        <p className="mt-1 text-xs text-gray-600">Reach eligible customers who do not have an upcoming event booked yet.</p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-gray-600">
          <li>{eligible} contacts are currently eligible to receive marketing.</li>
          <li>{dormant12Plus} contacts have not booked in 12+ months.</li>
          <li>{annualRebookingWindow} contacts are in their annual rebooking window.</li>
        </ul>
      </div>

      <div className="friendly-admin-card">
        <div className="friendly-admin-card-title">Needs Attention</div>
        <ul className="list-disc space-y-1 pl-5 text-xs text-gray-600">
          <li>{totalExcluded} contacts are excluded from marketing because of restrictions or invalid email.</li>
          <li>{upcomingEventCustomers} customers already have an upcoming event and are deprioritized for winback messaging.</li>
          <li>{queuedMessageCount} message{queuedMessageCount===1?" is":"s are"} currently queued.</li>
        </ul>
      </div>

      <div className="friendly-admin-kpis">
        <div className="friendly-admin-kpi"><small>Eligible Contacts</small><strong>{eligible}</strong></div>
        <div className="friendly-admin-kpi"><small>Dormant 12+ Months</small><strong>{dormant12Plus}</strong></div>
        <div className="friendly-admin-kpi"><small>Rebooking Window</small><strong>{annualRebookingWindow}</strong></div>
        <div className="friendly-admin-kpi"><small>Active Templates</small><strong>{activeTemplateCount}</strong></div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="friendly-admin-card !mb-0">
          <div className="friendly-admin-card-title">What Marketing Has Produced</div>
          <p className="text-xs leading-5 text-gray-600">{automatedMessageCount>0?automatedMessageCount+" automated booking confirmation/reminder message(s) have been sent so far.":"No marketing campaigns have been sent yet."}</p>
          <Link href="/dashboard/automations" className="mt-3 inline-block text-xs font-semibold text-[#1a6fd4]">Open automations →</Link>
        </div>
        <div className="friendly-admin-card !mb-0">
          <div className="friendly-admin-card-title">Why Contacts Are Excluded</div>
          <div className="grid grid-cols-2 gap-3"><div><small className="text-[9px] uppercase text-gray-500">Restricted</small><strong className="mt-1 block text-xl text-gray-900">{excludedRestricted}</strong></div><div><small className="text-[9px] uppercase text-gray-500">Invalid Email</small><strong className="mt-1 block text-xl text-gray-900">{excludedInvalidEmail}</strong></div></div>
        </div>
      </div>

      <p className="mt-4 text-[10px] text-gray-400">Total customers: {totalCustomers}. Duplicate email addresses are not deduplicated in these counts.</p>
      </div>
    </div>
  );
}
