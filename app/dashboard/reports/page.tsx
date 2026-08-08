import { requireCurrentOrganization } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";

export default async function ReportsPage() {
    const organization = await requireCurrentOrganization();

  const [orderStats, orderCount, topItems, statusGroups, openOrders] = await Promise.all([
        prisma.order.aggregate({
                where: { organizationId: organization.id, status: { not: "cancelled" } },
                _sum: { totalAmount: true, amountPaid: true },
        }),
        prisma.order.count({
                where: { organizationId: organization.id },
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
          where: { organizationId: organization.id },
          _count: { _all: true },
        }),
        prisma.order.findMany({
          where: { organizationId: organization.id, status: { not: "cancelled" } },
          include: { customer: true },
          orderBy: { eventDate: "asc" },
        }),
      ]);

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
        <div style={{ padding: 20 }}>
                <h1>Reports &amp; Analytics</h1>
        
              <div style={{ display: "flex", gap: 16, margin: "20px 0" }}>
                      <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 16, flex: 1 }}>
                                <div style={{ fontSize: 13, color: "#666" }}>Total Revenue</div>
                                <div style={{ fontSize: 24, fontWeight: 700 }}>
                                            ${(orderStats._sum.totalAmount || 0).toFixed(2)}
                                </div>
                      </div>
                      <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 16, flex: 1 }}>
                                <div style={{ fontSize: 13, color: "#666" }}>Amount Collected</div>
                                <div style={{ fontSize: 24, fontWeight: 700 }}>
                                            ${(orderStats._sum.amountPaid || 0).toFixed(2)}
                                </div>
                      </div>
                      <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 16, flex: 1, background: totalOutstanding > 0 ? "#fff7ed" : "#fff" }}>
                                <div style={{ fontSize: 13, color: "#666" }}>Outstanding Balance</div>
                                <div style={{ fontSize: 24, fontWeight: 700, color: totalOutstanding > 0 ? "#c2410c" : "#111" }}>
                                            ${totalOutstanding.toFixed(2)}
                                </div>
                      </div>
                      <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 16, flex: 1 }}>
                                <div style={{ fontSize: 13, color: "#666" }}>Total Orders</div>
                                <div style={{ fontSize: 24, fontWeight: 700 }}>{orderCount}</div>
                      </div>
              </div>
        
              <h2>Orders by Status</h2>
              <div style={{ display: "flex", gap: 12, margin: "12px 0 30px", flexWrap: "wrap" }}>
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

              <h2>Receivables (unpaid balances)</h2>
              <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 30 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>Order</th>
                    <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>Customer</th>
                    <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>Total</th>
                    <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>Paid</th>
                    <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>Balance Due</th>
                  </tr>
                </thead>
                <tbody>
                  {receivables.map((rr) => (
                    <tr key={rr.order.id}>
                      <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>{rr.order.orderNumber}</td>
                      <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>{rr.order.customer.firstName} {rr.order.customer.lastName}</td>
                      <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>${rr.order.totalAmount.toFixed(2)}</td>
                      <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>${rr.order.amountPaid.toFixed(2)}</td>
                      <td style={{ padding: 8, borderBottom: "1px solid #eee", fontWeight: 600, color: "#c2410c" }}>${rr.balance.toFixed(2)}</td>
                    </tr>
                  ))}
                  {receivables.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ padding: 8, color: "#666" }}>No outstanding balances. All orders are paid in full.</td>
                    </tr>
                  )}
                </tbody>
              </table>

              <h2>Top Rented Items</h2>
              <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 30 }}>
                      <thead>
                                <tr>
                                            <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>Item</th>
                                            <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>
                                                          Units Booked
                                            </th>
                                            <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>
                                                          Revenue
                                            </th>
                                </tr>
                      </thead>
                      <tbody>
                        {topItems.map((t) => {
                      const item = itemMap.get(t.itemId);
                      return (
                                      <tr key={t.itemId}>
                                                      <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>
                                                        {item ? item.name : "Unknown item"}
                                                      </td>
                                                      <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>
                                                        {t._sum.quantity || 0}
                                                      </td>
                                                      <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>
                                                                        ${(t._sum.price || 0).toFixed(2)}
                                                      </td>
                                      </tr>
                                    );
        })}
                        {topItems.length === 0 && (
                      <tr>
                                    <td colSpan={3} style={{ padding: 8, color: "#666" }}>
                                                    No bookings yet.
                                    </td>
                      </tr>
                                )}
                      </tbody>
              </table>
        
              <h2>Recent Orders (last 30 days)</h2>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                                <tr>
                                            <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>
                                                          Order #
                                            </th>
                                            <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>
                                                          Customer
                                            </th>
                                            <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>
                                                          Total
                                            </th>
                                            <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: 8 }}>
                                                          Status
                                            </th>
                                </tr>
                      </thead>
                      <tbody>
                        {recentOrders.map((order) => (
                      <tr key={order.id}>
                                    <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>{order.orderNumber}</td>
                                    <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>
                                      {order.customer.firstName} {order.customer.lastName}
                                    </td>
                                    <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>
                                                    ${order.totalAmount.toFixed(2)}
                                    </td>
                                    <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>{order.status}</td>
                      </tr>
                    ))}
                        {recentOrders.length === 0 && (
                      <tr>
                                    <td colSpan={4} style={{ padding: 8, color: "#666" }}>
                                                    No orders in the last 30 days.
                                    </td>
                      </tr>
                                )}
                      </tbody>
              </table>
        </div>
      );
}
