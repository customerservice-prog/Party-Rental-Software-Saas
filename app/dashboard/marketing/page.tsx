import { requireCurrentOrganization } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { requirePermission, AuthzError } from "@/lib/authz";

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

  const cardStyle = {
    border: "1px solid #ddd",
    borderRadius: 8,
    padding: 16,
    flex: "1 1 160px",
  } as const;
  const labelStyle = { fontSize: 13, color: "#666" } as const;
  const valueStyle = { fontSize: 24, fontWeight: 700 } as const;

  return (
    <div style={{ padding: 20 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Marketing</h1>
      <p style={{ color: "#666", marginBottom: 20 }}>
        Audience insights computed live from your customer and order data.
      </p>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 12 }}>
        <div style={cardStyle}>
          <div style={labelStyle}>Total Customers</div>
          <div style={valueStyle}>{totalCustomers}</div>
        </div>
        <div style={cardStyle}>
          <div style={labelStyle}>Eligible Contacts</div>
          <div style={valueStyle}>{eligible}</div>
        </div>
        <div style={cardStyle}>
          <div style={labelStyle}>Excluded</div>
          <div style={valueStyle}>{totalExcluded}</div>
        </div>
        <div style={cardStyle}>
          <div style={labelStyle}>Upcoming Event Customers</div>
          <div style={valueStyle}>{upcomingEventCustomers}</div>
        </div>
        <div style={cardStyle}>
          <div style={labelStyle}>Dormant 12+ Months</div>
          <div style={valueStyle}>{dormant12Plus}</div>
        </div>
        <div style={cardStyle}>
          <div style={labelStyle}>Annual Rebooking Window</div>
          <div style={valueStyle}>{annualRebookingWindow}</div>
        </div>
      </div>
      <p style={{ fontSize: 12, color: "#999", marginBottom: 30 }}>
        Two customer records with the same email are not deduplicated in this count. Numbers are computed fresh on every page load.
      </p>

      <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Why Contacts Are Excluded</h2>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 30 }}>
        <div style={cardStyle}>
          <div style={labelStyle}>Do Not Rent / Restricted</div>
          <div style={valueStyle}>{excludedRestricted}</div>
        </div>
        <div style={cardStyle}>
          <div style={labelStyle}>Missing or Invalid Email</div>
          <div style={valueStyle}>{excludedInvalidEmail}</div>
        </div>
      </div>

      <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Campaign Drafts</h2>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 12 }}>
        <div style={cardStyle}>
          <div style={labelStyle}>Active Message Templates</div>
          <div style={valueStyle}>{activeTemplateCount}</div>
          <a href="/dashboard/message-templates" style={{ fontSize: 12, color: "#4f46e5" }}>
            Manage templates &rarr;
          </a>
        </div>
        <div style={cardStyle}>
          <div style={labelStyle}>Queued Messages</div>
          <div style={valueStyle}>{queuedMessageCount}</div>
          <a href="/dashboard/messages" style={{ fontSize: 12, color: "#4f46e5" }}>
            View messages &rarr;
          </a>
        </div>
      </div>
      <p style={{ fontSize: 12, color: "#999" }}>
        Outbound sending is not yet enabled. Messages are saved as drafts and queued until an email/SMS provider is connected.
      </p>
    </div>
  );
}
