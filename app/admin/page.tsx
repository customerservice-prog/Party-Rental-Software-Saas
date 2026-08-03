import { prisma } from "@/lib/prisma";

export default async function AdminOrganizationsPage() {
    const organizations = await prisma.organization.findMany({
          orderBy: { createdAt: "desc" },
          include: {
                  _count: { select: { users: true, customers: true, orders: true } },
          },
    });

  return (
        <div className="p-8">
              <h1 className="text-2xl font-bold text-gray-900 mb-6">
                      Tenant Organizations ({organizations.length})
              </h1>
        
              <div className="bg-white shadow rounded-lg overflow-hidden">
                      <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                            <tr>
                                                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Slug</th>
                                                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plan</th>
                                                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Users</th>
                                                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customers</th>
                                                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Orders</th>
                                                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                                            </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                  {organizations.length === 0 && (
                        <tr>
                                        <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                                                          No tenant organizations have signed up yet.
                                        </td>
                        </tr>
                                            )}
                                  {organizations.map((org) => (
                        <tr key={org.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{org.name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{org.slug}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{org.planTier}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                          <span
                                                                                className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                                                                                                        org.status === "active"
                                                                                                          ? "bg-green-100 text-green-700"
                                                                                                          : "bg-gray-100 text-gray-700"
                                                                                  }`}
                                                                              >
                                                            {org.status}
                                                          </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{org._count.users}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{org._count.customers}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{org._count.orders}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                          {new Date(org.createdAt).toLocaleDateString()}
                                        </td>
                        </tr>
                      ))}
                                </tbody>
                      </table>
              </div>
        </div>
      );
}
