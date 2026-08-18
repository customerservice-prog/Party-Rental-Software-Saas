import { NextRequest, NextResponse } from "next/server";
import { requireCurrentOrganization } from "@/lib/tenant";
import { requirePermission, authzErrorResponse } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

// Returns everything the Dispatch board needs for a single day: orders
// scheduled for delivery or pickup that day, active drivers, and any
// DriverRun/DriverRunStop rows already created for that date.
export async function GET(req: NextRequest) {
  const organization = await requireCurrentOrganization();
  try {
    await requirePermission(organization.id, "drivers.view");
  } catch (err) {
    return authzErrorResponse(err);
  }

  const dateParam = req.nextUrl.searchParams.get("date");
  const base = dateParam ? new Date(dateParam + "T00:00:00") : new Date();
  if (isNaN(base.getTime())) {
    return NextResponse.json({ error: "Invalid date." }, { status: 400 });
  }
  const dayStart = new Date(base);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(base);
  dayEnd.setHours(23, 59, 59, 999);

  const [orders, drivers, runs] = await Promise.all([
    prisma.order.findMany({
      where: {
        organizationId: organization.id,
        status: { not: "canceled" },
        OR: [
          { eventDate: { gte: dayStart, lte: dayEnd } },
          { eventEndDate: { gte: dayStart, lte: dayEnd } },
        ],
      },
      include: { customer: true },
      orderBy: { eventDate: "asc" },
    }),
    prisma.driver.findMany({
      where: { organizationId: organization.id, isActive: true },
      orderBy: { name: "asc" },
    }),
    prisma.driverRun.findMany({
      where: { organizationId: organization.id, runDate: { gte: dayStart, lte: dayEnd } },
      include: {
        driver: true,
        stops: {
          include: { order: { include: { customer: true } } },
          orderBy: { stopOrder: "asc" },
        },
      },
    }),
  ]);

  const assignedOrderIds = new Set(runs.flatMap((r) => r.stops.map((s) => s.orderId)));
  const unassigned = orders.filter((o) => !assignedOrderIds.has(o.id));

  return NextResponse.json({
    date: dayStart.toISOString().slice(0, 10),
    drivers,
    runs,
    unassigned,
  });
}
