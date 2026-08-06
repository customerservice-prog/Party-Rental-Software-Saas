import { NextRequest, NextResponse } from "next/server";
import { requireCurrentOrganization } from "@/lib/tenant";
import { requireStaffSession, authzErrorResponse } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const organization = await requireCurrentOrganization();
  const { searchParams } = new URL(req.url);
  const itemId = searchParams.get("itemId");

  const addons = await prisma.addon.findMany({
    where: {
      organizationId: organization.id,
      ...(itemId ? { itemId } : {}),
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ addons });
}

export async function POST(req: NextRequest) {
  const organization = await requireCurrentOrganization();
  try {
    await requireStaffSession(organization.id);
  } catch (err) {
    return authzErrorResponse(err);
  }
  const body = await req.json();

  if (!body.itemId || typeof body.itemId !== "string") {
    return NextResponse.json({ error: "Item is required" }, { status: 400 });
  }
  if (!body.name || typeof body.name !== "string") {
    return NextResponse.json({ error: "Add-on name is required" }, { status: 400 });
  }
  const price = typeof body.price === "number" && !Number.isNaN(body.price) ? body.price : 0;

  const item = await prisma.item.findFirst({
    where: { id: body.itemId, organizationId: organization.id },
  });
  if (!item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  const addon = await prisma.addon.create({
    data: {
      organizationId: organization.id,
      itemId: body.itemId,
      name: body.name,
      price,
      isRequired: typeof body.isRequired === "boolean" ? body.isRequired : false,
    },
  });

  return NextResponse.json({ addon }, { status: 201 });
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
    return NextResponse.json({ error: "Add-on id is required" }, { status: 400 });
  }

  const existing = await prisma.addon.findFirst({
    where: { id: body.id, organizationId: organization.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Add-on not found" }, { status: 404 });
  }

  const data: Record<string, unknown> = {};
  if (typeof body.name === "string" && body.name.length > 0) data.name = body.name;
  if (typeof body.price === "number" && !Number.isNaN(body.price)) data.price = body.price;
  if (typeof body.isRequired === "boolean") data.isRequired = body.isRequired;

  const addon = await prisma.addon.update({ where: { id: body.id }, data });

  return NextResponse.json({ addon });
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
    return NextResponse.json({ error: "Add-on id is required" }, { status: 400 });
  }

  const existing = await prisma.addon.findFirst({
    where: { id, organizationId: organization.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Add-on not found" }, { status: 404 });
  }

  await prisma.addon.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
