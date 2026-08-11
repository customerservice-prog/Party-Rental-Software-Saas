import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCurrentOrganization } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import DeleteCustomerButton from "@/app/dashboard/customers/DeleteCustomerButton";

export default async function CustomerDetailPage({
    params,
}: {
    params: { id: string };
}) {
    const organization = await requireCurrentOrganization();

  const customer = await prisma.customer.findFirst({
        where: { id: params.id, organizationId: organization.id },
        include: {
                orders: {
                          orderBy: { createdAt: "desc" },
                },
        },
  });

  if (!customer) {
        notFound();
  }

  return (
        <div className="p-8">
              <Link href="/dashboard/customers" className="text-sm text-indigo-600 hover:underline">
                      &larr; Back to Customers
              </Link>
        
              <div className="mt-4 bg-white shadow rounded-lg p-6">
                      <h1 className="text-2xl font-bold text-gray-900">
                        {customer.firstName} {customer.lastName}
                      </h1>
                      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-700">
                                <div>
                                            <span className="font-medium text-gray-500">Email:</span> {customer.email}
                                </div>
                                <div>
                                            <span className="font-medium text-gray-500">Phone:</span> {customer.phone}
                                </div>
                                <div className="sm:col-span-2">
                                            <span className="font-medium text-gray-500">Address:</span> {customer.address}
                                </div>
                                <div>
                                            <span className="font-medium text-gray-500">Lead source:</span> {customer.leadSource}
                                </div>
                                <div>
                                            <span className="font-medium text-gray-500">Customer since:</span>{" "}
                                  {new Date(customer.createdAt).toLocaleDateString()}
                                </div>
                      </div>
                      <DeleteCustomerButton
                        customerId={customer.id}
                        customerName={customer.firstName + " " + customer.lastName}
                      />
              </div>
        
              <div className="mt-6 bg-white shadow rounded-lg overflow-hidden">
                      <div className="px-6 py-4 border-b border-gray-200">
                                <h2 className="text-lg font-semibold text-gray-900">Order History</h2>
                      </div>
                      <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                            <tr>
                                                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order #</th>
                                                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Event Date</th>
                                                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                                            </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                  {customer.orders.length === 0 && (
                        <tr>
                                        <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                                                          This customer has no orders yet.
                                        </td>
                        </tr>
                                            )}
                                  {customer.orders.map((order) => (
                        <tr key={order.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                          <Link href={`/dashboard/orders/${order.id}`} className="text-indigo-600 hover:underline">
                                                                              #{order.id.slice(0, 8)}
                                                          </Link>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                          {new Date(order.eventDate).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{order.status}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${order.totalAmount.toFixed(2)}</td>
                        </tr>
                      ))}
                                </tbody>
                      </table>
              </div>
        </div>
      );
}
