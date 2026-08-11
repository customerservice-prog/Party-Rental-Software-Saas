import { NextRequest, NextResponse } from "next/server";
import { requireCurrentOrganization } from "@/lib/tenant";
import { requireOwnerSession, authzErrorResponse } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/audit";

// Editing, deactivating, and removing individual drivers. Only an owner can
// perform these actions; regular staff logins can view the roster (via
// GET /api/drivers) but cannot modify it.

export async function PATCH(
    req: NextRequest,
  { params }: { params: { id: string } }
  ) {
    const organization = await requireCurrentOrganization();
    try {
          await requireOwnerSession(organization.id);
    } catch (err) {
          return authzErrorResponse(err);
    }

  const target = await prisma.driver.findFirst({
        where: { id: params.id, organizationId: organization.id },
  });
    if (!target) {
          return NextResponse.json({ error: "Driver not found." }, { status: 404 });
    }

  const body = await req.json();
    const data: Record<string, unknown> = {};

  if (typeof body.name === "string" && body.name.trim()) {
        data.name = body.name.trim();
  }
    if (typeof body.phone === "string") {
          data.phone = body.phone.trim() || null;
    }
    if (typeof body.email === "string") {
          data.email = body.email.trim() || null;
    }
    if (typeof body.isActive === "boolean") {
          data.isActive = body.isActive;
    }
    if (typeof body.pin === "string" && body.pin.trim()) {
          const pin = body.pin.trim();
          if (!/^\d{4,6}$/.test(pin)) {
                  return NextResponse.json({ error: "PIN must be 4-6 digits." }, { status: 400 });
          }
          const clash = await prisma.driver.findUnique({
                  where: { organizationId_pin: { organizationId: organization.id, pin } },
          });
          if (clash && clash.id !== target.id) {
                  return NextResponse.json(
                    { error: "That PIN is already in use by another driver." },
                    { status: 400 }
                          );
          }
          data.pin = pin;
    }

  const updated = await prisma.driver.update({
        where: { id: target.id },
        data,
  });

  return NextResponse.json({ driver: updated });
}

export async function DELETE(
    req: NextRequest,
  { params }: { params: { id: string } }
  ) {
    const organization = await requireCurrentOrganization();
    try {
          const session = await requireOwnerSession(organization.id);
    } catch (err) {
          return authzErrorResponse(err);
    }

  const target = await prisma.driver.findFirst({
        where: { id: params.id, organizationId: organization.id },
  });
    if (!target) {
          return NextResponse.json({ error: "Driver not found." }, { status: 404 });
    }

  const assignedOrders = await prisma.order.count({
        where: {
                organizationId: organization.id,
                OR: [{ deliveryDriverId: target.id }, { pickupDriverId: target.id }],
        },
  });

  if (assignedOrders > 0) {
        return NextResponse.json(
          {
                    error:
                                "This driver is assigned to existing orders and can't be deleted. Deactivate them instead.",
          },
          { status: 400 }
              );
  }

  await prisma.driver.delete({ where: { id: target.id } });
    await logActivity({
      organizationId: organization.id,
      performedBy: session.id,
      action: "Removed driver",
      details: target.name,
    });
    return NextResponse.json({ ok: true });
}
