import { NextRequest, NextResponse } from "next/server";
import { requireCurrentOrganization } from "@/lib/tenant";
import { requireStaffSession, authzErrorResponse } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export async function GET() {
  const organization = await requireCurrentOrganization();
  try {
    await requireStaffSession(organization.id);
  } catch (err) {
    return authzErrorResponse(err);
  }
  const categories = await prisma.category.findMany({
    where: { organizationId: organization.id },
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { items: true } } },
  });
  return NextResponse.json({ categories });
}

export async function POST(req: NextRequest) {
  const organization = await requireCurrentOrganization();
  try {
    await requireStaffSession(organization.id);
  } catch (err) {
    return authzErrorResponse(err);
  }
  const body = await req.json();

  if (!body.name || typeof body.name !== "string") {
    return NextResponse.json({ error: "Category name is required" }, { status: 400 });
  }

  const slug = slugify(body.name);
  const count = await prisma.category.count({ where: { organizationId: organization.id } });

  const category = await prisma.category.create({
    data: {
      organizationId: organization.id,
      name: body.name,
      slug,
      sortOrder: count,
      description: typeof body.description === "string" && body.description.length > 0 ? body.description : null,
      picture: typeof body.picture === "string" && body.picture.length > 0 ? body.picture : null,
      displayToCustomer:
        typeof body.displayToCustomer === "boolean" ? body.displayToCustomer : true,
    },
  });

  return NextResponse.json({ category }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const organization = await requireCurrentOrganization();
  try {
    await requireStaffSession(organization.id);
  } catch (err) {
    return authzErrorResponse(err);
  }
  const body = await req.json();

  if (!body.id || typeof body.id !== "string") {
    return NextResponse.json({ error: "Category id is required" }, { status: 400 });
  }

  const existing = await prisma.category.findFirst({
    where: { id: body.id, organizationId: organization.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }

  const data: Record<string, unknown> = {};
  if (typeof body.name === "string" && body.name.length > 0) {
    data.name = body.name;
    data.slug = slugify(body.name);
  }
  if (typeof body.description === "string") {
    data.description = body.description.length > 0 ? body.description : null;
  }
  if (typeof body.picture === "string") {
    data.picture = body.picture.length > 0 ? body.picture : null;
  }
  if (typeof body.displayToCustomer === "boolean") data.displayToCustomer = body.displayToCustomer;

  const category = await prisma.category.update({ where: { id: body.id }, data });

  return NextResponse.json({ category });
}

export async function DELETE(req: NextRequest) {
  const organization = await requireCurrentOrganization();
  try {
    await requireStaffSession(organization.id);
  } catch (err) {
    return authzErrorResponse(err);
  }
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Category id is required" }, { status: 400 });
  }

  const existing = await prisma.category.findFirst({
    where: { id, organizationId: organization.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }

  const itemCount = await prisma.item.count({ where: { categoryId: id } });
  if (itemCount > 0) {
    return NextResponse.json(
      { error: "Remove or move all items out of this category before deleting it" },
      { status: 400 }
    );
  }

  await prisma.category.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
