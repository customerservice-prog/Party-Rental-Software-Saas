import { requireCurrentOrganization } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import HomeCalendar from "./HomeCalendar";
import HomeTasks from "./HomeTasks";

function monthRange(year: number, month: number) {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 1);
  return { start, end };
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfToday() {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

export default async function DashboardHomePage({
  searchParams,
}: {
  searchParams: { year?: string; month?: string };
}) {
  const organization = await requireCurrentOrganization();

  const now = new Date();
  const year = searchParams.year ? parseInt(searchParams.year, 10) : now.getFullYear();
  const month = searchParams.month ? parseInt(searchParams.month, 10) : now.getMonth();
  const { start, end } = monthRange(year, month);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  const [
    itemCount,
    highValueItemCount,
    monthOrders,
    todaysOrders,
    recentOrderItems,
    recentOrders,
    upcomingOrders,
  ] = await Promise.all([
    prisma.item.count({ where: { organizationId: organization.id } }),
    prisma.item.count({ where: { organizationId: organization.id, cost: { gte: 65 } } }),
    prisma.order.findMany({
      where: { organizationId: organization.id, eventDate: { gte: start, lt: end } },
      select: { id: true, status: true, deliveryType: true, eventDate: true },
      orderBy: { eventDate: "asc" },
    }),
    prisma.order.findMany({
      where: {
        organizationId: organization.id,
        updatedAt: { gte: startOfToday(), lte: endOfToday() },
      },
      select: { amountPaid: true },
    }),
    prisma.orderItem.findMany({
      where: {
        order: { organizationId: organization.id, createdAt: { gte: sixtyDaysAgo } },
      },
      select: { quantity: true, item: { select: { name: true } } },
    }),
    prisma.order.findMany({
      where: { organizationId: organization.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { customer: true },
    }),
    prisma.order.findMany({
      where: { organizationId: organization.id, eventDate: { gte: now } },
      orderBy: { eventDate: "asc" },
      take: 5,
      include: { customer: true },
    }),
  ]);

  const collectedToday = todaysOrders.reduce((sum, o) => sum + o.amountPaid, 0);

  const bestSellerMap = new Map<string, number>();
  recentOrderItems.forEach((oi) => {
    const name = oi.item ? oi.item.name : "Unknown item";
    bestSellerMap.set(name, (bestSellerMap.get(name) || 0) + oi.quantity);
  });
  const bestSellers = Array.from(bestSellerMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const maxBestSeller = bestSellers.length > 0 ? bestSellers[0][1] : 0;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Home</h1>

      {itemCount === 0 && (
        <div className="mb-6 rounded-md bg-indigo-50 border border-indigo-200 p-4 text-sm">
          <span className="font-medium">Finish setting up your business.</span>{" "}
          <Link href="/onboarding" className="text-indigo-600 underline">
            Complete onboarding
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <HomeCalendar
            year={year}
            month={month}
            orders={monthOrders.map((o) => ({
              id: o.id,
              status: o.status,
              deliveryType: o.deliveryType,
              eventDate: o.eventDate.toISOString(),
            }))}
          />
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-600">
            <div className="text-sm text-gray-500">Collected Today</div>
            <div className="text-3xl font-bold text-gray-900">${collectedToday.toFixed(2)}</div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-600">
            <div className="text-sm text-gray-500">Inventory Count (items $65+)</div>
            <div className="text-3xl font-bold text-gray-900">{highValueItemCount}</div>
          </div>

          <HomeTasks />

          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="font-semibold text-gray-900 mb-3">Best Sellers (Last 60 Days)</h2>
            {bestSellers.length === 0 ? (
              <p className="text-sm text-gray-400">No rental activity in the last 60 days.</p>
            ) : (
              <div className="space-y-2">
                {bestSellers.map(([name, qty]) => (
                  <div key={name} className="flex items-center gap-2 text-xs">
                    <div className="w-24 shrink-0 text-gray-600 truncate">{name}</div>
                    <div className="flex-1 bg-gray-100 rounded h-3 overflow-hidden">
                      <div
                        className="bg-green-700 h-3 rounded"
                        style={{
                          width: (maxBestSeller > 0 ? (qty / maxBestSeller) * 100 : 0) + "%",
                        }}
                      />
                    </div>
                    <div className="w-8 text-right text-gray-600">{qty}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
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
                  <Link
                    href={"/dashboard/orders/" + order.id}
                    className="flex items-center justify-between px-6 py-3 hover:bg-gray-50"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">#{order.orderNumber}</p>
                      <p className="text-xs text-gray-500">
                        {order.customer ? order.customer.firstName + " " + order.customer.lastName : "No customer"}
                      </p>
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
                  <Link
                    href={"/dashboard/orders/" + order.id}
                    className="flex items-center justify-between px-6 py-3 hover:bg-gray-50"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {new Date(order.eventDate).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-gray-500">
                        {order.customer ? order.customer.firstName + " " + order.customer.lastName : "No customer"}
                      </p>
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
