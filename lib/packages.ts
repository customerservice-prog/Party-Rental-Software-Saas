import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type PackageComponentRow = {
  id: string;
  organizationId: string;
  packageItemId: string;
  componentItemId: string;
  quantity: number;
  createdAt: Date;
  updatedAt: Date;
};

type Db = typeof prisma | Prisma.TransactionClient;

export async function getPackageComponents(db: Db, organizationId: string, packageItemId: string) {
  return db.$queryRawUnsafe<PackageComponentRow[]>(
    `SELECT * FROM "PackageComponent"
     WHERE "organizationId"=$1 AND "packageItemId"=$2
     ORDER BY "createdAt" ASC`,
    organizationId,
    packageItemId
  );
}

export async function getPackagesUsingComponent(db: Db, organizationId: string, componentItemId: string) {
  return db.$queryRawUnsafe<PackageComponentRow[]>(
    `SELECT * FROM "PackageComponent"
     WHERE "organizationId"=$1 AND "componentItemId"=$2
     ORDER BY "createdAt" ASC`,
    organizationId,
    componentItemId
  );
}

export async function getInventoryResourceIds(db: Db, organizationId: string, itemIds: string[]) {
  const ids = new Set(itemIds);
  for (const itemId of itemIds) {
    const rows = await getPackageComponents(db, organizationId, itemId);
    for (const row of rows) ids.add(row.componentItemId);
  }
  return [...ids].sort();
}


export async function getRequestedResourceDemand(
  db: Db,
  organizationId: string,
  lines: { itemId: string; quantity: number }[]
) {
  const demand = new Map<string, number>();
  for (const line of lines) {
    demand.set(line.itemId, (demand.get(line.itemId) || 0) + line.quantity);
    const components = await getPackageComponents(db, organizationId, line.itemId);
    for (const component of components) {
      demand.set(
        component.componentItemId,
        (demand.get(component.componentItemId) || 0) + line.quantity * component.quantity
      );
    }
  }
  return demand;
}
