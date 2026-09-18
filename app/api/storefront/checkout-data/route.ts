import { NextRequest, NextResponse } from "next/server";
import { requireCurrentOrganization } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const organization = await requireCurrentOrganization();
  const url = new URL(req.url);
  const singleItemId = url.searchParams.get("itemId")?.trim() || "";
  const rawIds = url.searchParams.get("itemIds") || "";
  const itemIds = Array.from(new Set((rawIds ? rawIds.split(",") : singleItemId ? [singleItemId] : []).map(v => v.trim()).filter(Boolean))).slice(0, 100);
  if (!itemIds.length) return NextResponse.json({ error: "At least one rental item is required" }, { status: 400 });

  const [items, depositRule, addons] = await Promise.all([
    prisma.item.findMany({
      where: { id: { in: itemIds }, organizationId: organization.id, displayToCustomer: true, status: "available" },
      select: { id: true, name: true, cost: true, picture: true, description: true },
    }),
    prisma.depositRule.findFirst({
      where: { organizationId: organization.id, isActive: true },
      orderBy: { createdAt: "desc" },
      select: { type: true, amount: true, isActive: true },
    }),
    prisma.addon.findMany({
      where: { organizationId: organization.id, itemId: { in: itemIds } },
      select: { id: true, itemId: true, name: true, price: true, isRequired: true },
      orderBy: [{ itemId: "asc" }, { name: "asc" }],
    }),
  ]);

  const byId = new Map(items.map(item => [item.id, item]));
  const orderedItems = itemIds.map(id => byId.get(id)).filter(Boolean);
  if (orderedItems.length !== itemIds.length) return NextResponse.json({ error: "One or more rentals are no longer available for online booking" }, { status: 404 });

  return NextResponse.json({
    item: orderedItems.length === 1 ? orderedItems[0] : null,
    items: orderedItems,
    depositRule,
    addons,
    checkout: {
      organizationId: organization.id,
      flatDeliveryFee: organization.flatDeliveryFee || 0,
      taxRate: organization.taxRate || 0,
      contractTerms: organization.contractTerms || null,
      businessName: organization.name,
      primaryColor: organization.primaryColor || "#2563eb",
    },
  });
}
