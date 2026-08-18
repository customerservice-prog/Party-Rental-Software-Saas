import { NextResponse } from "next/server";
import { requireCurrentOrganization } from "@/lib/tenant";
import { requirePermission, authzErrorResponse } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

// Re-sorts a driver run's stops by event time, then delivery address, so
// dispatchers get a sensible default order without manually dragging every
// stop (mirrors the reference app's "optimize" route action).
export async function POST(
  _req: Request,
  { params }: { params: { runId: string } }
) {
  const organization = await requireCurrentOrganization();
  try {
    await requirePermission(organization.id, "drivers.manage");
  } catch (err) {
    return authzErrorResponse(err);
  }

  const run = await prisma.driverRun.findFirst({
    where: { id: params.runId, organizationId: organization.id },
    include: { stops: { include: { order: true } } },
  });
  if (!run) {
    return NextResponse.json({ error: "Run not found." }, { status: 404 });
  }

  const sorted = [...run.stops].sort((a, b) => {
    const aTime = new Date(a.order.eventDate).getTime();
    const bTime = new Date(b.order.eventDate).getTime();
    if (aTime !== bTime) return aTime - bTime;
    return (a.order.deliveryAddress || "").localeCompare(b.order.deliveryAddress || "");
  });

  await prisma.$transaction(
    sorted.map((stop, i) =>
      prisma.driverRunStop.update({ where: { id: stop.id }, data: { stopOrder: i + 1 } })
    )
  );

  return NextResponse.json({ ok: true });
}
