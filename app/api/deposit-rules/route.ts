import { NextRequest, NextResponse } from "next/server";
import { requireCurrentOrganization } from "@/lib/tenant";
import { requireOwnerSession, authzErrorResponse } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const organization = await requireCurrentOrganization();
  const rule = await prisma.depositRule.findFirst({
    where: { organizationId: organization.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ rule });
}

export async function PUT(req: NextRequest) {
  const organization = await requireCurrentOrganization();
  try {
    await requireOwnerSession(organization.id);
  } catch (err) {
    return authzErrorResponse(err);
  }
  const body = await req.json();

  const type = body.type === "flat" ? "flat" : "percentage";
  const amount = typeof body.amount === "number" && !Number.isNaN(body.amount) ? body.amount : 25;
  const isActive = typeof body.isActive === "boolean" ? body.isActive : true;

  const existing = await prisma.depositRule.findFirst({
    where: { organizationId: organization.id },
    orderBy: { createdAt: "desc" },
  });

  const rule = existing
    ? await prisma.depositRule.update({
        where: { id: existing.id },
        data: { type, amount, isActive },
      })
    : await prisma.depositRule.create({
        data: { organizationId: organization.id, type, amount, isActive },
      });

  return NextResponse.json({ rule });
}
