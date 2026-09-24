import Link from "next/link";
import { requireCurrentOrganization } from "@/lib/tenant";
import { requirePermission } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import PackageBuilder from "./PackageBuilder";

export default async function PackagesPage() {
  const organization = await requireCurrentOrganization();
  await requirePermission(organization.id, "inventory.view");
  const [items, packageRows] = await Promise.all([
    prisma.item.findMany({
      where: { organizationId: organization.id },
      select: { id: true, name: true, quantity: true, cost: true, status: true, picture: true },
      orderBy: { name: "asc" },
    }),
    prisma.$queryRawUnsafe<{ packageItemId: string }[]>(
      'SELECT DISTINCT "packageItemId" FROM "PackageComponent" WHERE "organizationId"=$1',
      organization.id
    ).catch(() => []),
  ]);
  return <div className="friendly-admin-page is-wide">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <Link href="/dashboard/inventory" className="text-xs font-semibold text-[#1a6fd4]">← Inventory</Link>
        
        <h1 className="text-2xl font-bold text-dark">Packages & Components</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-500">Build customer-facing packages from physical inventory. Package availability automatically follows the lowest available component.</p>
      </div>
    </div>
    <PackageBuilder items={items} initialPackageIds={packageRows.map(r=>r.packageItemId)}/>
  </div>;
}
