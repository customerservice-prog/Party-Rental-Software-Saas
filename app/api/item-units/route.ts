import { NextRequest, NextResponse } from "next/server";
import { requireCurrentOrganization } from "@/lib/tenant";
import { requirePermission, authzErrorResponse } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

// Optional per-item serialized asset registry (see prisma/schema.prisma
// ItemUnit for the full rationale). Purely informational for staff - never
// consulted by the booking/availability engine, which still reserves by
// aggregate Item.quantity only (see lib/availability.ts).

const UNIT_STATUSES = ["available", "rented", "maintenance", "retired"];

export async function GET(req: NextRequest) {
  const organization = await requireCurrentOrganization();
  try {
    await requirePermission(organization.id, "inventory.view");
  } catch (err) {
    return authzErrorResponse(err);
  }

  const { searchParams } = new URL(req.url);
  const itemId = searchParams.get("itemId");
  if (!itemId) {
    return NextResponse.json({ error: "itemId is required" }, { status: 400 });
  }

  const units = await prisma.itemUnit.findMany({
    where: { organizationId: organization.id, itemId },
    orderBy: { identifier: "asc" },
  });

  return NextResponse.json({ units });
}

export async function POST(req: NextRequest) {
  const organization = await requireCurrentOrganization();
  try {
    await requirePermission(organization.id, "inventory.manage");
  } catch (err) {
    return authzErrorResponse(err);
  }

  const body = await req.json();

  if (!body.itemId || typeof body.itemId !== "string") {
    return NextResponse.json({ error: "itemId is required" }, { status: 400 });
  }

  const item = await prisma.item.findFirst({
    where: { id: body.itemId, organizationId: organization.id },
  });
  if (!item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  // Bulk-generate mode: create several units at once with auto-numbered
  // identifiers, continuing after the highest existing "#N" suffix so
  // repeated bulk-adds never collide.
  if (typeof body.generateCount === "number" && body.generateCount > 0) {
    const count = Math.min(Math.floor(body.generateCount), 200);
    const existing = await prisma.itemUnit.findMany({
      where: { itemId: item.id },
      select: { identifier: true },
    });
    let maxN = 0;
    for (const u of existing) {
      const m = u.identifier.match(/#(\d+)$/);
      if (m) maxN = Math.max(maxN, parseInt(m[1], 10));
    }
    const created = [];
    for (let i = 1; i <= count; i++) {
      const identifier = item.name + " #" + (maxN + i);
      const unit = await prisma.itemUnit.create({
        data: {
          organizationId: organization.id,
          itemId: item.id,
          identifier,
          status: "available",
        },
      });
      created.push(unit);
    }
    return NextResponse.json({ units: created }, { status: 201 });
  }

  if (!body.identifier || typeof body.identifier !== "string" || !body.identifier.trim()) {
    return NextResponse.json({ error: "Identifier is required" }, { status: 400 });
  }

  const existingUnit = await prisma.itemUnit.findFirst({
    where: { itemId: item.id, identifier: body.identifier.trim() },
  });
  if (existingUnit) {
    return NextResponse.json(
      { error: "A unit with that identifier already exists for this item" },
      { status: 409 }
    );
  }

  const unit = await prisma.itemUnit.create({
    data: {
      organizationId: organization.id,
      itemId: item.id,
      identifier: body.identifier.trim(),
      status: UNIT_STATUSES.includes(body.status) ? body.status : "available",
      conditionNotes:
        typeof body.conditionNotes === "string" && body.conditionNotes.length > 0
          ? body.conditionNotes
          : null,
    },
  });

  return NextResponse.json({ unit }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const organization = await requireCurrentOrganization();
  try {
    await requirePermission(organization.id, "inventory.manage");
  } catch (err) {
    return authzErrorResponse(err);
  }

  const body = await req.json();

  if (!body.id || typeof body.id !== "string") {
    return NextResponse.json({ error: "Unit id is required" }, { status: 400 });
  }

  const existing = await prisma.itemUnit.findFirst({
    where: { id: body.id, organizationId: organization.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Unit not found" }, { status: 404 });
  }

  const data: Record<string, unknown> = {};
  if (typeof body.identifier === "string" && body.identifier.trim().length > 0) {
    data.identifier = body.identifier.trim();
  }
  if (typeof body.status === "string" && UNIT_STATUSES.includes(body.status)) {
    data.status = body.status;
  }
  if (typeof body.conditionNotes === "string") {
    data.conditionNotes = body.conditionNotes.length > 0 ? body.conditionNotes : null;
  }
  if (body.lastInspectedAt !== undefined) {
    data.lastInspectedAt = body.lastInspectedAt ? new Date(body.lastInspectedAt) : null;
  }

  try {
    const unit = await prisma.itemUnit.update({ where: { id: body.id }, data });
    return NextResponse.json({ unit });
  } catch (err: unknown) {
    const e = err as { code?: string };
    if (e?.code === "P2002") {
      return NextResponse.json(
        { error: "A unit with that identifier already exists for this item" },
        { status: 409 }
      );
    }
    throw err;
  }
}

export async function DELETE(req: NextRequest) {
  const organization = await requireCurrentOrganization();
  try {
    await requirePermission(organization.id, "inventory.manage");
  } catch (err) {
    return authzErrorResponse(err);
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Unit id is required" }, { status: 400 });
  }

  const existing = await prisma.itemUnit.findFirst({
    where: { id, organizationId: organization.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Unit not found" }, { status: 404 });
  }

  await prisma.itemUnit.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
