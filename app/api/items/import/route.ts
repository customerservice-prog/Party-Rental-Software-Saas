import { NextRequest, NextResponse } from "next/server";
import { requireCurrentOrganization } from "@/lib/tenant";
import { requirePermission, authzErrorResponse } from "@/lib/authz";
import { logActivity } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { parseCsv } from "@/lib/csv";

const MAX_ROWS = 1000;
const MAX_CSV_LENGTH = 2_000_000;

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase();
}

// Imports a tenant's OWN existing inventory spreadsheet (e.g. exported from
// another system, or re-imported from our own "Export CSV"). Unlike the
// global catalog "Add from Catalog" flow, this data was explicitly typed
// by the tenant into their own file - so it is never fabricated, and
// quantity/price/visibility are read directly from the file (defaulting to
// the same defaults as manual item creation - see app/api/items/route.ts
// POST - only when a column is missing or a cell is blank).
//
// Safety: idempotent by name-derived slug (re-importing the same file
// skips rows that already exist rather than creating duplicates), caps
// rows processed per request, and reports every row's outcome (created /
// skipped / row-level error) so a partial problem never silently loses
// data. Organization scope is always resolved server-side from the
// session, never from the uploaded file.
export async function POST(req: NextRequest) {
  const organization = await requireCurrentOrganization();
  let sessionUser;
  try {
    sessionUser = await requirePermission(organization.id, "inventory.manage");
  } catch (err) {
    return authzErrorResponse(err);
  }

  const body = await req.json();
  const csv = typeof body.csv === "string" ? body.csv : "";
  if (!csv.trim()) {
    return NextResponse.json({ error: "No CSV content received." }, { status: 400 });
  }
  if (csv.length > MAX_CSV_LENGTH) {
    return NextResponse.json({ error: "That file is too large to import in one go." }, { status: 400 });
  }

  const rows = parseCsv(csv);
  if (rows.length === 0) {
    return NextResponse.json({ error: "The CSV file appears to be empty." }, { status: 400 });
  }

  const header = rows[0].map(normalizeHeader);
  const nameIdx = header.indexOf("name");
  const costIdx = header.indexOf("cost");
  if (nameIdx === -1 || costIdx === -1) {
    return NextResponse.json(
      { error: 'CSV must include at least "Name" and "Cost" columns (see the downloadable template).' },
      { status: 400 }
    );
  }
  const categoryIdx = header.indexOf("category");
  const descriptionIdx = header.indexOf("description");
  const acquisitionCostIdx = header.indexOf("acquisition cost");
  const quantityIdx = header.indexOf("quantity");
  const visibleIdx = header.indexOf("visible to customer");

  const dataRows = rows.slice(1).slice(0, MAX_ROWS);

  const existingCategories = await prisma.category.findMany({
    where: { organizationId: organization.id },
  });
  const categoryByName = new Map(existingCategories.map((c) => [c.name.toLowerCase(), c]));
  let categorySortOrder = existingCategories.length;

  const existingItems = await prisma.item.findMany({
    where: { organizationId: organization.id },
    select: { slug: true },
  });
  const existingSlugs = new Set(existingItems.map((i) => i.slug));

  const created: { name: string }[] = [];
  const skipped: { name: string; reason: string }[] = [];
  const errors: { row: number; reason: string }[] = [];

  for (let r = 0; r < dataRows.length; r++) {
    const cells = dataRows[r];
    const rowNumber = r + 2;
    const isBlank = cells.every((c) => c.trim() === "");
    if (isBlank) continue;

    const name = (cells[nameIdx] || "").trim();
    if (!name) {
      errors.push({ row: rowNumber, reason: "Missing item name" });
      continue;
    }

    const costRaw = (cells[costIdx] || "").trim().replace(/^\$/, "");
    const cost = parseFloat(costRaw);
    if (costRaw === "" || Number.isNaN(cost) || cost < 0) {
      errors.push({ row: rowNumber, reason: 'Missing or invalid cost for "' + name + '"' });
      continue;
    }

    const slug = slugify(name);
    if (existingSlugs.has(slug)) {
      skipped.push({ name, reason: "Already in your inventory" });
      continue;
    }

    const categoryName = categoryIdx !== -1 ? (cells[categoryIdx] || "").trim() : "";
    const resolvedCategoryName = categoryName || "Imported";
    let category = categoryByName.get(resolvedCategoryName.toLowerCase());
    if (!category) {
      category = await prisma.category.create({
        data: {
          organizationId: organization.id,
          name: resolvedCategoryName,
          slug: slugify(resolvedCategoryName),
          sortOrder: categorySortOrder++,
        },
      });
      categoryByName.set(resolvedCategoryName.toLowerCase(), category);
    }

    const description =
      descriptionIdx !== -1 && (cells[descriptionIdx] || "").trim() ? cells[descriptionIdx].trim() : null;

    let acquisitionCost: number | null = null;
    if (acquisitionCostIdx !== -1) {
      const raw = (cells[acquisitionCostIdx] || "").trim().replace(/^\$/, "");
      if (raw !== "") {
        const parsed = parseFloat(raw);
        acquisitionCost = !Number.isNaN(parsed) && parsed >= 0 ? parsed : null;
      }
    }

    let quantity = 1;
    if (quantityIdx !== -1) {
      const raw = (cells[quantityIdx] || "").trim();
      if (raw !== "") {
        const parsed = parseInt(raw, 10);
        quantity = !Number.isNaN(parsed) && parsed >= 0 ? parsed : 1;
      }
    }

    let displayToCustomer = true;
    if (visibleIdx !== -1) {
      const raw = (cells[visibleIdx] || "").trim().toLowerCase();
      if (raw === "no" || raw === "false" || raw === "0") displayToCustomer = false;
      else if (raw === "yes" || raw === "true" || raw === "1") displayToCustomer = true;
    }

    const item = await prisma.item.create({
      data: {
        organizationId: organization.id,
        categoryId: category.id,
        name,
        slug,
        description,
        cost,
        acquisitionCost,
        quantity,
        displayToCustomer,
        status: "available",
      },
    });
    existingSlugs.add(slug);
    created.push({ name: item.name });
  }

  if (created.length > 0) {
    await logActivity({
      organizationId: organization.id,
      performedBy: sessionUser.id,
      action: "Imported inventory from CSV",
      details:
        created.length + " item(s) created, " + skipped.length + " skipped, " + errors.length + " row error(s)",
    });
  }

  return NextResponse.json({ created, skipped, errors, totalRows: dataRows.length });
}
