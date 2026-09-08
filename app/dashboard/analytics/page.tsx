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
        <div className="max-w-2xl">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Analytics</h1>
          <p className="text-gray-500">
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
  <div>
  <h1 className="text-2xl font-bold text-gray-900 mb-1">Analytics</h1>
  <p className="text-gray-500 mb-6">Business performance and booking insights.</p>
  
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
  <div className="bg-white shadow rounded-lg p-4 border-l-4 border-indigo-600">
  <div className="text-sm text-gray-500">Revenue (30d)</div>
  <div className="text-2xl font-bold text-gray-900">${revenue30.toFixed(2)}</div>
    {revenueChange !== null && (
    <div className={"text-xs mt-1 " + (revenueChange >= 0 ? "text-green-600" : "text-red-600")}>
      {revenueChange >= 0 ? "↑" : "↓"} {Math.abs(revenueChange).toFixed(0)}% vs prior 30d
    </div>
  )}
  </div>
  <div className="bg-white shadow rounded-lg p-4 border-l-4 border-green-600">
  <div className="text-sm text-gray-500">Collected (30d)</div>
  <div className="text-2xl font-bold text-gray-900">${collected30.toFixed(2)}</div>
  </div>
  <div className={"bg-white shadow rounded-lg p-4 border-l-4 " + (outstanding30 > 0 ? "border-orange-500" : "border-gray-300")}>
  <div className="text-sm text-gray-500">Outstanding (30d)</div>
  <div className={"text-2xl font-bold " + (outstanding30 > 0 ? "text-orange-600" : "text-gray-900")}>${outstanding30.toFixed(2)}</div>
  </div>
  <div className="bg-white shadow rounded-lg p-4 border-l-4 border-blue-600">
  <div className="text-sm text-gray-500">Orders (30d)</div>
  <div className="text-2xl font-bold text-gray-900">{orders30}</div>
  </div>
  <div className="bg-white shadow rounded-lg p-4 border-l-4 border-purple-600">
  <div className="text-sm text-gray-500">Average Order</div>
  <div className="text-2xl font-bold text-gray-900">${avgOrder30.toFixed(2)}</div>
    {avgOrderChange !== null && (
    <div className={"text-xs mt-1 " + (avgOrderChange >= 0 ? "text-green-600" : "text-red-600")}>
      {avgOrderChange >= 0 ? "↑" : "↓"} {Math.abs(avgOrderChange).toFixed(0)}% vs prior 30d
    </div>
  )}
  </div>
  <div className="bg-white shadow rounded-lg p-4 border-l-4 border-teal-600">
  <div className="text-sm text-gray-500">Customers</div>
  <div className="text-2xl font-bold text-gray-900">{allCustomers}</div>
  </div>
  </div>
  
  <h2 className="text-lg font-semibold text-gray-900 mb-3">Revenue Trend (6 months)</h2>
  <div className="bg-white shadow rounded-lg p-4 mb-8">
  <div className="flex items-end gap-3 h-36">
    {trend.map((t, idx) => (
    <div key={idx} className="flex flex-col items-center flex-1">
    <div className="text-xs text-gray-500 mb-1">${Math.round(t.amount)}</div>
    <div className="w-full max-w-[36px] bg-indigo-600 rounded" style={{ height: Math.max(4, (t.amount / maxTrend) * 100) }} />
    <div className="text-xs text-gray-500 mt-1.5">{t.label}</div>
    </div>
    ))}
  </div>
  </div>
  
  <h2 className="text-lg font-semibold text-gray-900 mb-3">Orders by Status</h2>
  <div className="flex gap-3 flex-wrap mb-8">
    {statusGroups.length === 0 ? (
    <div className="text-sm text-gray-500">No orders yet.</div>
    ) : (
    statusGroups.map((s) => (
      <div key={s.status} className="bg-white shadow rounded-lg px-4 py-2 min-w-[90px]">
      <div className="text-xs text-gray-500 capitalize">{s.status}</div>
      <div className="text-xl font-bold text-gray-900">{s._count._all}</div>
      </div>
      ))
    )}
  </div>
  
  <h2 className="text-lg font-semibold text-gray-900 mb-3">Top Rentals by Revenue</h2>
  <div className="bg-white shadow rounded-lg overflow-hidden">
  <table className="w-full text-sm">
  <thead>
  <tr className="text-left text-gray-500 border-b border-gray-200">
  <th className="px-6 py-2 font-medium">Item</th>
  <th className="px-6 py-2 font-medium">Units Booked</th>
  <th className="px-6 py-2 font-medium">Revenue</th>
  </tr>
  </thead>
  <tbody className="divide-y divide-gray-100">
    {topItemsRaw.map((t) => {
    const item = itemMap.get(t.itemId);
    return (
      <tr key={t.itemId}>
      <td className="px-6 py-2">{item ? item.name : "Unknown item"}</td>
      <td className="px-6 py-2">{t._sum.quantity || 0}</td>
      <td className="px-6 py-2">${(t._sum.price || 0).toFixed(2)}</td>
      </tr>
      );
  })}
    {topItemsRaw.length === 0 && (
    <tr>
    <td colSpan={3} className="px-6 py-4 text-gray-500">No bookings yet.</td>
    </tr>
  )}
  </tbody>
  </table>
  </div>
  </div>
    );
    }
