import { NextRequest, NextResponse } from "next/server";
import { requireCurrentOrganization } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";

// Public-facing coupon validation used by the checkout page to preview a
// discount before submitting a booking. Only returns whether the code is
// valid and its discount terms - never the full coupon list - so this is
// safe to call from an unauthenticated storefront visitor.
export async function POST(req: NextRequest) {
  const organization = await requireCurrentOrganization();
  const body = await req.json();

  const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
  if (!code) {
    return NextResponse.json({ error: "Coupon code is required" }, { status: 400 });
  }

  const coupon = await prisma.coupon.findFirst({
    where: { organizationId: organization.id, code },
  });

  const isExpired = coupon?.expiresAt ? coupon.expiresAt < new Date() : false;
  if (!coupon || !coupon.isActive || isExpired) {
    return NextResponse.json({ error: "That coupon code is invalid or has expired" }, { status: 404 });
  }

  return NextResponse.json({
    code: coupon.code,
    discountType: coupon.discountType,
    discountAmount: coupon.discountAmount,
  });
}
