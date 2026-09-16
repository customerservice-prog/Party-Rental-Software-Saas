import { NextRequest, NextResponse } from "next/server";
import { requireCurrentOrganization } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const organization = await requireCurrentOrganization();
  const itemId = new URL(req.url).searchParams.get("itemId");
  if (!itemId) return NextResponse.json({ error: "Item is required" }, { status: 400 });

  const [item, depositRule, addons] = await Promise.all([
    prisma.item.findFirst({
      where: {
        id: itemId,
        organizationId: organization.id,
        displayToCustomer: true,
        status: "available",
      },
      select: { id: true, name: true, cost: true, picture: true },
    }),
    prisma.depositRule.findFirst({
      where: { organizationId: organization.id, isActive: true },
      orderBy: { createdAt: "desc" },
      select: { type: true, amount: true, isActive: true },
    }),
    prisma.addon.findMany({
      where: { organizationId: organization.id, itemId },
      select: { id: true, name: true, price: true, isRequired: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!item) return NextResponse.json({ error: "This rental is not available for online booking" }, { status: 404 });

  return NextResponse.json({
    item,
    depositRule,
    addons,
    checkout: {
      flatDeliveryFee: organization.flatDeliveryFee || 0,
      taxRate: organization.taxRate || 0,
      contractTerms: organization.contractTerms || null,
      businessName: organization.name,
      primaryColor: organization.primaryColor || "#2563eb",
    },
  });
}
