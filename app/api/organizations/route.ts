import { NextRequest, NextResponse } from "next/server";
import { requireCurrentOrganization } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const organization = await requireCurrentOrganization();
  return NextResponse.json({ organization });
}

export async function PATCH(req: NextRequest) {
  const organization = await requireCurrentOrganization();
  const body = await req.json();

  const allowedStringFields = [
    "name",
    "contactEmail",
    "contactPhone",
    "address",
    "city",
    "state",
    "zip",
    "timezone",
    "logoUrl",
    "primaryColor",
    "tagline",
    "heroImageUrl",
    "aboutText",
    "facebookUrl",
    "instagramUrl",
  ];

  const data: Record<string, string | boolean> = {};
  for (const field of allowedStringFields) {
    if (typeof body[field] === "string") {
      data[field] = body[field];
    }
  }
  if (typeof body.showHoursOnSite === "boolean") {
    data.showHoursOnSite = body.showHoursOnSite;
  }

  const updated = await prisma.organization.update({
    where: { id: organization.id },
    data,
  });

  return NextResponse.json({ organization: updated });
}
