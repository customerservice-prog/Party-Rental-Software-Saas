import { NextRequest, NextResponse } from "next/server";
import { requireCurrentOrganization } from "@/lib/tenant";
import { requireStaffSession, authzErrorResponse } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

export async function PATCH(
    request: NextRequest,
  { params }: { params: { id: string } }
  ) {
    const organization = await requireCurrentOrganization();
    try {
      await requireStaffSession(organization.id);
    } catch (err) {
      return authzErrorResponse(err);
    }
    const body = await request.json();
    const { driverId } = body;

  const order = await prisma.order.findFirst({
        where: { id: params.id, organizationId: organization.id },
  });

  if (!order) {
        return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const updated = await prisma.order.update({
        where: { id: order.id },
        data: { deliveryDriverId: driverId || null },
  });

  return NextResponse.json(updated);
}
