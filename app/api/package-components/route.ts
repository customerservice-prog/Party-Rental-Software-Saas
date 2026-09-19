import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { requireCurrentOrganization } from "@/lib/tenant";
import { requirePermission, authzErrorResponse } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { getPackageComponents, getPackagesUsingComponent } from "@/lib/packages";

export async function GET(req: NextRequest) {
  const organization = await requireCurrentOrganization();
  try {
    await requirePermission(organization.id, "inventory.view");
  } catch (err) {
    return authzErrorResponse(err);
  }

  const packageItemId = req.nextUrl.searchParams.get("packageItemId");
  if (!packageItemId) return NextResponse.json({ error: "packageItemId is required" }, { status: 400 });

  const packageItem = await prisma.item.findFirst({
    where: { id: packageItemId, organizationId: organization.id },
    select: { id: true, name: true, quantity: true, cost: true },
  });
  if (!packageItem) return NextResponse.json({ error: "Package item not found" }, { status: 404 });

  const rows = await getPackageComponents(prisma, organization.id, packageItemId);
  const componentIds = rows.map((r) => r.componentItemId);
  const items = componentIds.length
    ? await prisma.item.findMany({
        where: { organizationId: organization.id, id: { in: componentIds } },
        select: { id: true, name: true, quantity: true, status: true, picture: true, cost: true },
      })
    : [];
  const itemMap = new Map(items.map((item) => [item.id, item]));

  return NextResponse.json({
    packageItem,
    components: rows.map((row) => ({ ...row, item: itemMap.get(row.componentItemId) || null })),
  });
}

export async function POST(req: NextRequest) {
  const organization = await requireCurrentOrganization();
  let user;
  try {
    user = await requirePermission(organization.id, "inventory.manage");
  } catch (err) {
    return authzErrorResponse(err);
  }

  const body = await req.json().catch(() => ({}));
  const packageItemId = typeof body.packageItemId === "string" ? body.packageItemId : "";
  const componentItemId = typeof body.componentItemId === "string" ? body.componentItemId : "";
  const quantity = Math.floor(Number(body.quantity));

  if (!packageItemId || !componentItemId) {
    return NextResponse.json({ error: "Package item and component item are required" }, { status: 400 });
  }
  if (packageItemId === componentItemId) {
    return NextResponse.json({ error: "An item cannot contain itself." }, { status: 400 });
  }
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10000) {
    return NextResponse.json({ error: "Component quantity must be a positive whole number." }, { status: 400 });
  }

  const [packageItem, componentItem] = await Promise.all([
    prisma.item.findFirst({ where: { id: packageItemId, organizationId: organization.id }, select: { id: true, name: true } }),
    prisma.item.findFirst({ where: { id: componentItemId, organizationId: organization.id }, select: { id: true, name: true } }),
  ]);
  if (!packageItem || !componentItem) {
    return NextResponse.json({ error: "One or more inventory items were not found." }, { status: 404 });
  }

  // Keep package math one-level and deterministic. Nested packages create
  // recursive availability/packing behavior, so reject them explicitly.
  const [componentChildren, packageParents] = await Promise.all([
    getPackageComponents(prisma, organization.id, componentItemId),
    getPackagesUsingComponent(prisma, organization.id, packageItemId),
  ]);
  if (componentChildren.length) {
    return NextResponse.json({ error: `"${componentItem.name}" is already a package. Nested packages are not supported.` }, { status: 409 });
  }
  if (packageParents.length) {
    return NextResponse.json({ error: `"${packageItem.name}" is currently used inside another package and cannot become a package itself.` }, { status: 409 });
  }

  const existing = await prisma.$queryRawUnsafe<{ id: string }[]>(
    `SELECT "id" FROM "PackageComponent"
     WHERE "organizationId"=$1 AND "packageItemId"=$2 AND "componentItemId"=$3
     LIMIT 1`,
    organization.id,
    packageItemId,
    componentItemId
  );

  const id = existing[0]?.id || randomUUID();
  if (existing.length) {
    await prisma.$executeRawUnsafe(
      `UPDATE "PackageComponent"
       SET "quantity"=$1,"updatedAt"=CURRENT_TIMESTAMP
       WHERE "id"=$2 AND "organizationId"=$3`,
      quantity,
      id,
      organization.id
    );
  } else {
    await prisma.$executeRawUnsafe(
      `INSERT INTO "PackageComponent"
       ("id","organizationId","packageItemId","componentItemId","quantity","createdAt","updatedAt")
       VALUES ($1,$2,$3,$4,$5,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`,
      id,
      organization.id,
      packageItemId,
      componentItemId,
      quantity
    );
  }

  await prisma.auditLog.create({
    data: {
      organizationId: organization.id,
      action: existing.length ? "package.component.updated" : "package.component.added",
      performedBy: user.id,
      details: JSON.stringify({ packageItemId, componentItemId, quantity }),
    },
  });

  return NextResponse.json({ success: true, id });
}

export async function DELETE(req: NextRequest) {
  const organization = await requireCurrentOrganization();
  let user;
  try {
    user = await requirePermission(organization.id, "inventory.manage");
  } catch (err) {
    return authzErrorResponse(err);
  }

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Component id is required" }, { status: 400 });

  const rows = await prisma.$queryRawUnsafe<{ id: string; packageItemId: string; componentItemId: string }[]>(
    `SELECT "id","packageItemId","componentItemId" FROM "PackageComponent"
     WHERE "id"=$1 AND "organizationId"=$2 LIMIT 1`,
    id,
    organization.id
  );
  if (!rows[0]) return NextResponse.json({ error: "Package component not found" }, { status: 404 });

  await prisma.$executeRawUnsafe(
    `DELETE FROM "PackageComponent" WHERE "id"=$1 AND "organizationId"=$2`,
    id,
    organization.id
  );
  await prisma.auditLog.create({
    data: {
      organizationId: organization.id,
      action: "package.component.removed",
      performedBy: user.id,
      details: JSON.stringify(rows[0]),
    },
  });
  return NextResponse.json({ success: true });
}
