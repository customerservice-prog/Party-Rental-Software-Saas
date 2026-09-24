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
    { label: "Campaigns", href: "/dashboard/message-templates" },
    { label: "Audiences", href: "/dashboard/customers" },
    { label: "Automations", href: "/dashboard/automations" },
    { label: "Performance", href: "/dashboard/analytics" },
    { label: "Settings", href: "/dashboard/settings" },
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
    <div className="friendly-admin-page">
      <div className="friendly-admin-head">
        <div>
          <h1>Marketing</h1>
          <p>{organization.name}&apos;s campaigns, audiences, and automations in one place.</p>
        </div>
        <div className="friendly-admin-actions">
          <Link href="/dashboard/message-templates" className="friendly-admin-primary">Campaigns</Link>
          <Link href="/dashboard/settings" className="friendly-admin-secondary">Settings</Link>
        </div>
      </div>

      <div className="friendly-admin-tabs">
        {TABS.map(tab=><Link key={tab.label} href={tab.href} className={"friendly-admin-tab "+(tab.active?"is-active":"")}>{tab.label}</Link>)}
      </div>

      <div className={"friendly-admin-card "+(organization.resendApiKey?"accent-green":"accent-blue")}>
        <div className="friendly-admin-card-title">{organization.resendApiKey?"Automation Mode: Live":"Automation Mode: Draft Only"}</div>
        <p className="text-xs leading-5 text-gray-600">{organization.resendApiKey?"Outbound email is connected. Messages sent from Messages and Campaigns can be delivered to real customers.":"Outbound marketing is disabled while messaging is not connected. No customer will receive an email or text from this page."}</p>
      </div>

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
  );
}
