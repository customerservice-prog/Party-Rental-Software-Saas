import { NextRequest, NextResponse } from "next/server";
import { requireCurrentOrganization } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";

export async function GET() {
    const organization = await requireCurrentOrganization();

  const customers = await prisma.customer.findMany({
        where: { organizationId: organization.id },
        orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(customers);
}

export async function POST(request: NextRequest) {
    const organization = await requireCurrentOrganization();
    const body = await request.json();

  const { firstName, lastName, email, phone, address } = body;

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
        },
  });

  return NextResponse.json(customer, { status: 201 });
}
