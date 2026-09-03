import { NextRequest, NextResponse } from "next/server";
import { requireCurrentOrganization } from "@/lib/tenant";
import { requirePermission, authzErrorResponse } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/audit";

// Driver roster management. Viewing the roster requires drivers.view;
// adding, editing, deactivating, or removing drivers requires
// drivers.manage (owners always have both implicitly).

export async function GET() {
    const organization = await requireCurrentOrganization();
    try {
          await requirePermission(organization.id, "drivers.view");
    } catch (err) {
          return authzErrorResponse(err);
    }

  const drivers = await prisma.driver.findMany({
        where: { organizationId: organization.id },
        orderBy: { name: "asc" },
  });

  return NextResponse.json({ drivers });
}

function randomPin() {
    return String(Math.floor(1000 + Math.random() * 9000));
}

export async function POST(req: NextRequest) {
    const organization = await requireCurrentOrganization();
    let session;
    try {
          session = await requirePermission(organization.id, "drivers.manage");
    } catch (err) {
          return authzErrorResponse(err);
    }

  const body = await req.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const phone = typeof body.phone === "string" && body.phone.trim() ? body.phone.trim() : null;
    const email = typeof body.email === "string" && body.email.trim() ? body.email.trim() : null;
    let pin = typeof body.pin === "string" && body.pin.trim() ? body.pin.trim() : "";

  if (!name) {
        return NextResponse.json({ error: "Driver name is required." }, { status: 400 });
  }

  if (pin && !/^\d{4,6}$/.test(pin)) {
        return NextResponse.json({ error: "PIN must be 4-6 digits." }, { status: 400 });
  }

  if (!pin) {
        for (let attempt = 0; attempt < 10; attempt++) {
                const candidate = randomPin();
                const clash = await prisma.driver.findUnique({
                          where: { organizationId_pin: { organizationId: organization.id, pin: candidate } },
                });
                if (!clash) {
                          pin = candidate;
                          break;
                }
        }
  } else {
        const clash = await prisma.driver.findUnique({
                where: { organizationId_pin: { organizationId: organization.id, pin } },
        });
        if (clash) {
                return NextResponse.json(
                  { error: "That PIN is already in use by another driver." },
                  { status: 400 }
                        );
        }
  }

  const driver = await prisma.driver.create({
        data: {
                organizationId: organization.id,
                name,
                phone,
                email,
                pin: pin || null,
        },
  });

  await logActivity({
    organizationId: organization.id,
    performedBy: session.id,
    action: "Added driver",
    details: driver.name,
  });
  return NextResponse.json({ driver }, { status: 201 });
}
