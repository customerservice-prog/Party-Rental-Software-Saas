import Link from "next/link";
import { prisma } from "@/lib/prisma";

// This page depends on live database state and must never be evaluated during
// `next build`. Railway's build container cannot reliably reach the private
// production Postgres hostname, and an audit log is inherently request-time data.
export const dynamic = "force-dynamic";
export const revalidate = 0;

type AuditRow = { id: string; organizationId: string | null; action: string; details: string | null; performedBy: string; createdAt: Date };
type OrgRow = { id: string; name: string };

export default async function AdminAuditLogPage() {
  const logs: AuditRow[] = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const orgIds = Array.from(
    new Set(logs.map((l) => l.organizationId).filter((id): id is string => !!id))
  );

  const orgs: OrgRow[] = orgIds.length
    ? await prisma.organization.findMany({
        where: { id: { in: orgIds } },
        select: { id: true, name: true },
      })
    : [];

  const orgNameById = new Map(orgs.map((o) => [o.id, o.name]));

  return (
    <div className="p-8">
      <Link href="/admin" className="text-brand-600 hover:underline text-sm">
        &larr; Back to all organizations
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 mt-4 mb-6">Audit Log</h1>

      <div className="bg-white shadow rounded-lg overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">When</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Organization</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Performed By</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {logs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">No admin actions have been recorded yet.</td>
              </tr>
            )}
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(log.createdAt).toLocaleString()}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{log.organizationId ? orgNameById.get(log.organizationId) || "Unknown" : "-"}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{log.action}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{log.details || "-"}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{log.performedBy}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
