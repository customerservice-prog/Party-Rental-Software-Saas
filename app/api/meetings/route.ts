import { NextRequest, NextResponse } from "next/server";
import { requireCurrentOrganization } from "@/lib/tenant";
import { requireStaffSession, authzErrorResponse } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const organization = await requireCurrentOrganization();
  try {
    await requireStaffSession(organization.id);
  } catch (err) {
    return authzErrorResponse(err);
  }

  const meetings = await prisma.meeting.findMany({
    where: { organizationId: organization.id },
    orderBy: { scheduledAt: "asc" },
  });

  return NextResponse.json({ meetings });
}

export async function POST(req: NextRequest) {
  const organization = await requireCurrentOrganization();
  try {
    await requireStaffSession(organization.id);
  } catch (err) {
    return authzErrorResponse(err);
  }
  const body = await req.json();

  if (!body.title || typeof body.title !== "string") {
    return NextResponse.json({ error: "Meeting title is required" }, { status: 400 });
  }
  if (!body.scheduledAt) {
    return NextResponse.json({ error: "Meeting date/time is required" }, { status: 400 });
  }

  const meeting = await prisma.meeting.create({
    data: {
      organizationId: organization.id,
      title: body.title,
      scheduledAt: new Date(body.scheduledAt),
      notes: typeof body.notes === "string" ? body.notes : null,
    },
  });

  return NextResponse.json({ meeting }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const organization = await requireCurrentOrganization();
  try {
    await requireStaffSession(organization.id);
  } catch (err) {
    return authzErrorResponse(err);
  }
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Meeting id is required" }, { status: 400 });
  }

  const existing = await prisma.meeting.findFirst({
    where: { id, organizationId: organization.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  }

  await prisma.meeting.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
