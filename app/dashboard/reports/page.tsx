import { requireCurrentOrganization } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { requirePermission, AuthzError } from "@/lib/authz";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "sales", label: "Sales" },
  { key: "payments", label: "Payments" },
  { key: "customers", label: "Customers" },
  { key: "inventory", label: "Inventory" },
  { key: "cogs", label: "Cost of Goods" },
];

function monthLabel(key: string) {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleString("en-US", { month: "long", year: "numeric" });
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: { from?: string; to?: string; tab?: string };
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
  const activeTab = TABS.some((t) => t.key === searchParams.tab) ? (searchParams.tab as string) : "overview";

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

  function tabHref(tabKey: string) {
    const params = new URLSearchParams();
    params.set("tab", tabKey);
    if (fromParam) params.set("from", fromParam);
    if (toParam) params.set("to", toParam);
    return `/dashboard/reports?${params.toString()}`;
  }

  const [
    orderStats,
    orderCount,
    topItems,
    statusGroups,
    openOrders,
    salesOrders,
    customerSpend,
    allItems,
    leadSourceGroups,
  ] = await Promise.all([
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
      orderBy: { _sum: { price: "desc" } },
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
    prisma.order.findMany({
      where: { organizationId: organization.id, status: { not: "cancelled" }, ...dateWhere },
      select: { totalAmount: true, amountPaid: true, createdAt: true },
    }),
    prisma.order.groupBy({
      by: ["customerId"],
      where: { organizationId: organization.id, status: { not: "cancelled" }, ...dateWhere },
      _sum: { totalAmount: true },
      _count: { _all: true },
      orderBy: { _sum: { totalAmount: "desc" } },
      take: 15,
    }),
    prisma.item.findMany({
      where: { organizationId: organization.id },
      include: { category: true },
    }),
    prisma.customer.groupBy({
      by: ["leadSource"],
      where: { organizationId: organization.id },
      _count: { _all: true },
    }),
  ]);

  const itemMap = new Map(allItems.map((i) => [i.id, i]));

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

  const monthly = new Map<string, { revenue: number; collected: number; orders: number }>();
  for (const o of salesOrders) {
    const d = new Date(o.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const entry = monthly.get(key) || { revenue: 0, collected: 0, orders: 0 };
    entry.revenue += o.totalAmount || 0;
    entry.collected += o.amountPaid || 0;
    entry.orders += 1;
    monthly.set(key, entry);
  }
  const monthlyRows = Array.from(monthly.entries())
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([key, v]) => ({ key, label: monthLabel(key), ...v }));

  const customerIds = customerSpend.map((c) => c.customerId);
  const spendCustomers = await prisma.customer.findMany({ where: { id: { in: customerIds } } });
  const spendCustomerMap = new Map(spendCustomers.map((c) => [c.id, c]));

  const categoryTotals = new Map<string, { name: string; units: number; revenue: number }>();
  for (const t of topItems) {
    const item = itemMap.get(t.itemId);
    if (!item) continue;
    const catId = item.categoryId;
    const catName = item.category ? item.category.name : "Uncategorized";
    const entry = categoryTotals.get(catId) || { name: catName, units: 0, revenue: 0 };
    entry.units += t._sum.quantity || 0;
    entry.revenue += t._sum.price || 0;
    categoryTotals.set(catId, entry);
  }
  const categoryRows = Array.from(categoryTotals.values()).sort((a, b) => b.revenue - a.revenue);

  const totalInventoryValue = allItems.reduce((sum, i) => sum + (i.cost || 0) * (i.quantity || 0), 0);
  const totalUnitsOnHand = allItems.reduce((sum, i) => sum + (i.quantity || 0), 0);

  const collectionRate = totalRevenue > 0 ? (totalCollected / totalRevenue) * 100 : 0;

  const itemRevenueMap = new Map(topItems.map((t) => [t.itemId, t._sum.price || 0]));
  const cogsRows = allItems
    .map((i) => {
      const revenue = itemRevenueMap.get(i.id) || 0;
      const invested = i.acquisitionCost != null ? i.acquisitionCost * (i.quantity || 0) : null;
      return {
        id: i.id,
        name: i.name,
        category: i.category ? i.category.name : "Uncategorized",
        acquisitionCost: i.acquisitionCost,
        quantity: i.quantity,
        invested,
        revenue,
      };
    })
    .sort((a, b) => (b.invested || 0) - (a.invested || 0));
  const totalAcquisitionInvested = cogsRows.reduce((sum, r) => sum + (r.invested || 0), 0);
  const itemsMissingCost = cogsRows.filter((r) => r.acquisitionCost == null).length;
  const totalRevenueAllItems = allItems.reduce((sum, i) => sum + (itemRevenueMap.get(i.id) || 0), 0);
  const netReturn = totalRevenueAllItems - totalAcquisitionInvested;

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

      <div className="flex gap-1 mb-6 bg-white shadow rounded-lg p-1 w-fit flex-wrap">
        {TABS.map((t) => (
          <a
            key={t.key}
            href={tabHref(t.key)}
            className={
              "px-4 py-2 text-sm font-medium rounded-md " +
              (activeTab === t.key ? "bg-indigo-600 text-white" : "text-gray-600 hover:bg-gray-50")
            }
          >
            {t.label}
          </a>
        ))}
      </div>

      <form method="get" className="flex gap-3 items-end mb-6 bg-white shadow rounded-lg p-4">
        <input type="hidden" name="tab" value={activeTab} />
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
          <a href={tabHref(activeTab)} className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700">
            Clear
          </a>
        )}
      </form>

      {activeTab === "overview" && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white shadow rounded-lg p-4 border-l-4 border-indigo-600">
              <div className="text-sm text-gray-500">Total Revenue</div>
              <div className="text-2xl font-bold text-gray-900">${totalRevenue.toFixed(2)}</div>
            </div>
            <div className="bg-white shadow rounded-lg p-4 border-l-4 border-green-600">
              <div className="text-sm text-gray-500">Amount Collected</div>
              <div className="text-2xl font-bold text-gray-900">${totalCollected.toFixed(2)}</div>
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
        </>
      )}

      {activeTab === "sales" && (
        <>
          <div className="bg-white shadow rounded-lg overflow-hidden mb-8">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Sales Overview by Month</h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-200">
                  <th className="px-6 py-2 font-medium">Month</th>
                  <th className="px-6 py-2 font-medium">Orders</th>
                  <th className="px-6 py-2 font-medium">Revenue</th>
                  <th className="px-6 py-2 font-medium">Collected</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {monthlyRows.map((m) => (
                  <tr key={m.key}>
                    <td className="px-6 py-2">{m.label}</td>
                    <td className="px-6 py-2">{m.orders}</td>
                    <td className="px-6 py-2">${m.revenue.toFixed(2)}</td>
                    <td className="px-6 py-2">${m.collected.toFixed(2)}</td>
                  </tr>
                ))}
                {monthlyRows.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-gray-500">No sales in this range yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="bg-white shadow rounded-lg overflow-hidden mb-8">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Top Rented Items (all-time)</h2>
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
        </>
      )}

      {activeTab === "payments" && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="bg-white shadow rounded-lg p-4 border-l-4 border-green-600">
              <div className="text-sm text-gray-500">Amount Collected</div>
              <div className="text-2xl font-bold text-gray-900">${totalCollected.toFixed(2)}</div>
            </div>
            <div className={"bg-white shadow rounded-lg p-4 border-l-4 " + (totalOutstanding > 0 ? "border-orange-500" : "border-gray-300")}>
              <div className="text-sm text-gray-500">Outstanding Balance</div>
              <div className={"text-2xl font-bold " + (totalOutstanding > 0 ? "text-orange-600" : "text-gray-900")}>${totalOutstanding.toFixed(2)}</div>
            </div>
            <div className="bg-white shadow rounded-lg p-4 border-l-4 border-indigo-600">
              <div className="text-sm text-gray-500">Collection Rate</div>
              <div className="text-2xl font-bold text-gray-900">{collectionRate.toFixed(1)}%</div>
            </div>
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
        </>
      )}

      {activeTab === "customers" && (
        <>
          <div className="bg-white shadow rounded-lg overflow-hidden mb-8">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Top Customers by Spend</h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-200">
                  <th className="px-6 py-2 font-medium">Customer</th>
                  <th className="px-6 py-2 font-medium">Orders</th>
                  <th className="px-6 py-2 font-medium">Total Spend</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {customerSpend.map((c) => {
                  const cust = spendCustomerMap.get(c.customerId);
                  return (
                    <tr key={c.customerId}>
                      <td className="px-6 py-2">{cust ? `${cust.firstName} ${cust.lastName}` : "Unknown customer"}</td>
                      <td className="px-6 py-2">{c._count._all}</td>
                      <td className="px-6 py-2">${(c._sum.totalAmount || 0).toFixed(2)}</td>
                    </tr>
                  );
                })}
                {customerSpend.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-6 py-4 text-gray-500">No customer orders yet.</td>
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
        </>
      )}

      {activeTab === "inventory" && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            <div className="bg-white shadow rounded-lg p-4 border-l-4 border-indigo-600">
              <div className="text-sm text-gray-500">Total Inventory Value (listed price &times; qty on hand)</div>
              <div className="text-2xl font-bold text-gray-900">${totalInventoryValue.toFixed(2)}</div>
            </div>
            <div className="bg-white shadow rounded-lg p-4 border-l-4 border-blue-600">
              <div className="text-sm text-gray-500">Total Units on Hand</div>
              <div className="text-2xl font-bold text-gray-900">{totalUnitsOnHand}</div>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg overflow-hidden mb-8">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Revenue by Category</h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-200">
                  <th className="px-6 py-2 font-medium">Category</th>
                  <th className="px-6 py-2 font-medium">Units Booked</th>
                  <th className="px-6 py-2 font-medium">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {categoryRows.map((c) => (
                  <tr key={c.name}>
                    <td className="px-6 py-2">{c.name}</td>
                    <td className="px-6 py-2">{c.units}</td>
                    <td className="px-6 py-2">${c.revenue.toFixed(2)}</td>
                  </tr>
                ))}
                {categoryRows.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-6 py-4 text-gray-500">No bookings yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {activeTab === "cogs" && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="bg-white shadow rounded-lg p-4 border-l-4 border-indigo-600">
              <div className="text-sm text-gray-500">Total Acquisition Investment</div>
              <div className="text-2xl font-bold text-gray-900">${totalAcquisitionInvested.toFixed(2)}</div>
            </div>
            <div className="bg-white shadow rounded-lg p-4 border-l-4 border-green-600">
              <div className="text-sm text-gray-500">Revenue Earned (tracked items)</div>
              <div className="text-2xl font-bold text-gray-900">${totalRevenueAllItems.toFixed(2)}</div>
            </div>
            <div className={"bg-white shadow rounded-lg p-4 border-l-4 " + (netReturn >= 0 ? "border-green-600" : "border-orange-500")}>
              <div className="text-sm text-gray-500">Net Return vs. Investment</div>
              <div className={"text-2xl font-bold " + (netReturn >= 0 ? "text-green-700" : "text-orange-600")}>${netReturn.toFixed(2)}</div>
            </div>
          </div>

          {itemsMissingCost > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm rounded-lg px-4 py-3 mb-6">
              {itemsMissingCost} item{itemsMissingCost === 1 ? "" : "s"} {itemsMissingCost === 1 ? "has" : "have"} no acquisition cost recorded yet, so {itemsMissingCost === 1 ? "it's" : "they're"} excluded from the investment total above. Add a cost in Inventory to include {itemsMissingCost === 1 ? "it" : "them"}.
            </div>
          )}

          <div className="bg-white shadow rounded-lg overflow-hidden mb-8">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Cost of Goods by Item</h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-200">
                  <th className="px-6 py-2 font-medium">Item</th>
                  <th className="px-6 py-2 font-medium">Category</th>
                  <th className="px-6 py-2 font-medium">Acquisition Cost</th>
                  <th className="px-6 py-2 font-medium">Qty</th>
                  <th className="px-6 py-2 font-medium">Total Invested</th>
                  <th className="px-6 py-2 font-medium">Revenue Earned</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {cogsRows.map((r) => (
                  <tr key={r.id}>
                    <td className="px-6 py-2">{r.name}</td>
                    <td className="px-6 py-2">{r.category}</td>
                    <td className="px-6 py-2">
                      {r.acquisitionCost != null ? `$${r.acquisitionCost.toFixed(2)}` : <span className="text-gray-400">Not recorded</span>}
                    </td>
                    <td className="px-6 py-2">{r.quantity}</td>
                    <td className="px-6 py-2">{r.invested != null ? `$${r.invested.toFixed(2)}` : "-"}</td>
                    <td className="px-6 py-2">${r.revenue.toFixed(2)}</td>
                  </tr>
                ))}
                {cogsRows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-gray-500">No inventory items yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
