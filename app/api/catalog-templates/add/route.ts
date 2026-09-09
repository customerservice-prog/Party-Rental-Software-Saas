import { NextRequest, NextResponse } from "next/server";
import { requireCurrentOrganization } from "@/lib/tenant";
import { requirePermission, authzErrorResponse } from "@/lib/authz";
import { logActivity } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { catalogCategoryLabel, UNLIMITED_QUANTITY_SENTINEL } from "@/lib/catalogTemplates";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

type Selection = {
  templateId: string;
  quantity?: number;
  price?: number;
  displayToCustomer?: boolean;
};

// Creates real, tenant-owned Category/Item rows from selected global
// CatalogTemplate rows. This is the ONLY place a tenant's inventory is
// ever created from the catalog - browsing (GET /api/catalog-templates) is
// read-only and makes no tenant data.
//
// Guarantees enforced here (see lib/catalogTemplates.ts + prisma/schema.prisma
// comments for the full rationale):
//   - organizationId is resolved server-side from the session, never from
//     the request body.
//   - quantity/price are NEVER fabricated - if the tenant didn't type a
//     value, it is stored as 0 (not owned / not priced yet), never a
//     guessed market price or a fabricated owned count. The one exception
//     is "service" and "consumable" type templates, which get a very high
//     sentinel quantity so the date-based availability engine
//     (lib/availability.ts) never treats a service as "out of stock" -
//     see UNLIMITED_QUANTITY_SENTINEL.
//   - displayToCustomer is always created as false - a tenant must
//     explicitly publish an item to their storefront afterward from the
//     Inventory page. Nothing added from the catalog is ever auto-published.
//   - idempotent: if the tenant already has an item whose slug would
//     collide (whether it came from a previous catalog add or was created
//     manually), that selection is skipped and reported back rather than
//     erroring the whole batch or creating a duplicate. Submitting the
//     same selections twice (e.g. a double-click or page refresh) is safe.
export async function POST(req: NextRequest) {
  const organization = await requireCurrentOrganization();
  let sessionUser;
  try {
    sessionUser = await requirePermission(organization.id, "inventory.manage");
  } catch (err) {
    return authzErrorResponse(err);
  }

  const body = await req.json();
  const rawSelections = Array.isArray(body.selections) ? body.selections : [];
  const selections: Selection[] = rawSelections
    .filter((s: unknown): s is Selection => !!s && typeof (s as Selection).templateId === "string")
    .slice(0, 200);

  if (selections.length === 0) {
    return NextResponse.json({ error: "No templates selected" }, { status: 400 });
  }

  const templateIds = selections.map((s) => s.templateId);
  const templates = await prisma.catalogTemplate.findMany({
    where: { id: { in: templateIds }, isActive: true },
  });
  const templateById = new Map(templates.map((t) => [t.id, t]));

  const existingCategories = await prisma.category.findMany({
    where: { organizationId: organization.id },
  });
  const categoryByName = new Map(existingCategories.map((c) => [c.name.toLowerCase(), c]));
  let categorySortOrder = existingCategories.length;

  const created: { id: string; name: string }[] = [];
  const skipped: { name: string; reason: string }[] = [];

  for (const selection of selections) {
    const template = templateById.get(selection.templateId);
    if (!template) {
      skipped.push({ name: selection.templateId, reason: "Template not found" });
      continue;
    }

    const slug = slugify(template.name);
    const existingItem = await prisma.item.findFirst({
      where: { organizationId: organization.id, slug },
    });
    if (existingItem) {
      skipped.push({ name: template.name, reason: "Already in your inventory" });
      continue;
    }

    const categoryLabel = catalogCategoryLabel(template.categoryKey);
    let category = categoryByName.get(categoryLabel.toLowerCase());
    if (!category) {
      category = await prisma.category.create({
        data: {
          organizationId: organization.id,
          name: categoryLabel,
          slug: slugify(categoryLabel),
          sortOrder: categorySortOrder++,
        },
      });
      categoryByName.set(categoryLabel.toLowerCase(), category);
    }

    const isUnlimitedType = template.type === "service" || template.type === "consumable";
    const requestedQuantity =
      typeof selection.quantity === "number" && !Number.isNaN(selection.quantity) && selection.quantity >= 0
        ? Math.floor(selection.quantity)
        : undefined;
    const quantity = requestedQuantity ?? (isUnlimitedType ? UNLIMITED_QUANTITY_SENTINEL : 0);

    const price =
      typeof selection.price === "number" && !Number.isNaN(selection.price) && selection.price >= 0
        ? selection.price
        : 0;

    const item = await prisma.item.create({
      data: {
        organizationId: organization.id,
        categoryId: category.id,
        name: template.name,
        slug,
        cost: price,
        quantity,
        displayToCustomer: false,
        sourceTemplateId: template.id,
        sourceTemplateName: template.name,
      },
    });
    created.push({ id: item.id, name: item.name });
  }

  if (created.length > 0) {
    await logActivity({
      organizationId: organization.id,
      performedBy: sessionUser.id,
      action: "Added items from Party Rental CRM Catalog",
      details: created.length + " item(s): " + created.map((c) => c.name).join(", "),
    });
  }

  return NextResponse.json({ created, skipped });
}
