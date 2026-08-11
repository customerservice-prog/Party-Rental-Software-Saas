import { NextRequest, NextResponse } from "next/server";
import { requireCurrentOrganization } from "@/lib/tenant";
import { requireOwnerSession, authzErrorResponse } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/audit";

export async function GET() {
  const organization = await requireCurrentOrganization();

  const coupons = await prisma.coupon.findMany({
    where: { organizationId: organization.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ coupons });
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

  if (!body.code || typeof body.code !== "string") {
    return NextResponse.json({ error: "Coupon code is required" }, { status: 400 });
  }
  const discountAmount = Number(body.discountAmount);
  if (!discountAmount || discountAmount <= 0) {
    return NextResponse.json({ error: "Discount amount must be greater than 0" }, { status: 400 });
  }
  const discountType = body.discountType === "fixed" ? "fixed" : "percentage";
  if (discountType === "percentage" && discountAmount > 100) {
    return NextResponse.json({ error: "Percentage discount cannot exceed 100" }, { status: 400 });
  }

  const code = body.code.trim().toUpperCase();

  const existing = await prisma.coupon.findFirst({
    where: { organizationId: organization.id, code },
  });
  if (existing) {
    return NextResponse.json({ error: "A coupon with that code already exists" }, { status: 400 });
  }

  const coupon = await prisma.coupon.create({
    data: {
      organizationId: organization.id,
      code,
      discountType,
      discountAmount,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      isActive: typeof body.isActive === "boolean" ? body.isActive : true,
    },
  });

    await logActivity({ organizationId: organization.id, performedBy: session.id, action: "Created coupon", details: coupon.code });
  return NextResponse.json({ coupon }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const organization = await requireCurrentOrganization();
  try {
    await requireOwnerSession(organization.id);
  } catch (err) {
    return authzErrorResponse(err);
  }
  const body = await req.json();

  if (!body.id || typeof body.id !== "string") {
    return NextResponse.json({ error: "Coupon id is required" }, { status: 400 });
  }

  const existing = await prisma.coupon.findFirst({
    where: { id: body.id, organizationId: organization.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Coupon not found" }, { status: 404 });
  }

  const data: Record<string, unknown> = {};
  if (typeof body.isActive === "boolean") data.isActive = body.isActive;
  if (typeof body.discountAmount === "number") data.discountAmount = body.discountAmount;
  if (body.expiresAt !== undefined) data.expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;

  const coupon = await prisma.coupon.update({ where: { id: body.id }, data });

  return NextResponse.json({ coupon });
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
    return NextResponse.json({ error: "Coupon id is required" }, { status: 400 });
  }

  const existing = await prisma.coupon.findFirst({
    where: { id, organizationId: organization.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Coupon not found" }, { status: 404 });
  }

  await prisma.coupon.delete({ where: { id } });
  await logActivity({ organizationId: organization.id, performedBy: session.id, action: "Deleted coupon", details: existing.code });

  return NextResponse.json({ success: true });
}
