import Link from "next/link";
import { requireCurrentOrganization } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
    const organization = await requireCurrentOrganization();
  const q = searchParams?.q?.trim() || "";

  const customers = await prisma.customer.findMany({
        where: {
          organizationId: organization.id,
          ...(q
            ? {
                OR: [
                  { firstName: { contains: q, mode: "insensitive" } },
                  { lastName: { contains: q, mode: "insensitive" } },
                  { email: { contains: q, mode: "insensitive" } },
                  { phone: { contains: q, mode: "insensitive" } },
                ],
              }
            : {}),
        },
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { orders: true } } },
  });

  return (
        <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                      <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
                      <Link
                                  href="/dashboard/customers/new"
                                  className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700"
                                >
                                Add Customer
                      </Link>
              </div>
        
              <form method="get" className="mb-4">
                <input
                  type="text"
                  name="q"
                  defaultValue={q}
                  placeholder="Search by name, email, or phone"
                  className="w-full max-w-md border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </form>
              <div className="bg-white shadow rounded-lg overflow-hidden">
                      <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                            <tr>
                                                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                                                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Orders</th>
                                                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                                            </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                  {customers.length === 0 && (
                        <tr>
                                        <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                                          No customers yet. Customers will appear here once they place an order or you add them manually.
                                        </td>
                        </tr>
                                            )}
                                  {customers.map((customer) => (
                        <tr key={customer.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                          <Link href={`/dashboard/customers/${customer.id}`} className="text-indigo-600 hover:underline">
                                                            {customer.firstName} {customer.lastName}
                                                          </Link>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{customer.email}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{customer.phone}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{customer._count.orders}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                          {new Date(customer.createdAt).toLocaleDateString()}
                                        </td>
                        </tr>
                      ))}
                                </tbody>
                      </table>
              </div>
        </div>
      );
}
