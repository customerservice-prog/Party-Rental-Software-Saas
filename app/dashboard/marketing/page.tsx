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

  const [customers, restrictions, activeTemplateCount, queuedMessageCount] = await Promise.all([
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
    { label: "Automations", href: "/dashboard/messages" },
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
    <div style={{ padding: 20, maxWidth: 1000 }}>
      <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 4 }}>Marketing</h1>
      <p style={{ color: "#666", marginBottom: 16 }}>
        {organization.name}'s marketing operating system - campaigns, audiences, and automations in one place.
      </p>

      <div style={{ display: "flex", gap: 24, borderBottom: "1px solid #e2e2e2", marginBottom: 20 }}>
        {TABS.map((tab) => (
          <Link
            key={tab.label}
            href={tab.href}
            style={{
              paddingBottom: 10,
              fontWeight: 600,
              fontSize: 14,
              color: tab.active ? "#4f46e5" : "#555",
              borderBottom: tab.active ? "2px solid #4f46e5" : "2px solid transparent",
              textDecoration: "none",
            }}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <div style={{ border: "1px solid #cfe0fb", background: "#eef4ff", borderRadius: 8, padding: 16, marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#3454b4", letterSpacing: 0.5, marginBottom: 6 }}>
            AUTOMATION MODE: DRAFT ONLY
          </div>
          <div style={{ color: "#444", fontSize: 14 }}>
            Outbound marketing is disabled while messaging is not yet connected. No customer will receive an email or text from this page.
          </div>
        </div>
        <Link href="/dashboard/settings" style={{ fontSize: 13, color: "#4f46e5", whiteSpace: "nowrap" }}>
          Settings
        </Link>
      </div>

      <div style={sectionStyle}>
        <div style={sectionLabelStyle}>Next Best Action</div>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Grow {monthName} Bookings</div>
        <p style={{ color: "#555", fontSize: 14, marginBottom: 10 }}>
          Reach eligible customers who don't have an upcoming event booked yet.
        </p>
        <ul style={{ margin: 0, paddingLeft: 18, color: "#555", fontSize: 14 }}>
          <li>{eligible} contacts are currently eligible to receive marketing.</li>
          <li>{dormant12Plus} contacts haven't booked in 12+ months.</li>
          <li>{annualRebookingWindow} contacts are in their annual rebooking window.</li>
        </ul>
      </div>

      <div style={sectionStyle}>
        <div style={sectionLabelStyle}>Needs Attention</div>
        <ul style={{ margin: 0, paddingLeft: 18, color: "#555", fontSize: 14, display: "flex", flexDirection: "column", gap: 6 }}>
          <li>Outbound sending is currently disabled while messaging is being connected - this is expected.</li>
          <li>{totalExcluded} contacts are currently excluded from marketing (restricted or invalid email).</li>
          <li>{upcomingEventCustomers} customers have an upcoming event and are automatically deprioritized for winback-style messaging.</li>
        </ul>
      </div>

      <div style={sectionStyle}>
        <div style={sectionLabelStyle}>What Marketing Has Produced</div>
        <p style={{ color: "#555", fontSize: 14, margin: 0 }}>
          No marketing campaigns have been sent yet. Once outbound sending is enabled and campaigns go out, bookings and revenue attributed to them will appear here.
        </p>
      </div>

      <div style={sectionStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={sectionLabelStyle}>Current Numbers</div>
          <Link href="/dashboard/customers" style={{ fontSize: 13, color: "#4f46e5" }}>
            View Customers &rarr;
          </Link>
        </div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <div>
            <div style={valueStyle}>{eligible}</div>
            <div style={labelStyle}>Eligible Contacts</div>
          </div>
          <div>
            <div style={valueStyle}>{dormant12Plus}</div>
            <div style={labelStyle}>Dormant 12+ Months</div>
          </div>
          <div>
            <div style={valueStyle}>{annualRebookingWindow}</div>
            <div style={labelStyle}>Annual Rebooking Window</div>
          </div>
          <div>
            <div style={valueStyle}>{activeTemplateCount}</div>
            <div style={labelStyle}>Active Message Templates</div>
          </div>
        </div>
      </div>

      <div style={sectionStyle}>
        <div style={sectionLabelStyle}>Why Contacts Are Excluded</div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <div style={cardStyle}>
            <div style={labelStyle}>Do Not Rent / Restricted</div>
            <div style={valueStyle}>{excludedRestricted}</div>
          </div>
          <div style={cardStyle}>
            <div style={labelStyle}>Missing or Invalid Email</div>
            <div style={valueStyle}>{excludedInvalidEmail}</div>
          </div>
        </div>
      </div>

      <div style={sectionStyle}>
        <div style={sectionLabelStyle}>Campaign Drafts</div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <div style={cardStyle}>
            <div style={labelStyle}>Active Message Templates</div>
            <div style={valueStyle}>{activeTemplateCount}</div>
            <Link href="/dashboard/message-templates" style={{ fontSize: 12, color: "#4f46e5" }}>
              Manage templates &rarr;
            </Link>
          </div>
          <div style={cardStyle}>
            <div style={labelStyle}>Queued Messages</div>
            <div style={valueStyle}>{queuedMessageCount}</div>
            <Link href="/dashboard/messages" style={{ fontSize: 12, color: "#4f46e5" }}>
              View messages &rarr;
            </Link>
          </div>
        </div>
        <p style={{ fontSize: 12, color: "#999", marginTop: 12 }}>
          Outbound sending is not yet enabled. Messages are saved as drafts and queued until an email/SMS provider is connected.
        </p>
      </div>

      <p style={{ fontSize: 12, color: "#999" }}>
        Total customers: {totalCustomers}. Two customer records with the same email are not deduplicated in these counts.
      </p>
    </div>
  );
}
