import { requireCurrentOrganization } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { requirePermission, AuthzError } from "@/lib/authz";

function pctChange(current: number, previous: number) {
  if (previous <= 0) return null;
  return ((current - previous) / previous) * 100;
}

function monthLabel(date: Date) {
  return date.toLocaleDateString("en-US", { month: "short" });
}

export default async function AnalyticsPage() {
  const organization = await requireCurrentOrganization();

  try {
    await requirePermission(organization.id, "reports.view");
  } catch (err) {
    if (err instanceof AuthzError) {
      return (
        <div style={{ padding: 32, maxWidth: 640 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Analytics</h1>
          <p style={{ color: "#666" }}>
            You don't have permission to view analytics for this organization. Contact an account owner if you need access.
          </p>
        </div>
      );
    }
    throw err;
  }

  const now = new Date();
  const start30 = new Date(now);
  start30.setDate(start30.getDate() - 30);
  const start60 = new Date(now);
  start60.setDate(start60.getDate() - 60);
  const start6mo = new Date(now);
  start6mo.setMonth(start6mo.getMonth() - 5);
  start6mo.setDate(1);
  start6mo.setHours(0, 0, 0, 0);

  const [current, previous, allCustomers, sixMonthOrders, topItemsRaw, statusGroups] = await Promise.all([
    prisma.order.aggregate({
      where: { organizationId: organization.id, status: { not: "cancelled" }, createdAt: { gte: start30 } },
      _sum: { totalAmount: true, amountPaid: true },
      _count: { _all: true },
    }),
    prisma.order.aggregate({
      where: { organizationId: organization.id, status: { not: "cancelled" }, createdAt: { gte: start60, lt: start30 } },
      _sum: { totalAmount: true },
      _count: { _all: true },
    }),
    prisma.customer.count({ where: { organizationId: organization.id } }),
    prisma.order.findMany({
      where: { organizationId: organization.id, status: { not: "cancelled" }, createdAt: { gte: start6mo } },
      select: { createdAt: true, totalAmount: true },
    }),
    prisma.orderItem.groupBy({
      by: ["itemId"],
      where: { order: { organizationId: organization.id, status: { not: "cancelled" } } },
      _sum: { price: true, quantity: true },
      orderBy: { _sum: { price: "desc" } },
      take: 5,
    }),
    prisma.order.groupBy({
      by: ["status"],
      where: { organizationId: organization.id },
      _count: { _all: true },
    }),
  ]);

  const itemIds = topItemsRaw.map((t) => t.itemId);
  const items = await prisma.item.findMany({ where: { id: { in: itemIds } } });
  const itemMap = new Map(items.map((i) => [i.id, i]));

  const revenue30 = current._sum.totalAmount || 0;
  const collected30 = current._sum.amountPaid || 0;
  const outstanding30 = revenue30 - collected30;
  const orders30 = current._count._all;
  const avgOrder30 = orders30 > 0 ? revenue30 / orders30 : 0;
  const revenuePrev30 = previous._sum.totalAmount || 0;
  const ordersPrev30 = previous._count._all;
  const avgOrderPrev30 = ordersPrev30 > 0 ? revenuePrev30 / ordersPrev30 : 0;

  const revenueChange = pctChange(revenue30, revenuePrev30);
  const avgOrderChange = pctChange(avgOrder30, avgOrderPrev30);

  const buckets = new Map<string, number>();
  for (let i = 0; i < 6; i++) {
    const d = new Date(start6mo);
    d.setMonth(d.getMonth() + i);
    buckets.set(monthLabel(d) + "-" + d.getFullYear(), 0);
  }
  for (const o of sixMonthOrders) {
    const key = monthLabel(o.createdAt) + "-" + o.createdAt.getFullYear();
    buckets.set(key, (buckets.get(key) || 0) + (o.totalAmount || 0));
  }
  const trend = Array.from(buckets.entries()).map(([label, amount]) => ({ label: label.split("-")[0], amount }));
  const maxTrend = Math.max(1, ...trend.map((t) => t.amount));

  return (
    <div style={{ padding: 20 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Analytics</h1>
      <p style={{ color: "#666", marginBottom: 20 }}>Business performance and booking insights.</p>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 30 }}>
        <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 16, flex: "1 1 160px" }}>
          <div style={{ fontSize: 13, color: "#666" }}>Revenue (30d)</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>${revenue30.toFixed(2)}</div>
          {revenueChange !== null && (
            <div style={{ fontSize: 12, color: revenueChange >= 0 ? "#15803d" : "#b91c1c" }}>
              {revenueChange >= 0 ? "↑" : "↓"} {Math.abs(revenueChange).toFixed(0)}% vs prior 30d
            </div>
          )}
        </div>
        <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 16, flex: "1 1 160px" }}>
          <div style={{ fontSize: 13, color: "#666" }}>Collected (30d)</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>${collected30.toFixed(2)}</div>
        </div>
        <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 16, flex: "1 1 160px", background: outstanding30 > 0 ? "#fff7ed" : "#fff" }}>
          <div style={{ fontSize: 13, color: "#666" }}>Outstanding (30d)</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: outstanding30 > 0 ? "#c2410c" : "#111" }}>${outstanding30.toFixed(2)}</div>
        </div>
        <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 16, flex: "1 1 160px" }}>
          <div style={{ fontSize: 13, color: "#666" }}>Orders (30d)</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{orders30}</div>
        </div>
        <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 16, flex: "1 1 160px" }}>
          <div style={{ fontSize: 13, color: "#666" }}>Average Order</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>${avgOrder30.toFixed(2)}</div>
          {avgOrderChange !== null && (
            <div style={{ fontSize: 12, color: avgOrderChange >= 0 ? "#15803d" : "#b91c1c" }}>
              {avgOrderChange >= 0 ? "↑" : "↓"} {Math.abs(avgOrderChange).toFixed(0)}% vs prior 30d
            </div>
          )}
        </div>
        <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 16, flex: "1 1 160px" }}>
          <div style={{ fontSize: 13, color: "#666" }}>Customers</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{allCustomers}</div>
        </div>
      </div>

      <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Revenue Trend (6 months)</h2>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 12, height: 140, marginBottom: 30, borderBottom: "1px solid #eee", paddingBottom: 8 }}>
        {trend.map((t, idx) => (
          <div key={idx} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
            <div style={{ fontSize: 11, color: "#666", marginBottom: 4 }}>${Math.round(t.amount)}</div>
            <div style={{ width: "100%", maxWidth: 36, height: Math.max(4, (t.amount / maxTrend) * 100), background: "#4f46e5", borderRadius: 4 }} />
            <div style={{ fontSize: 12, color: "#666", marginTop: 6 }}>{t.label}</div>
          </div>
        ))}
      </div>

      <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Orders by Status</h2>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 30 }}>
        {statusGroups.length === 0 ? (
          <div style={{ color: "#666" }}>No orders yet.</div>
        ) : (
          statusGroups.map((s) => (
            <div key={s.status} style={{ border: "1px solid #eee", borderRadius: 6, padding: "8px 14px", minWidth: 90 }}>
              <div style={{ fontSize: 12, color: "#666", textTransform: "capitalize" }}>{s.status}</div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{s._count._all}</div>
            </div>
          ))
        )}
      </div>

      <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Top Rentals by Revenue</h2>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>Item</th>
            <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>Units Booked</th>
            <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>Revenue</th>
          </tr>
        </thead>
        <tbody>
          {topItemsRaw.map((t) => {
            const item = itemMap.get(t.itemId);
            return (
              <tr key={t.itemId}>
                <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>{item ? item.name : "Unknown item"}</td>
                <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>{t._sum.quantity || 0}</td>
                <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>${(t._sum.price || 0).toFixed(2)}</td>
              </tr>
            );
          })}
          {topItemsRaw.length === 0 && (
            <tr>
              <td colSpan={3} style={{ padding: 8, color: "#666" }}>No bookings yet.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
