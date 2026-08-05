import { NextRequest, NextResponse } from "next/server";
import { requireCurrentOrganization } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const organization = await requireCurrentOrganization();

  const businessHours = await prisma.businessHours.findMany({
    where: { organizationId: organization.id },
    orderBy: { dayOfWeek: "asc" },
  });

  return NextResponse.json({ businessHours });
}

export async function POST(req: NextRequest) {
  const organization = await requireCurrentOrganization();
  const body = await req.json();

  if (typeof body.dayOfWeek !== "number" || body.dayOfWeek < 0 || body.dayOfWeek > 6) {
    return NextResponse.json({ error: "dayOfWeek must be 0-6" }, { status: 400 });
  }

  const businessHours = await prisma.businessHours.upsert({
    where: {
      organizationId_dayOfWeek: {
        organizationId: organization.id,
        dayOfWeek: body.dayOfWeek,
      },
    },
    update: {
      isClosed: typeof body.isClosed === "boolean" ? body.isClosed : false,
      openTime: typeof body.openTime === "string" ? body.openTime : null,
      closeTime: typeof body.closeTime === "string" ? body.closeTime : null,
    },
    create: {
      organizationId: organization.id,
      dayOfWeek: body.dayOfWeek,
      isClosed: typeof body.isClosed === "boolean" ? body.isClosed : false,
      openTime: typeof body.openTime === "string" ? body.openTime : null,
      closeTime: typeof body.closeTime === "string" ? body.closeTime : null,
    },
  });

  return NextResponse.json({ businessHours }, { status: 200 });
}
