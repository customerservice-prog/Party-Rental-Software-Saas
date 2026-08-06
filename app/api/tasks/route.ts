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
  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get("orderId");
  const customerId = searchParams.get("customerId");

  const tasks = await prisma.task.findMany({
    where: {
      organizationId: organization.id,
      ...(orderId ? { orderId } : {}),
      ...(customerId ? { customerId } : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ tasks });
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
    return NextResponse.json({ error: "Task title is required" }, { status: 400 });
  }

  const task = await prisma.task.create({
    data: {
      organizationId: organization.id,
      title: body.title,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      assignedTo: typeof body.assignedTo === "string" ? body.assignedTo : null,
      customerId: typeof body.customerId === "string" ? body.customerId : null,
      orderId: typeof body.orderId === "string" ? body.orderId : null,
    },
  });

  return NextResponse.json({ task }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const organization = await requireCurrentOrganization();
  try {
    await requireStaffSession(organization.id);
  } catch (err) {
    return authzErrorResponse(err);
  }
  const body = await req.json();

  if (!body.id || typeof body.id !== "string") {
    return NextResponse.json({ error: "Task id is required" }, { status: 400 });
  }

  const existing = await prisma.task.findFirst({
    where: { id: body.id, organizationId: organization.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const data: Record<string, unknown> = {};
  if (typeof body.title === "string") data.title = body.title;
  if (typeof body.isDone === "boolean") data.isDone = body.isDone;
  if (typeof body.assignedTo === "string") data.assignedTo = body.assignedTo;
  if (body.dueDate !== undefined) data.dueDate = body.dueDate ? new Date(body.dueDate) : null;

  const task = await prisma.task.update({ where: { id: body.id }, data });

  return NextResponse.json({ task });
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
    return NextResponse.json({ error: "Task id is required" }, { status: 400 });
  }

  const existing = await prisma.task.findFirst({
    where: { id, organizationId: organization.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  await prisma.task.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
