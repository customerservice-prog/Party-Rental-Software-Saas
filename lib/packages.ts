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
