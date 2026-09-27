import { NextRequest, NextResponse } from "next/server";
import { requireCurrentOrganization } from "@/lib/tenant";
import { requirePermission, authzErrorResponse } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  const params = await paramsPromise;
  const organization = await requireCurrentOrganization();
  let actor;
  try {
    actor = await requirePermission(organization.id, "orders.manage");
  } catch (err) {
    return authzErrorResponse(err);
  }

  const body = await request.json();
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 4000) : "";
  if (!note) return NextResponse.json({ error: "Enter an internal note" }, { status: 400 });

  const actorRecord = await prisma.user.findUnique({ where: { id: actor.id }, select: { name: true } });
  const author = actorRecord?.name || (actor.effectiveUserId ? "Platform administrator" : "Staff");
  const stamp = new Intl.DateTimeFormat("en-US", {
    timeZone: organization.timezone || "America/New_York",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date());

  try {
    const result = await prisma.$transaction(async tx => {
      const order = await tx.order.findFirst({
        where: { id: params.id, organizationId: organization.id },
        select: { id: true, internalNotes: true },
      });
      if (!order) throw new Error("ORDER_NOT_FOUND");

      const entry = `[${stamp} · ${author}] ${note}`;
      const internalNotes = [order.internalNotes, entry].filter(Boolean).join("\n");
      await tx.order.update({ where: { id: order.id }, data: { internalNotes } });
      await tx.auditLog.create({
        data: {
          organizationId: organization.id,
          action: "order.internal_note.added",
          performedBy: actor.id,
          details: JSON.stringify({ orderId: order.id }),
        },
      });
      return internalNotes;
    });
    return NextResponse.json({ internalNotes: result });
  } catch (err) {
    if (err instanceof Error && err.message === "ORDER_NOT_FOUND") {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    throw err;
  }
}
