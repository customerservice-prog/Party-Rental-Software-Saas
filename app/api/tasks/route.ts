import { NextRequest, NextResponse } from "next/server";
import { requireCurrentOrganization } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const organization = await requireCurrentOrganization();
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
