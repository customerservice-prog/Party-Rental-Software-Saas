import { requireCurrentOrganization } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function DashboardHomePage() {
    const organization = await requireCurrentOrganization();

  const [itemCount, orderCount, customerCount] = await Promise.all([
        prisma.item.count({ where: { organizationId: organization.id } }),
        prisma.order.count({ where: { organizationId: organization.id } }),
        prisma.customer.count({ where: { organizationId: organization.id } }),
      ]);

  const recentOrders = await prisma.order.findMany({
    where: { organizationId: organization.id },
    orderBy: { createdAt: "desc" },
    take: 5,
    include: { customer: true },
  });

  const now = new Date();
  const upcomingOrders = await prisma.order.findMany({
    where: { organizationId: organization.id, eventDate: { gte: now } },
    orderBy: { eventDate: "asc" },
    take: 5,
    include: { customer: true },
  });

  const stats = [
    { label: "Inventory Items", value: itemCount },
    { label: "Total Orders", value: orderCount },
    { label: "Customers", value: customerCount },
      ];

  return (
        <div>
              <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      {itemCount === 0 && (
        <div className="mb-6 rounded-md bg-indigo-50 border border-indigo-200 p-4 text-sm">
          <span className="font-medium">Finish setting up your business.</span>{" "}
          <Link href="/onboarding" className="text-indigo-600 underline">
            Complete onboarding
          </Link>
        </div>
      )}
              <div className="grid grid-cols-3 gap-4">
                {stats.map((stat) => (
                    <div key={stat.label} className="border rounded p-4">
                                <div className="text-sm text-gray-500">{stat.label}</div>
                                <div className="text-3xl font-bold">{stat.value}</div>
                    </div>
                  ))}
              </div>

              <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white shadow rounded-lg overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">Recent Orders</h2>
                  </div>
                  {recentOrders.length === 0 ? (
                    <div className="px-6 py-8 text-center text-sm text-gray-500">No orders yet.</div>
                  ) : (
                    <ul className="divide-y divide-gray-200">
                      {recentOrders.map((order) => (
                        <li key={order.id}>
                          <Link href={`/dashboard/orders/${order.id}`} className="flex items-center justify-between px-6 py-3 hover:bg-gray-50">
                            <div>
                              <p className="text-sm font-medium text-gray-900">#{order.orderNumber}</p>
                              <p className="text-xs text-gray-500">{order.customer ? `${order.customer.firstName} ${order.customer.lastName}` : "No customer"}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium text-gray-900">${order.totalAmount.toFixed(2)}</p>
                              <p className="text-xs text-gray-500 capitalize">{order.status}</p>
                            </div>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="bg-white shadow rounded-lg overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">Upcoming Events</h2>
                  </div>
                  {upcomingOrders.length === 0 ? (
                    <div className="px-6 py-8 text-center text-sm text-gray-500">No upcoming events.</div>
                  ) : (
                    <ul className="divide-y divide-gray-200">
                      {upcomingOrders.map((order) => (
                        <li key={order.id}>
                          <Link href={`/dashboard/orders/${order.id}`} className="flex items-center justify-between px-6 py-3 hover:bg-gray-50">
                            <div>
                              <p className="text-sm font-medium text-gray-900">{new Date(order.eventDate).toLocaleDateString()}</p>
                              <p className="text-xs text-gray-500">{order.customer ? `${order.customer.firstName} ${order.customer.lastName}` : "No customer"}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium text-gray-900">#{order.orderNumber}</p>
                              <p className="text-xs text-gray-500 capitalize">{order.status}</p>
                            </div>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
        </div>
      );
}
