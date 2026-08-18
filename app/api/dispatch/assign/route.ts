import { NextRequest, NextResponse } from "next/server";
import { requireCurrentOrganization } from "@/lib/tenant";
import { requirePermission, authzErrorResponse } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/audit";

// Assigns an order to a driver's run for a given date, creating the
// DriverRun if this is the driver's first stop that day, and appending
// the order as the next stop in that run's order.
export async function POST(req: NextRequest) {
  const organization = await requireCurrentOrganization();
  let session;
  try {
    session = await requirePermission(organization.id, "drivers.manage");
  } catch (err) {
    return authzErrorResponse(err);
  }

  const body = await req.json();
  const orderId = typeof body.orderId === "string" ? body.orderId : "";
  const driverId = typeof body.driverId === "string" ? body.driverId : "";
  const dateStr = typeof body.date === "string" ? body.date : "";

  if (!orderId || !driverId || !dateStr) {
    return NextResponse.json({ error: "orderId, driverId, and date are required." }, { status: 400 });
  }

  const runDate = new Date(dateStr + "T00:00:00");
  if (isNaN(runDate.getTime())) {
    return NextResponse.json({ error: "Invalid date." }, { status: 400 });
  }

  const [order, driver] = await Promise.all([
    prisma.order.findFirst({ where: { id: orderId, organizationId: organization.id } }),
    prisma.driver.findFirst({ where: { id: driverId, organizationId: organization.id, isActive: true } }),
  ]);
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  if (!driver) return NextResponse.json({ error: "Driver not found." }, { status: 404 });

  const run = await prisma.driverRun.upsert({
    where: {
      organizationId_driverId_runDate: { organizationId: organization.id, driverId, runDate },
    },
    update: {},
    create: { organizationId: organization.id, driverId, runDate, notes: "" },
  });

  const maxOrderRow = await prisma.driverRunStop.aggregate({
    where: { driverRunId: run.id },
    _max: { stopOrder: true },
  });
  const nextOrder = (maxOrderRow._max.stopOrder || 0) + 1;

  const stop = await prisma.driverRunStop.upsert({
    where: { driverRunId_orderId: { driverRunId: run.id, orderId } },
    update: {},
    create: { driverRunId: run.id, orderId, stopOrder: nextOrder },
  });

  await logActivity({
    organizationId: organization.id,
    performedBy: session.id,
    action: "Assigned order to driver run",
    details: `Order ${order.orderNumber} -> ${driver.name} (${dateStr})`,
  });

  return NextResponse.json({ run, stop });
}
