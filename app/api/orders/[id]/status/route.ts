import { NextRequest, NextResponse } from "next/server";
import { requireCurrentOrganization } from "@/lib/tenant";
import { requireStaffSession, authzErrorResponse } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

const VALID_STATUSES = ["pending", "confirmed", "completed", "cancelled"];

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
  const { status } = body;

  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const order = await prisma.order.findFirst({
    where: { id: params.id, organizationId: organization.id },
  });

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: { status },
  });

  return NextResponse.json(updated);
}
