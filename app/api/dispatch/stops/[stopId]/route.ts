import { NextRequest, NextResponse } from "next/server";
import { requireCurrentOrganization } from "@/lib/tenant";
import { requirePermission, authzErrorResponse } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/audit";
import { validateStopStatusTransition, isPickupOrder, ATTENTION_STATUSES } from "@/lib/driverRuns";

// Updates a single dispatch stop: live status (with transition
// validation), attention/condition reporting, notes, per-stop pay
// override, reordering within its run (move up/down), or moving the stop
// to a different driver's run for the same date.
export async function PATCH(
  req: NextRequest,
  { params }: { params: { stopId: string } }
) {
  const organization = await requireCurrentOrganization();
  let session;
  try {
    session = await requirePermission(organization.id, "drivers.manage");
  } catch (err) {
    return authzErrorResponse(err);
  }

  const stop = await prisma.driverRunStop.findFirst({
    where: { id: params.stopId, driverRun: { organizationId: organization.id } },
    include: { driverRun: true, order: true },
  });
  if (!stop) {
    return NextResponse.json({ error: "Stop not found." }, { status: 404 });
  }

  const body = await req.json();
  const data: Record<string, unknown> = {};

  if (typeof body.status === "string") {
    const isPickup = isPickupOrder(stop.order.deliveryType);
    const result = validateStopStatusTransition(stop.status, body.status, isPickup);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    data.status = body.status.trim().toLowerCase();
  }

  if (typeof body.attentionStatus === "string") {
    const attention = body.attentionStatus.trim().toLowerCase();
    if (!(ATTENTION_STATUSES as readonly string[]).includes(attention)) {
      return NextResponse.json({ error: "Invalid attention status." }, { status: 400 });
    }
    data.attentionStatus = attention;
    data.attentionNotes = attention ? String(body.attentionNotes || "").slice(0, 500) : "";
  }

  if (typeof body.stopNotes === "string") {
    data.stopNotes = body.stopNotes.slice(0, 255);
  }

  if (typeof body.driverInternalNote === "string") {
    data.driverInternalNote = body.driverInternalNote.slice(0, 5000);
  }

  if ("stopPayOverride" in body) {
    const raw = body.stopPayOverride;
    if (raw === null || raw === "") {
      data.stopPayOverride = null;
    } else {
      const num = Number(raw);
      if (isNaN(num) || num < 0) {
        return NextResponse.json({ error: "Enter a valid dollar amount." }, { status: 400 });
      }
      data.stopPayOverride = num;
    }
  }

  if (body.move === "up" || body.move === "down") {
    const siblings = await prisma.driverRunStop.findMany({
      where: { driverRunId: stop.driverRunId },
      orderBy: [{ stopOrder: "asc" }, { id: "asc" }],
    });
    const idx = siblings.findIndex((s) => s.id === stop.id);
    if (idx >= 0) {
      const swapWith = body.move === "up" ? idx - 1 : idx + 1;
      if (swapWith >= 0 && swapWith < siblings.length) {
        const a = siblings[idx];
        const b = siblings[swapWith];
        await prisma.$transaction([
          prisma.driverRunStop.update({ where: { id: a.id }, data: { stopOrder: b.stopOrder } }),
          prisma.driverRunStop.update({ where: { id: b.id }, data: { stopOrder: a.stopOrder } }),
        ]);
      }
    }
  }

  if (typeof body.moveToDriverId === "string" && body.moveToDriverId) {
    const driver = await prisma.driver.findFirst({
      where: { id: body.moveToDriverId, organizationId: organization.id, isActive: true },
    });
    if (!driver) {
      return NextResponse.json({ error: "Driver not found." }, { status: 404 });
    }
    const run = await prisma.driverRun.upsert({
      where: {
        organizationId_driverId_runDate: {
          organizationId: organization.id,
          driverId: driver.id,
          runDate: stop.driverRun.runDate,
        },
      },
      update: {},
      create: { organizationId: organization.id, driverId: driver.id, runDate: stop.driverRun.runDate, notes: "" },
    });
    const maxOrderRow = await prisma.driverRunStop.aggregate({
      where: { driverRunId: run.id },
      _max: { stopOrder: true },
    });
    data.driverRunId = run.id;
    data.stopOrder = (maxOrderRow._max.stopOrder || 0) + 1;
  }

  const updated = await prisma.driverRunStop.update({
    where: { id: stop.id },
    data,
    include: { order: { include: { customer: true } }, driverRun: { include: { driver: true } } },
  });

  await logActivity({
    organizationId: organization.id,
    performedBy: session.id,
    action: "Updated dispatch stop",
    details: `Order ${stop.order.orderNumber || stop.orderId}`,
  });

  return NextResponse.json({ stop: updated });
}
