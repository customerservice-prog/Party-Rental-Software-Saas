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
  <div className="friendly-admin-page is-wide">
   <div className="friendly-admin-head"><div><h1>Analytics</h1><p>Business performance and booking insights.</p></div></div>

   <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6 mb-5">
    <div className="friendly-admin-kpi"><small>Revenue (30d)</small><strong>{revenue30.toLocaleString("en-US",{style:"currency",currency:"USD"})}</strong>{revenueChange!==null&&<span className={"mt-1 block text-[9px] "+(revenueChange>=0?"text-green-600":"text-red-600")}>{revenueChange>=0?"↑":"↓"} {Math.abs(revenueChange).toFixed(0)}% vs prior</span>}</div>
    <div className="friendly-admin-kpi"><small>Collected (30d)</small><strong>{collected30.toLocaleString("en-US",{style:"currency",currency:"USD"})}</strong></div>
    <div className="friendly-admin-kpi"><small>Outstanding (30d)</small><strong className={outstanding30>0?"!text-orange-600":""}>{outstanding30.toLocaleString("en-US",{style:"currency",currency:"USD"})}</strong></div>
    <div className="friendly-admin-kpi"><small>Orders (30d)</small><strong>{orders30}</strong></div>
    <div className="friendly-admin-kpi"><small>Average Order</small><strong>{avgOrder30.toLocaleString("en-US",{style:"currency",currency:"USD"})}</strong>{avgOrderChange!==null&&<span className={"mt-1 block text-[9px] "+(avgOrderChange>=0?"text-green-600":"text-red-600")}>{avgOrderChange>=0?"↑":"↓"} {Math.abs(avgOrderChange).toFixed(0)}%</span>}</div>
    <div className="friendly-admin-kpi"><small>Customers</small><strong>{allCustomers}</strong></div>
   </div>

   <div className="friendly-admin-card">
    <div className="friendly-admin-card-title">Revenue Trend (6 months)</div>
    <div className="flex h-36 items-end gap-3">
     {trend.map((t,idx)=><div key={idx} className="flex flex-1 flex-col items-center"><div className="mb-1 text-[9px] text-gray-500">{t.amount.toLocaleString("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0})}</div><div className="w-full max-w-[38px] rounded bg-[#1a6fd4]" style={{height:Math.max(4,(t.amount/maxTrend)*100)}}/><div className="mt-1.5 text-[9px] text-gray-500">{t.label}</div></div>)}
    </div>
   </div>

   <div className="friendly-admin-card">
    <div className="friendly-admin-card-title">Orders by Status</div>
    <div className="flex flex-wrap gap-2">{statusGroups.length===0?<span className="text-xs text-gray-500">No orders yet.</span>:statusGroups.map(s=><div key={s.status} className="rounded border border-gray-200 bg-gray-50 px-3 py-2"><div className="text-[9px] capitalize text-gray-500">{s.status}</div><div className="text-lg font-bold text-gray-900">{s._count._all}</div></div>)}</div>
   </div>

   <div className="friendly-admin-card flush">
    <div className="friendly-admin-subhead"><div><h2>Top Rentals by Revenue</h2><p>Highest-grossing rental items</p></div></div>
    <div className="friendly-admin-table-wrap"><table className="friendly-admin-table"><thead><tr><th>Item</th><th className="numeric">Units Booked</th><th className="numeric">Revenue</th></tr></thead><tbody>
     {topItemsRaw.map(t=>{const item=itemMap.get(t.itemId);return <tr key={t.itemId}><td>{item?item.name:"Unknown item"}</td><td className="numeric">{t._sum.quantity||0}</td><td className="numeric">{(t._sum.price||0).toLocaleString("en-US",{style:"currency",currency:"USD"})}</td></tr>})}
     {topItemsRaw.length===0&&<tr><td colSpan={3} className="friendly-admin-empty">No bookings yet.</td></tr>}
    </tbody></table></div>
   </div>
  </div>
 );
}
