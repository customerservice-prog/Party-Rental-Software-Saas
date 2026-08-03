import { requireCurrentOrganization } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";

export default async function OrdersPage() {
    const organization = await requireCurrentOrganization();

  const orders = await prisma.order.findMany({
        where: { organizationId: organization.id },
        include: { customer: true },
        orderBy: { eventDate: "desc" },
        take: 50,
  });

  return (
        <div>
              <h1 className="text-2xl font-bold mb-6">Orders</h1>
        
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
                                    <td className="py-2 px-3">{order.orderNumber}</td>
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
