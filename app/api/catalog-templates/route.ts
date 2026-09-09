import { NextRequest, NextResponse } from "next/server";
import { requireCurrentOrganization } from "@/lib/tenant";
import { requirePermission, authzErrorResponse } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { CATALOG_CATEGORIES } from "@/lib/catalogTemplates";

// Tenant-facing read-only browse endpoint for the global "Party Rental CRM
// Catalog" (see CatalogTemplate in prisma/schema.prisma). Any signed-in
// tenant staff member with inventory.view can browse templates - browsing
// is not sensitive since templates carry no organizationId and no
// tenant-specific data. Only the separate add/route.ts (which actually
// creates tenant-owned Items) requires inventory.manage.
export async function GET(req: NextRequest) {
  const organization = await requireCurrentOrganization();
  try {
    await requirePermission(organization.id, "inventory.view");
  } catch (err) {
    return authzErrorResponse(err);
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() || "";
  const categoryKey = searchParams.get("categoryKey") || "";
  const type = searchParams.get("type") || "";
  const limit = Math.min(parseInt(searchParams.get("limit") || "200", 10) || 200, 500);

  const templates = await prisma.catalogTemplate.findMany({
    where: {
      isActive: true,
      ...(categoryKey ? { categoryKey } : {}),
      ...(type ? { type } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { categoryKey: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: [{ categoryKey: "asc" }, { sortOrder: "asc" }],
    take: limit,
  });

  return NextResponse.json({ templates, categories: CATALOG_CATEGORIES });
}
