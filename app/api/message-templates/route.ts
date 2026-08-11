import { NextRequest, NextResponse } from "next/server";
import { requireCurrentOrganization } from "@/lib/tenant";
import { requireOwnerSession, authzErrorResponse } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/audit";

export async function GET() {
  const organization = await requireCurrentOrganization();

  const templates = await prisma.messageTemplate.findMany({
    where: { organizationId: organization.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(templates);
}

export async function POST(req: NextRequest) {
  const organization = await requireCurrentOrganization();
  let session;
  try {
    session = await requireOwnerSession(organization.id);
  } catch (err) {
    return authzErrorResponse(err);
  }
  const body = await req.json();

  const name = (body.name || "").trim();
  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  const messageBody = (body.body || "").trim();
  if (!messageBody) {
    return NextResponse.json({ error: "Body is required" }, { status: 400 });
  }

  const existing = await prisma.messageTemplate.findFirst({
    where: { organizationId: organization.id, name },
  });
  if (existing) {
    return NextResponse.json({ error: "A template with that name already exists" }, { status: 400 });
  }

  const template = await prisma.messageTemplate.create({
    data: {
      organizationId: organization.id,
      name,
      channel: body.channel || "email",
      subject: body.subject || null,
      body: messageBody,
      category: body.category || "general",
      isActive: body.isActive !== false,
    },
  });

  await logActivity({
    organizationId: organization.id,
    performedBy: session.id,
    action: "Created message template",
    details: name,
  });

  return NextResponse.json(template);
}

export async function PATCH(req: NextRequest) {
  const organization = await requireCurrentOrganization();
  let session;
  try {
    session = await requireOwnerSession(organization.id);
  } catch (err) {
    return authzErrorResponse(err);
  }
  const body = await req.json();

  if (!body.id) {
    return NextResponse.json({ error: "Template id is required" }, { status: 400 });
  }

  const existing = await prisma.messageTemplate.findFirst({
    where: { id: body.id, organizationId: organization.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  const data: Record<string, unknown> = {};
  if (typeof body.name === "string") data.name = body.name.trim();
  if (typeof body.channel === "string") data.channel = body.channel;
  if (typeof body.subject === "string") data.subject = body.subject || null;
  if (typeof body.body === "string") data.body = body.body;
  if (typeof body.category === "string") data.category = body.category;
  if (typeof body.isActive === "boolean") data.isActive = body.isActive;

  const template = await prisma.messageTemplate.update({
    where: { id: body.id },
    data,
  });

  await logActivity({
    organizationId: organization.id,
    performedBy: session.id,
    action: "Updated message template",
    details: template.name,
  });

  return NextResponse.json(template);
}

export async function DELETE(req: NextRequest) {
  const organization = await requireCurrentOrganization();
  let session;
  try {
    session = await requireOwnerSession(organization.id);
  } catch (err) {
    return authzErrorResponse(err);
  }
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Template id is required" }, { status: 400 });
  }

  const existing = await prisma.messageTemplate.findFirst({
    where: { id, organizationId: organization.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  await prisma.messageTemplate.delete({ where: { id } });

  await logActivity({
    organizationId: organization.id,
    performedBy: session.id,
    action: "Deleted message template",
    details: existing.name,
  });

  return NextResponse.json({ success: true });
}
