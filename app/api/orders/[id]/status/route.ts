import { NextRequest, NextResponse } from "next/server";
import { requireCurrentOrganization } from "@/lib/tenant";
import { requirePermission, authzErrorResponse } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

const VALID_STATUSES = ["quote", "incomplete", "pending", "active", "confirmed", "completed", "cancelled", "canceled"];

export async function PATCH(
  request: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  const params = await paramsPromise;

  const organization = await requireCurrentOrganization();
  try {
    await requirePermission(organization.id, "orders.manage");
  } catch (err) {
    return authzErrorResponse(err);
  }
  const body = await request.json();
  const { status } = body;
  const normalizedStatus = status === "pending" ? "incomplete" : status === "canceled" ? "cancelled" : status;

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
    data: { status: normalizedStatus },
  });

  return NextResponse.json(updated);
}
