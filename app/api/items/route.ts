import { NextRequest, NextResponse } from "next/server";
import { requireCurrentOrganization } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export async function GET(req: NextRequest) {
  const organization = await requireCurrentOrganization();
  const { searchParams } = new URL(req.url);
  const categoryId = searchParams.get("categoryId");
  const id = searchParams.get("id");

  const items = await prisma.item.findMany({
    where: {
      organizationId: organization.id,
      ...(categoryId ? { categoryId } : {}),
      ...(id ? { id } : {}),
    },
    include: { category: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const organization = await requireCurrentOrganization();
  const body = await req.json();

  if (!body.name || typeof body.name !== "string") {
    return NextResponse.json({ error: "Item name is required" }, { status: 400 });
  }
  if (!body.categoryId || typeof body.categoryId !== "string") {
    return NextResponse.json({ error: "Category is required" }, { status: 400 });
  }
  if (typeof body.cost !== "number" || Number.isNaN(body.cost)) {
    return NextResponse.json({ error: "Cost is required" }, { status: 400 });
  }

  const slug = slugify(body.name);

  const item = await prisma.item.create({
    data: {
      organizationId: organization.id,
      categoryId: body.categoryId,
      name: body.name,
      slug,
      description: typeof body.description === "string" && body.description.length > 0 ? body.description : null,
      cost: body.cost,
      quantity: typeof body.quantity === "number" ? body.quantity : 1,
      picture: typeof body.picture === "string" && body.picture.length > 0 ? body.picture : null,
      displayToCustomer:
        typeof body.displayToCustomer === "boolean" ? body.displayToCustomer : true,
    },
  });

  return NextResponse.json({ item }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const organization = await requireCurrentOrganization();
  const body = await req.json();

  if (!body.id || typeof body.id !== "string") {
    return NextResponse.json({ error: "Item id is required" }, { status: 400 });
  }

  const existing = await prisma.item.findFirst({
    where: { id: body.id, organizationId: organization.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  const data: Record<string, unknown> = {};
  if (typeof body.name === "string" && body.name.length > 0) {
    data.name = body.name;
    data.slug = slugify(body.name);
  }
  if (typeof body.description === "string") {
    data.description = body.description.length > 0 ? body.description : null;
  }
  if (typeof body.cost === "number" && !Number.isNaN(body.cost)) data.cost = body.cost;
  if (typeof body.quantity === "number" && !Number.isNaN(body.quantity)) data.quantity = body.quantity;
  if (typeof body.picture === "string") {
    data.picture = body.picture.length > 0 ? body.picture : null;
  }
  if (typeof body.displayToCustomer === "boolean") data.displayToCustomer = body.displayToCustomer;
  if (typeof body.categoryId === "string" && body.categoryId.length > 0) data.categoryId = body.categoryId;

  const item = await prisma.item.update({ where: { id: body.id }, data });

  return NextResponse.json({ item });
}

export async function DELETE(req: NextRequest) {
  const organization = await requireCurrentOrganization();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Item id is required" }, { status: 400 });
  }

  const existing = await prisma.item.findFirst({
    where: { id, organizationId: organization.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  await prisma.item.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
