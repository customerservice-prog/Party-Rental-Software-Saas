import { requireCurrentOrganization } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import HomeCalendar from "./HomeCalendar";
import HomeTasks from "./HomeTasks";
import HomeWeather from "./HomeWeather";
import HomeScreen from "./HomeScreen";
import HomeMeetings from "./HomeMeetings";
import BestSellersChart from "./BestSellersChart";
import MonthlyPaymentsChart from "./MonthlyPaymentsChart";
import { getOrganizationWeather } from "@/lib/weather";

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
  const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

  const [
    itemCount,
    highValueItemCount,
    monthOrders,
    todaysOrders,
    recentOrderItems,
    recentOrders,
    upcomingOrders,
    weather,
    paymentOrders,
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
    getOrganizationWeather({
      city: organization.city,
      state: organization.state,
      zip: organization.zip,
      address: organization.address,
    }),
    prisma.order.findMany({
      where: {
        organizationId: organization.id,
        createdAt: { gte: twelveMonthsAgo },
        amountPaid: { gt: 0 },
      },
      select: { amountPaid: true, createdAt: true },
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
    .slice(0, 5)
    .map(([name, qty]) => ({ name, qty }));

  const monthlyPayments: { label: string; total: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
    monthlyPayments.push({ label, total: 0 });
  }
  paymentOrders.forEach((o) => {
    const d = new Date(o.createdAt);
    const monthsAgo = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
    const idx = 11 - monthsAgo;
    if (idx >= 0 && idx < monthlyPayments.length) {
      monthlyPayments[idx].total += o.amountPaid;
    }
  });
  const hasMonthlyPayments = monthlyPayments.some((p) => p.total > 0);

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
        <div className="lg:col-span-2 space-y-6">
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

          <HomeScreen />

          <HomeMeetings contactEmail={organization.contactEmail} />
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-md p-6 border-l-[6px] border-admin-green">
            <p className="text-base text-gray-500 font-medium">Collected Today</p>
            <p className="text-4xl font-bold text-dark mt-1">${collectedToday.toFixed(2)}</p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 border-l-[6px] border-secondary">
            <p className="text-base text-gray-500 font-medium">Inventory Count (items $65+)</p>
            <p className="text-4xl font-bold text-dark mt-1">{highValueItemCount}</p>
          </div>

          <HomeTasks />

          <div className="bg-white rounded shadow p-4">
            <h3 className="font-bold text-dark text-sm mb-3">Best Sellers (Last 60 Days)</h3>
            {bestSellers.length === 0 ? (
              <p className="text-sm text-gray-400">No rental activity in the last 60 days.</p>
            ) : (
              <BestSellersChart data={bestSellers} />
            )}
          </div>

          <HomeWeather weather={weather} />
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
                      <p className="text-sm font-medium text-gray-900">#{order.orderNumber.slice(-6)}</p>
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
                      <p className="text-sm font-medium text-gray-900">#{order.orderNumber.slice(-6)}</p>
                      <p className="text-xs text-gray-500 capitalize">{order.status}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="mt-8 bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Monthly Payments Received</h2>
        {!hasMonthlyPayments ? (
          <p className="text-sm text-gray-400">No payments recorded in the last 12 months.</p>
        ) : (
          <MonthlyPaymentsChart data={monthlyPayments} />
        )}
      </div>
    </div>
  );
}
