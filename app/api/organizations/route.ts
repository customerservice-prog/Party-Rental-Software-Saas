import { NextRequest, NextResponse } from "next/server";
import { requireCurrentOrganization } from "@/lib/tenant";
import { requireOwnerSession, authzErrorResponse } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/audit";

export async function GET() {
  const organization = await requireCurrentOrganization();
  return NextResponse.json({ organization });
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
    "contractTerms",
    "facebookUrl",
    "instagramUrl",
  ];

  const data: Record<string, string | boolean | number> = {};
  for (const field of allowedStringFields) {
    if (typeof body[field] === "string") {
      data[field] = body[field];
    }
  }
  if (typeof body.showHoursOnSite === "boolean") {
    data.showHoursOnSite = body.showHoursOnSite;
  }
  if (typeof body.flatDeliveryFee === "number" && !Number.isNaN(body.flatDeliveryFee)) {
    data.flatDeliveryFee = body.flatDeliveryFee;
  }
  // Sales tax rate as a percentage (e.g. 8.25 means 8.25%), applied to the
  // taxable subtotal at checkout and manual order creation. See
  // lib availability/tax calculations in app/api/checkout and app/api/orders.
  if (typeof body.taxRate === "number" && !Number.isNaN(body.taxRate) && body.taxRate >= 0) {
    data.taxRate = body.taxRate;
  }

  const updated = await prisma.organization.update({
    where: { id: organization.id },
    data,
  });

  await logActivity({
    organizationId: organization.id,
    performedBy: session.id,
    action: "Updated business settings",
  });
  return NextResponse.json({ organization: updated });
}
