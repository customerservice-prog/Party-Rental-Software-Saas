import { requireCurrentOrganization } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { requirePermission, AuthzError } from "@/lib/authz";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: { from?: string; to?: string };
}) {
    const organization = await requireCurrentOrganization();

  try {
    await requirePermission(organization.id, "reports.view");
  } catch (err) {
    if (err instanceof AuthzError) {
      return (
        <div style={{ padding: 32, maxWidth: 640 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Reports</h1>
          <p style={{ color: "#666" }}>
            You don't have permission to view reports for this organization. Contact an account owner if you need access.
          </p>
        </div>
      );
    }
    throw err;
  }

  const fromParam = typeof searchParams.from === "string" ? searchParams.from : "";
  const toParam = typeof searchParams.to === "string" ? searchParams.to : "";
  const dateFilter: { gte?: Date; lte?: Date } = {};
  const fromDate = fromParam ? new Date(fromParam) : null;
  if (fromDate && !isNaN(fromDate.getTime())) dateFilter.gte = fromDate;
  const toDate = toParam ? new Date(toParam) : null;
  if (toDate && !isNaN(toDate.getTime())) {
    toDate.setHours(23, 59, 59, 999);
    dateFilter.lte = toDate;
  }
  const hasDateFilter = dateFilter.gte !== undefined || dateFilter.lte !== undefined;
  const dateWhere = hasDateFilter ? { createdAt: dateFilter } : {};

  const [orderStats, orderCount, topItems, statusGroups, openOrders] = await Promise.all([
        prisma.order.aggregate({
                where: { organizationId: organization.id, status: { not: "cancelled" }, ...dateWhere },
                _sum: { totalAmount: true, amountPaid: true },
        }),
        prisma.order.count({
                where: { organizationId: organization.id, ...dateWhere },
        }),
        prisma.orderItem.groupBy({
                by: ["itemId"],
                where: { order: { organizationId: organization.id, status: { not: "cancelled" } } },
                _sum: { quantity: true, price: true },
                orderBy: { _sum: { quantity: "desc" } },
                take: 5,
        }),
        prisma.order.groupBy({
          by: ["status"],
          where: { organizationId: organization.id, ...dateWhere },
          _count: { _all: true },
        }),
        prisma.order.findMany({
          where: { organizationId: organization.id, status: { not: "cancelled" }, ...dateWhere },
          include: { customer: true },
          orderBy: { eventDate: "asc" },
        }),
      ]);

  const leadSourceGroups = await prisma.customer.groupBy({
    by: ["leadSource"],
    where: { organizationId: organization.id },
    _count: { _all: true },
  });

  const itemIds = topItems.map((t) => t.itemId);
    const items = await prisma.item.findMany({
          where: { id: { in: itemIds } },
    });
    const itemMap = new Map(items.map((i) => [i.id, i]));

  const totalRevenue = orderStats._sum.totalAmount || 0;
  const totalCollected = orderStats._sum.amountPaid || 0;
  const totalOutstanding = totalRevenue - totalCollected;

  const receivables = openOrders
    .map((o) => ({ order: o, balance: (o.totalAmount || 0) - (o.amountPaid || 0) }))
    .filter((rr) => rr.balance > 0.009)
    .sort((a, b) => b.balance - a.balance);

  const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);
  const recentOrders = await prisma.order.findMany({
        where: {
                organizationId: organization.id,
                createdAt: { gte: last30Days },
        },
        include: { customer: true },
        orderBy: { createdAt: "desc" },
        take: 10,
  });

return (
  <div>
  <div className="flex items-center justify-between mb-6">
  <h1 className="text-2xl font-bold text-gray-900">Reports &amp; Analytics</h1>
  <a
    href={`/api/reports/export${(fromParam || toParam) ? `?from=${encodeURIComponent(fromParam)}&to=${encodeURIComponent(toParam)}` : ""}`}
    className="border border-gray-300 rounded-md px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
    >
  Export CSV
  </a>
  </div>
  
  <form method="get" className="flex gap-3 items-end mb-6 bg-white shadow rounded-lg p-4">
  <div>
  <div className="text-xs text-gray-500 mb-1">From</div>
  <input type="date" name="from" defaultValue={fromParam} className="border border-gray-300 rounded-md px-3 py-1.5 text-sm" />
  </div>
  <div>
  <div className="text-xs text-gray-500 mb-1">To</div>
  <input type="date" name="to" defaultValue={toParam} className="border border-gray-300 rounded-md px-3 py-1.5 text-sm" />
  </div>
  <button type="submit" className="bg-indigo-600 text-white rounded-md px-4 py-2 text-sm font-medium hover:bg-indigo-700">
  Apply
  </button>
    {hasDateFilter && (
    <a href="/dashboard/reports" className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700">
    Clear
    </a>
  )}
  </form>
  
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
  <div className="bg-white shadow rounded-lg p-4 border-l-4 border-indigo-600">
  <div className="text-sm text-gray-500">Total Revenue</div>
  <div className="text-2xl font-bold text-gray-900">${(orderStats._sum.totalAmount || 0).toFixed(2)}</div>
  </div>
  <div className="bg-white shadow rounded-lg p-4 border-l-4 border-green-600">
  <div className="text-sm text-gray-500">Amount Collected</div>
  <div className="text-2xl font-bold text-gray-900">${(orderStats._sum.amountPaid || 0).toFixed(2)}</div>
  </div>
  <div className={"bg-white shadow rounded-lg p-4 border-l-4 " + (totalOutstanding > 0 ? "border-orange-500" : "border-gray-300")}>
  <div className="text-sm text-gray-500">Outstanding Balance</div>
  <div className={"text-2xl font-bold " + (totalOutstanding > 0 ? "text-orange-600" : "text-gray-900")}>${totalOutstanding.toFixed(2)}</div>
  </div>
  <div className="bg-white shadow rounded-lg p-4 border-l-4 border-blue-600">
  <div className="text-sm text-gray-500">Total Orders</div>
  <div className="text-2xl font-bold text-gray-900">{orderCount}</div>
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
  <div className="bg-white shadow rounded-lg overflow-hidden mb-8">
  <div className="px-6 py-4 border-b border-gray-200">
  <h2 className="text-lg font-semibold text-gray-900">Receivables (unpaid balances)</h2>
  </div>
  <table className="w-full text-sm">
  <thead>
    <tr className="text-left text-gray-500 border-b border-gray-200">
    <th className="px-6 py-2 font-medium">Order</th>
    <th className="px-6 py-2 font-medium">Customer</th>
    <th className="px-6 py-2 font-medium">Total</th>
    <th className="px-6 py-2 font-medium">Paid</th>
    <th className="px-6 py-2 font-medium">Balance Due</th>
    </tr>
  </thead>
  <tbody className="divide-y divide-gray-100">
    {receivables.map((rr) => (
    <tr key={rr.order.id}>
    <td className="px-6 py-2">{rr.order.orderNumber}</td>
    <td className="px-6 py-2">{rr.order.customer.firstName} {rr.order.customer.lastName}</td>
    <td className="px-6 py-2">${rr.order.totalAmount.toFixed(2)}</td>
    <td className="px-6 py-2">${rr.order.amountPaid.toFixed(2)}</td>
    <td className="px-6 py-2 font-semibold text-orange-600">${rr.balance.toFixed(2)}</td>
    </tr>
    ))}
    {receivables.length === 0 && (
    <tr>
    <td colSpan={5} className="px-6 py-4 text-gray-500">No outstanding balances. All orders are paid in full.</td>
    </tr>
  )}
  </tbody>
  </table>
  </div>
  <div className="bg-white shadow rounded-lg overflow-hidden mb-8">
  <div className="px-6 py-4 border-b border-gray-200">
  <h2 className="text-lg font-semibold text-gray-900">Top Rented Items</h2>
  </div>
  <table className="w-full text-sm">
  <thead>
  <tr className="text-left text-gray-500 border-b border-gray-200">
  <th className="px-6 py-2 font-medium">Item</th>
  <th className="px-6 py-2 font-medium">Units Booked</th>
  <th className="px-6 py-2 font-medium">Revenue</th>
  </tr>
  </thead>
  <tbody className="divide-y divide-gray-100">
    {topItems.map((t) => {
    const item = itemMap.get(t.itemId);
    return (
      <tr key={t.itemId}>
      <td className="px-6 py-2">{item ? item.name : "Unknown item"}</td>
      <td className="px-6 py-2">{t._sum.quantity || 0}</td>
      <td className="px-6 py-2">${(t._sum.price || 0).toFixed(2)}</td>
      </tr>
      );
  })}
    {topItems.length === 0 && (
    <tr>
    <td colSpan={3} className="px-6 py-4 text-gray-500">No bookings yet.</td>
    </tr>
  )}
  </tbody>
  </table>
  </div>
  <div className="bg-white shadow rounded-lg overflow-hidden mb-8">
  <div className="px-6 py-4 border-b border-gray-200">
  <h2 className="text-lg font-semibold text-gray-900">Recent Orders (last 30 days)</h2>
  </div>
  <table className="w-full text-sm">
  <thead>
  <tr className="text-left text-gray-500 border-b border-gray-200">
  <th className="px-6 py-2 font-medium">Order #</th>
  <th className="px-6 py-2 font-medium">Customer</th>
  <th className="px-6 py-2 font-medium">Total</th>
  <th className="px-6 py-2 font-medium">Status</th>
  </tr>
  </thead>
  <tbody className="divide-y divide-gray-100">
    {recentOrders.map((order) => (
    <tr key={order.id}>
    <td className="px-6 py-2">{order.orderNumber}</td>
    <td className="px-6 py-2">{order.customer.firstName} {order.customer.lastName}</td>
    <td className="px-6 py-2">${order.totalAmount.toFixed(2)}</td>
    <td className="px-6 py-2 capitalize">{order.status}</td>
    </tr>
    ))}
    {recentOrders.length === 0 && (
    <tr>
    <td colSpan={4} className="px-6 py-4 text-gray-500">No orders in the last 30 days.</td>
    </tr>
  )}
  </tbody>
  </table>
  </div>
  <div>
  <h2 className="text-lg font-semibold text-gray-900 mb-3">Leads by Source</h2>
  <div className="bg-white shadow rounded-lg divide-y divide-gray-100">
    {leadSourceGroups.length === 0 ? (
    <p className="px-4 py-3 text-sm text-gray-500">No customer data yet.</p>
    ) : (
    leadSourceGroups.map((g) => (
      <div key={g.leadSource} className="flex items-center justify-between px-4 py-3 text-sm">
      <span className="capitalize text-gray-700">{g.leadSource}</span>
      <span className="font-medium text-gray-900">{g._count._all}</span>
      </div>
      ))
    )}
  </div>
  </div>
  </div>
  
);
}
