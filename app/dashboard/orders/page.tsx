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
  const validStatuses = ["pending", "confirmed", "cancelled", "completed"];
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
        <h1 className="text-2xl font-bold">Orders</h1>
        <div className="flex gap-2">
          <a
            href="/api/orders/export"
            className="bg-white text-gray-700 border border-gray-300 rounded px-4 py-2 text-sm font-medium hover:bg-gray-50"
          >
            Export CSV
          </a>
          <Link href="/dashboard/orders/new" className="bg-blue-600 hover:bg-blue-700 text-white rounded px-4 py-2 text-sm font-medium">New Order</Link>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {[
          { label: "All", value: "" },
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
        
          {orders.length === 0 && (
                  <p className="text-gray-500">No orders yet.</p>
              )}
        
              <table className="w-full text-sm text-left border">
                      <thead>
                                <tr className="text-gray-500 border-b bg-gray-50">
                                            <th className="py-2 px-3">Order #</th>
                                            <th className="py-2 px-3">Customer</th>
                                            <th className="py-2 px-3">Event Date</th>
                                            <th className="py-2 px-3">Status</th>
                                            <th className="py-2 px-3">Total</th>
                                            <th className="py-2 px-3">Paid</th>
                                </tr>
                      </thead>
                      <tbody>
                        {orders.map((order) => (
                      <tr key={order.id} className="border-b last:border-0">
                                    <td className="py-2 px-3">
                      <Link href={"/dashboard/orders/" + order.id} className="text-brand-600 hover:underline">
                        {order.orderNumber}
                      </Link>
                    </td>
                                    <td className="py-2 px-3">
                                      {order.customer.firstName} {order.customer.lastName}
                                    </td>
                                    <td className="py-2 px-3">
                                      {order.eventDate.toDateString()}
                                    </td>
                                    <td className="py-2 px-3 capitalize">{order.status}</td>
                                    <td className="py-2 px-3">${order.totalAmount.toFixed(2)}</td>
                                    <td className="py-2 px-3">${order.amountPaid.toFixed(2)}</td>
                      </tr>
                    ))}
                      </tbody>
              </table>
        </div>
      );
}
