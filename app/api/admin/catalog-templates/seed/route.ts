import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CATALOG_TEMPLATE_SEED_DATA } from "@/lib/catalogTemplateSeedData";
import { isValidCatalogCategoryKey } from "@/lib/catalogTemplates";

// Applies/updates the platform's global CatalogTemplate catalog from the
// curated data in lib/catalogTemplateSeedData.ts. Idempotent (upsert by
// slug), safe to run repeatedly, and never touches any tenant's
// organizationId-scoped data - CatalogTemplate rows have no organizationId.
//
// Temporary owner-only utility, matching the existing precedent in
// app/api/admin/sync-schema/route.ts: this platform has no platform_admin
// account provisioned yet, so - like that route - this is restricted to
// any authenticated "owner" rather than requirePlatformAdmin(). Switch this
// to requirePlatformAdmin() once a platform admin account exists.
export async function POST() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { role?: string } | undefined;
  if (!user || user.role !== "owner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let created = 0;
  let updated = 0;
  const invalidCategoryKeys = new Set<string>();

  for (const template of CATALOG_TEMPLATE_SEED_DATA) {
    if (!isValidCatalogCategoryKey(template.categoryKey)) {
      invalidCategoryKeys.add(template.categoryKey);
      continue;
    }
    const existing = await prisma.catalogTemplate.findUnique({ where: { slug: template.slug } });
    await prisma.catalogTemplate.upsert({
      where: { slug: template.slug },
      create: {
        slug: template.slug,
        name: template.name,
        categoryKey: template.categoryKey,
        type: template.type,
        sortOrder: template.sortOrder,
        keywords: template.keywords ?? [],
      },
      update: {
        name: template.name,
        categoryKey: template.categoryKey,
        type: template.type,
        sortOrder: template.sortOrder,
        keywords: template.keywords ?? [],
      },
    });
    if (existing) updated += 1;
    else created += 1;
  }

  const total = await prisma.catalogTemplate.count();

  return NextResponse.json({
    ok: true,
    created,
    updated,
    total,
    invalidCategoryKeys: Array.from(invalidCategoryKeys),
  });
}

// Lets the catalog browser (and this seed tool) check current counts
// without requiring auth, since template data is not sensitive - it is
// global, read-only platform reference data.
export async function GET() {
  const total = await prisma.catalogTemplate.count();
  const byCategory = await prisma.catalogTemplate.groupBy({
    by: ["categoryKey"],
    _count: { _all: true },
  });
  return NextResponse.json({ total, byCategory });
}
