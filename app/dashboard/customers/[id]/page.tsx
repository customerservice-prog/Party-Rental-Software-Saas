import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCurrentOrganization } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import DeleteCustomerButton from "@/app/dashboard/customers/DeleteCustomerButton";
import CustomerNotes from "@/app/dashboard/customers/CustomerNotes";

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

  const customerMessages = await prisma.sentMessage.findMany({
    where: { organizationId: organization.id, customerId: customer.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

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
                      <div className="mt-4">
                        <Link
                          href={`/dashboard/messages?customerId=${customer.id}&to=${encodeURIComponent(customer.email)}&name=${encodeURIComponent(customer.firstName + " " + customer.lastName)}`}
                          className="inline-block bg-indigo-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-indigo-700"
                        >
                          Message this customer
                        </Link>
                      </div>
              </div>
        
              <div className="mt-6 bg-white shadow rounded-lg p-6">
                      <h2 className="text-lg font-semibold text-gray-900 mb-3">Notes</h2>
                      <CustomerNotes
                        customerId={customer.id}
                        initialNotes={customer.notes || ""}
                      />
              </div>

            <div className="mt-6 bg-white shadow rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Message History</h2>
                <span className="text-sm text-gray-500">{customerMessages.length} message{customerMessages.length === 1 ? "" : "s"}</span>
              </div>
              {customerMessages.length === 0 ? (
                <div className="px-6 py-8 text-center text-sm text-gray-500">
                  No messages have been sent to this customer yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Channel</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {customerMessages.map((msg) => (
                        <tr key={msg.id}>
                          <td className="px-4 py-2 text-sm text-gray-700 whitespace-nowrap">{new Date(msg.createdAt).toLocaleString()}</td>
                          <td className="px-4 py-2 text-sm text-gray-700 uppercase">{msg.channel}</td>
                          <td className="px-4 py-2 text-sm text-gray-700">{msg.channel === "sms" ? "(SMS)" : (msg.subject || "-")}</td>
                          <td className="px-4 py-2 text-sm">
                            <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 capitalize">{msg.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
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
