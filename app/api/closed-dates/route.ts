import { NextRequest, NextResponse } from "next/server";
import { requireCurrentOrganization } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const organization = await requireCurrentOrganization();
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const closedDates = await prisma.closedDate.findMany({
    where: {
      organizationId: organization.id,
      ...(from && to ? { date: { gte: new Date(from), lt: new Date(to) } } : {}),
    },
    orderBy: { date: "asc" },
  });

  return NextResponse.json({ closedDates });
}

export async function POST(req: NextRequest) {
  const organization = await requireCurrentOrganization();
  const body = await req.json();

  if (!body.date) {
    return NextResponse.json({ error: "date is required" }, { status: 400 });
  }

  const closedDate = await prisma.closedDate.create({
    data: {
      organizationId: organization.id,
      date: new Date(body.date),
      note: typeof body.note === "string" ? body.note : null,
    },
  });

  return NextResponse.json({ closedDate }, { status: 201 });
}
