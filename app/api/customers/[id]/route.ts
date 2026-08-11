import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCurrentOrganization } from "@/lib/tenant";
import { requireStaffSession, authzErrorResponse } from "@/lib/authz";
import { logActivity } from "@/lib/audit";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const organization = await requireCurrentOrganization();
    const session = await requireStaffSession(organization.id);

    const existing = await prisma.customer.findFirst({
      where: { id: params.id, organizationId: organization.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Customer not found." }, { status: 404 });
    }

    const data = await request.json();
    const notes =
      typeof data.notes === "string" ? data.notes.trim() : existing.notes;

    const customer = await prisma.customer.update({
      where: { id: params.id },
      data: { notes },
    });

    await logActivity({
      organizationId: organization.id,
      performedBy: session.id,
      action: "Updated customer notes",
      details: `${customer.firstName} ${customer.lastName}`,
    });

    return NextResponse.json({ customer });
  } catch (err) {
    return authzErrorResponse(err);
  }
}
