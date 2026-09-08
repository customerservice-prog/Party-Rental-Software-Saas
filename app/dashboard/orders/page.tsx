import Link from "next/link";
import { requireCurrentOrganization } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
    const organization = await requireCurrentOrganization();

  const statusFilter = searchParams?.status?.trim() || "";
  const validStatuses = ["quote", "pending", "confirmed", "cancelled", "completed"];
  const statusWhere = validStatuses.includes(statusFilter) ? { status: statusFilter } : {};

  const orders = await prisma.order.findMany({
        where: { organizationId: organization.id, ...statusWhere },
        include: { customer: true },
        orderBy: { eventDate: "desc" },
        take: 50,
  });

  return (
    <div>
    <div className="flex items-center justify-between mb-6">
    <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
    <div className="flex gap-2">
    <a
      href={statusFilter ? `/api/orders/export?status=${encodeURIComponent(statusFilter)}` : "/api/orders/export"}
      className="bg-white text-gray-700 border border-gray-300 rounded-md px-4 py-2 text-sm font-medium hover:bg-gray-50"
      >
    Export CSV
    </a>
    <Link href="/dashboard/orders/new" className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700">
    New Order
    </Link>
    </div>
    </div>
    
    <div className="mb-6 flex flex-wrap gap-2">
      {[
      { label: "All", value: "" },
      { label: "Quote", value: "quote" },
      { label: "Pending", value: "pending" },
      { label: "Confirmed", value: "confirmed" },
      { label: "Completed", value: "completed" },
      { label: "Cancelled", value: "cancelled" },
      ].map((tab) => (
        <Link
          key={tab.value || "all"}
          href={tab.value ? `/dashboard/orders?status=${tab.value}` : "/dashboard/orders"}
          className={`px-3 py-1.5 rounded-md text-sm font-medium border ${
            statusFilter === tab.value
            ? "bg-indigo-600 text-white border-indigo-600"
            : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
          }`}
          >
          {tab.label}
        </Link>
        ))}
    </div>
    
    <div className="bg-white shadow rounded-lg overflow-hidden">
    <table className="min-w-full divide-y divide-gray-200">
    <thead className="bg-gray-50">
    <tr>
    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order #</th>
    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Event Date</th>
    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paid</th>
    </tr>
    </thead>
    <tbody className="bg-white divide-y divide-gray-200">
      {orders.length === 0 && (
      <tr>
      <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
      No orders yet.
      </td>
      </tr>
    )}
      {orders.map((order) => (
      <tr key={order.id} className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
      <Link href={"/dashboard/orders/" + order.id} className="text-indigo-600 hover:underline">
        {order.orderNumber}
      </Link>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {order.customer.firstName} {order.customer.lastName}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {order.eventDate.toDateString()}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{order.status}</td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${order.totalAmount.toFixed(2)}</td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${order.amountPaid.toFixed(2)}</td>
      </tr>
      ))}
    </tbody>
    </table>
    </div>
    </div>
    );
}
