import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function AdminOrganizationsPage({
  searchParams,
}: {
  searchParams: { q?: string; status?: string };
}) {
  const q = searchParams.q?.trim() || "";
  const status = searchParams.status || "";

  const organizations = await prisma.organization.findMany({
    where: {
      slug: { not: "_platform_internal" },
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { slug: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(status ? { status } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { users: true, customers: true, orders: true } },
    },
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Tenant Organizations ({organizations.length})
        </h1>
        <Link href="/admin/audit-log" className="text-brand-600 hover:underline text-sm">
          View Audit Log
        </Link>
      </div>

      <form className="flex gap-3 mb-4" method="get">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Search by name or subdomain"
          className="border rounded p-2 text-sm flex-1"
        />
        <select name="status" defaultValue={status} className="border rounded p-2 text-sm">
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="trial">Trial</option>
        </select>
        <button type="submit" className="bg-brand-600 text-white rounded px-4 py-2 text-sm font-medium">
          Filter
        </button>
      </form>

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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {organizations.length === 0 && (
              <tr>
                <td colSpan={9} className="px-6 py-8 text-center text-gray-500">
                  No tenant organizations match this search.
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
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <Link href={`/admin/organizations/${org.id}`} className="text-brand-600 hover:underline">
                    Manage
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
