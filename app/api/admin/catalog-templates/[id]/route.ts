import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CATALOG_TEMPLATE_TYPES, isValidCatalogCategoryKey } from "@/lib/catalogTemplates";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { role?: string } | undefined;
  if (!user || user.role !== "platform_admin") {
    return null;
  }
  return session;
}

// Updates a single global CatalogTemplate - most commonly to fix a name,
// add search keywords, or toggle isActive. Deliberately never cascades to
// any tenant's existing Item rows: Item.sourceTemplateId is a loose
// reference, and Item.sourceTemplateName already snapshots the name at
// copy time, so editing a template here cannot silently change what any
// tenant sees on an item they already added.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const existing = await prisma.catalogTemplate.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Template not found." }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};

  if (body.name !== undefined) {
    const name = String(body.name).trim();
    if (!name) return NextResponse.json({ error: "Name cannot be blank." }, { status: 400 });
    data.name = name;
  }
  if (body.categoryKey !== undefined) {
    if (!isValidCatalogCategoryKey(body.categoryKey)) {
      return NextResponse.json({ error: "Invalid category." }, { status: 400 });
    }
    data.categoryKey = body.categoryKey;
  }
  if (body.type !== undefined) {
    if (!CATALOG_TEMPLATE_TYPES.includes(body.type)) {
      return NextResponse.json({ error: "Invalid type." }, { status: 400 });
    }
    data.type = body.type;
  }
  if (body.description !== undefined) {
    data.description = body.description ? String(body.description).trim() : null;
  }
  if (body.keywords !== undefined) {
    data.keywords = Array.isArray(body.keywords)
      ? body.keywords.map((k: unknown) => String(k).trim()).filter(Boolean)
      : [];
  }
  if (body.sortOrder !== undefined && Number.isFinite(body.sortOrder)) {
    data.sortOrder = Number(body.sortOrder);
  }
  if (body.isActive !== undefined) {
    data.isActive = Boolean(body.isActive);
  }

  const template = await prisma.catalogTemplate.update({ where: { id: params.id }, data });
  return NextResponse.json({ template });
}

// Hard-deletes a template only if no tenant has ever copied it into their
// own inventory (checked via Item.sourceTemplateId). If any tenant Item
// references it, refuses and tells the admin to deactivate instead -
// matching the platform rule to never destroy data whose consequences
// aren't fully understood.
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const existing = await prisma.catalogTemplate.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Template not found." }, { status: 404 });

  const inUse = await prisma.item.count({ where: { sourceTemplateId: existing.id } });
  if (inUse > 0) {
    return NextResponse.json(
      { error: inUse + " tenant item(s) were added from this template. Deactivate it instead of deleting." },
      { status: 409 }
    );
  }

  await prisma.catalogTemplate.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
