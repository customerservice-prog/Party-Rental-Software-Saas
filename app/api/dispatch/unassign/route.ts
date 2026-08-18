import { NextRequest, NextResponse } from "next/server";
import { requireCurrentOrganization } from "@/lib/tenant";
import { requirePermission, authzErrorResponse } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/audit";

// Removes an order from whichever driver run it's on for the given date
// (used by the Dispatch board's "Unassign" action).
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
  const dateStr = typeof body.date === "string" ? body.date : "";
  if (!orderId || !dateStr) {
    return NextResponse.json({ error: "orderId and date are required." }, { status: 400 });
  }
  const runDate = new Date(dateStr + "T00:00:00");
  if (isNaN(runDate.getTime())) {
    return NextResponse.json({ error: "Invalid date." }, { status: 400 });
  }

  await prisma.driverRunStop.deleteMany({
    where: {
      orderId,
      driverRun: { organizationId: organization.id, runDate },
    },
  });

  await logActivity({
    organizationId: organization.id,
    performedBy: session.id,
    action: "Unassigned order from driver run",
    details: `Order ${orderId} (${dateStr})`,
  });

  return NextResponse.json({ ok: true });
}
