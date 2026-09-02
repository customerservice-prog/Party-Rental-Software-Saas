import { NextRequest, NextResponse } from "next/server";
import { getCurrentDriver } from "@/lib/driverSession";
import { prisma } from "@/lib/prisma";
import { validateStopStatusTransition, isPickupOrder, ATTENTION_STATUSES } from "@/lib/driverRuns";

// Lets the signed-in driver update ONLY their own stop's live status,
// condition/attention report, and notes. Unlike the staff dispatch PATCH
// route, this never allows reordering, moving a stop to another driver,
// or editing pay - those stay staff-only.
export async function PATCH(
  req: NextRequest,
  { params }: { params: { stopId: string } }
) {
  const driver = await getCurrentDriver();
  if (!driver) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const stop = await prisma.driverRunStop.findFirst({
    where: {
      id: params.stopId,
      driverRun: { driverId: driver.id, organizationId: driver.organizationId },
    },
    include: { driverRun: true, order: true },
  });
  if (!stop) {
    return NextResponse.json({ error: "Stop not found." }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
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

  if (typeof body.driverInternalNote === "string") {
    data.driverInternalNote = body.driverInternalNote.slice(0, 5000);
  }

  const updated = await prisma.driverRunStop.update({
    where: { id: stop.id },
    data,
    include: { order: { include: { customer: true } } },
  });

  return NextResponse.json({ stop: updated });
}
