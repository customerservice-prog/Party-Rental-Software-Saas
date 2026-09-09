import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CATALOG_TEMPLATE_TYPES, isValidCatalogCategoryKey } from "@/lib/catalogTemplates";

// Full management surface for individual global CatalogTemplate rows,
// backing the Platform Admin > Catalog Templates page
// (app/admin/catalog-templates). Distinct from the bulk /seed endpoint -
// lets a platform admin add or fix a single template without touching
// lib/catalogTemplateSeedData.ts and redeploying. CatalogTemplate rows have
// no organizationId and are never tenant data, so this never touches any
// tenant's own inventory. Properly gated to platform_admin (unlike the
// older /seed endpoint's temporary owner-only fallback) since this is new
// surface being built after the /admin section and platform_admin role
// already existed.
async function requireAdmin() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { role?: string } | undefined;
  if (!user || user.role !== "platform_admin") {
    return null;
  }
  return session;
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// Lists every template (active and inactive) for the admin table - unlike
// the tenant-facing /api/catalog-templates browse endpoint (which only
// returns isActive templates), this intentionally includes inactive rows
// so an admin can review and reactivate them.
export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const templates = await prisma.catalogTemplate.findMany({
    orderBy: [{ categoryKey: "asc" }, { sortOrder: "asc" }],
  });
  return NextResponse.json({ templates });
}

// Creates one new global template. Never fabricates a price or quantity -
// those only ever come from a tenant when they add this template to their
// own inventory (see app/api/catalog-templates/add/route.ts).
export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const name = String(body.name || "").trim();
  const categoryKey = String(body.categoryKey || "").trim();
  const type = String(body.type || "rental").trim();
  const description = body.description ? String(body.description).trim() : null;
  const keywords = Array.isArray(body.keywords)
    ? body.keywords.map((k: unknown) => String(k).trim()).filter(Boolean)
    : [];
  const sortOrder = Number.isFinite(body.sortOrder) ? Number(body.sortOrder) : 0;

  if (!name) return NextResponse.json({ error: "Name is required." }, { status: 400 });
  if (!isValidCatalogCategoryKey(categoryKey)) {
    return NextResponse.json({ error: "Invalid category." }, { status: 400 });
  }
  if (!CATALOG_TEMPLATE_TYPES.includes(type as (typeof CATALOG_TEMPLATE_TYPES)[number])) {
    return NextResponse.json({ error: "Invalid type." }, { status: 400 });
  }

  const baseSlug = slugify(categoryKey + "-" + name);
  let slug = baseSlug;
  let suffix = 2;
  while (await prisma.catalogTemplate.findUnique({ where: { slug } })) {
    slug = baseSlug + "-" + suffix;
    suffix += 1;
  }

  const template = await prisma.catalogTemplate.create({
    data: { slug, name, categoryKey, type, description, keywords, sortOrder, isActive: true },
  });

  return NextResponse.json({ template });
}
