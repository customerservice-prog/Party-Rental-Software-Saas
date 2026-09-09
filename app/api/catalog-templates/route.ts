import { NextRequest, NextResponse } from "next/server";
import { requireCurrentOrganization } from "@/lib/tenant";
import { requirePermission, authzErrorResponse } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { CATALOG_CATEGORIES, catalogCategoryLabel } from "@/lib/catalogTemplates";

// Collapses a string down to just lowercase letters/digits so differences in
// punctuation, spacing, and formatting never cause an otherwise-matching
// template to be missed - e.g. a search for "20x20 pole" should still find
// "20' x 20' Pole Tent", and "wet dry jumper" should still find "Wet/Dry
// Combo Bounce House". Never used to fabricate or infer anything about a
// tenant's own inventory - purely a text-matching aid for this browse
// endpoint.
function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

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
    },
    orderBy: [{ categoryKey: "asc" }, { sortOrder: "asc" }],
  });

  let results = templates;
  if (q) {
    // Every word the tenant typed must match somewhere in the template's
    // name, category label, or internal search keywords - not just as one
    // literal substring of the raw query - so multi-word and
    // differently-punctuated queries still find the right template. This
    // never changes what a template *is*, only what surfaces it in search.
    const tokens = q.split(/s+/).map(normalize).filter(Boolean);
    results = templates.filter((t) => {
      const keywordList = Array.isArray(t.keywords) ? (t.keywords as unknown[]) : [];
      const haystack = normalize(
        [t.name, catalogCategoryLabel(t.categoryKey), ...keywordList.map((k) => String(k))].join(" ")
      );
      return tokens.every((tok) => haystack.includes(tok));
    });

    // Rank closer name matches first so the most relevant items surface at
    // the top once a search is active, instead of relying on category and
    // sortOrder alone.
    const normalizedQuery = normalize(q);
    results = results.slice().sort((a, b) => {
      const aName = normalize(a.name);
      const bName = normalize(b.name);
      const aScore = aName === normalizedQuery ? 0 : aName.startsWith(normalizedQuery) ? 1 : 2;
      const bScore = bName === normalizedQuery ? 0 : bName.startsWith(normalizedQuery) ? 1 : 2;
      if (aScore !== bScore) return aScore - bScore;
      return a.sortOrder - b.sortOrder;
    });
  }

  return NextResponse.json({ templates: results.slice(0, limit), categories: CATALOG_CATEGORIES });
}
