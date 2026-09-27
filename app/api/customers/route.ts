import { NextRequest, NextResponse } from "next/server";
import { requireCurrentOrganization } from "@/lib/tenant";
import { requireOwnerSession, requireStaffSession, authzErrorResponse } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/audit";

export async function GET(request: NextRequest) {
    const organization = await requireCurrentOrganization();
    try {
        await requireStaffSession(organization.id);
    } catch (err) {
        return authzErrorResponse(err);
    }

  const q=new URL(request.url).searchParams.get("q")?.trim().slice(0,200)||"";
  const customers = await prisma.customer.findMany({
        where: { organizationId: organization.id, ...(q?{OR:[
          {firstName:{contains:q,mode:"insensitive"}},
          {lastName:{contains:q,mode:"insensitive"}},
          {email:{contains:q,mode:"insensitive"}},
          {phone:{contains:q,mode:"insensitive"}},
        ]}:{}) },
        orderBy: { createdAt: "desc" },
        ...(q?{take:20}:{}),
  });

  return NextResponse.json(customers);
}

export async function POST(request: NextRequest) {
    const organization = await requireCurrentOrganization();
    try {
        await requireStaffSession(organization.id);
    } catch (err) {
        return authzErrorResponse(err);
    }
    const body = await request.json();

  const { firstName, lastName, email, phone, address, leadSource } = body;

  if (!firstName || !lastName || !email) {
        return NextResponse.json(
          { error: "First name, last name, and email are required" },
          { status: 400 }
              );
  }

  const customer = await prisma.customer.create({
        data: {
                organizationId: organization.id,
                firstName,
                lastName,
                email,
                phone: phone || null,
                address: address || null,
                leadSource: leadSource || "other",
        },
  });

  return NextResponse.json(customer, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const organization = await requireCurrentOrganization();
  let session;
  try {
    session = await requireOwnerSession(organization.id);
  } catch (err) {
    return authzErrorResponse(err);
  }
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Customer id is required" }, { status: 400 });
  }

  const existing = await prisma.customer.findFirst({
    where: { id, organizationId: organization.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  const orderCount = await prisma.order.count({ where: { customerId: id } });
  if (orderCount > 0) {
    return NextResponse.json(
      { error: "Cannot delete a customer with existing orders" },
      { status: 400 }
    );
  }

  await prisma.customer.delete({ where: { id } });

  await logActivity({
    organizationId: organization.id,
    performedBy: session.id,
    action: "Deleted customer",
    details: existing.firstName + " " + existing.lastName,
  });

  return NextResponse.json({ success: true });
}
