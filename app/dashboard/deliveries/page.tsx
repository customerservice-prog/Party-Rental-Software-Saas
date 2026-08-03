import { requireCurrentOrganization } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import AssignDriverSelect from "./assign-driver-select";

export default async function DeliveriesPage() {
    const organization = await requireCurrentOrganization();

  const [orders, drivers] = await Promise.all([
        prisma.order.findMany({
                where: { organizationId: organization.id },
                orderBy: { eventDate: "asc" },
                include: { customer: true, deliveryDriver: true },
        }),
        prisma.driver.findMany({
                where: { organizationId: organization.id, isActive: true },
                orderBy: { name: "asc" },
        }),
      ]);

  return (
        <div className="p-8">
              <h1 className="text-2xl font-bold text-gray-900 mb-6">Deliveries & Routing</h1>
        
              <div className="bg-white shadow rounded-lg overflow-hidden">
                      <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                            <tr>
                                                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Event Date</th>
                                                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                                                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Delivery Address</th>
                                                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Driver</th>
                                            </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                  {orders.length === 0 && (
                        <tr>
                                        <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                                          No orders scheduled for delivery yet.
                                        </td>
                        </tr>
                                            )}
                                  {orders.map((order) => (
                        <tr key={order.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                          {new Date(order.eventDate).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                          {order.customer.firstName} {order.customer.lastName}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                          {order.deliveryAddress || order.customer.address || "—"}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.status}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                          <AssignDriverSelect
                                                                                orderId={order.id}
                                                                                drivers={drivers}
                                                                                currentDriverId={order.deliveryDriverId}
                                                                              />
                                        </td>
                        </tr>
                      ))}
                                </tbody>
                      </table>
              </div>
        </div>
      );
}
