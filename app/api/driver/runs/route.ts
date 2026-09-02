import { NextRequest, NextResponse } from "next/server";
import { getCurrentDriver } from "@/lib/driverSession";
import { prisma } from "@/lib/prisma";

// Returns the signed-in driver's own stops for a single day (defaults to
// today). Unlike /api/dispatch, this never returns other drivers' runs or
// unassigned orders - a driver can only ever see their own route.
export async function GET(req: NextRequest) {
  const driver = await getCurrentDriver();
  if (!driver) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const dateParam = req.nextUrl.searchParams.get("date");
  const runDate = dateParam ? new Date(dateParam + "T00:00:00") : new Date();
  runDate.setHours(0, 0, 0, 0);
  if (isNaN(runDate.getTime())) {
    return NextResponse.json({ error: "Invalid date." }, { status: 400 });
  }

  const run = await prisma.driverRun.findUnique({
    where: {
      organizationId_driverId_runDate: {
        organizationId: driver.organizationId,
        driverId: driver.id,
        runDate,
      },
    },
    include: {
      stops: {
        orderBy: [{ stopOrder: "asc" }],
        include: { order: { include: { customer: true } } },
      },
    },
  });

  return NextResponse.json({
    date: runDate.toISOString().slice(0, 10),
    driverName: driver.name,
    stops: run?.stops || [],
  });
}
