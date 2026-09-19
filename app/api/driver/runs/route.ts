import { NextRequest, NextResponse } from "next/server";
import { getCurrentDriver } from "@/lib/driverSession";
import { prisma } from "@/lib/prisma";

type ProofRow = {
  orderId: string;
  proofName: string | null;
  proofSignature: string | null;
  proofPhotoUrl: string | null;
  notes: string | null;
};

export async function GET(req: NextRequest) {
  const driver = await getCurrentDriver();
  if (!driver) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const dateParam = req.nextUrl.searchParams.get("date");
  const runDate = dateParam ? new Date(dateParam + "T00:00:00") : new Date();
  runDate.setHours(0, 0, 0, 0);
  if (isNaN(runDate.getTime())) return NextResponse.json({ error: "Invalid date." }, { status: 400 });

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
        include: {
          order: {
            include: {
              customer: true,
              items: { include: { item: true } },
            },
          },
        },
      },
    },
  });

  const stops = run?.stops || [];
  const proofByOrder = new Map<string, ProofRow>();
  await Promise.all(
    stops.map(async (stop) => {
      const rows = await prisma.$queryRawUnsafe<ProofRow[]>(
        `SELECT "orderId","proofName","proofSignature","proofPhotoUrl","notes"
         FROM "RentalFulfillment"
         WHERE "organizationId"=$1 AND "orderId"=$2
         LIMIT 1`,
        driver.organizationId,
        stop.orderId
      );
      if (rows[0]) proofByOrder.set(stop.orderId, rows[0]);
    })
  );

  return NextResponse.json({
    date: runDate.toISOString().slice(0, 10),
    driverName: driver.name,
    stops: stops.map((stop) => ({
      ...stop,
      proof: proofByOrder.get(stop.orderId) || null,
    })),
  });
}
