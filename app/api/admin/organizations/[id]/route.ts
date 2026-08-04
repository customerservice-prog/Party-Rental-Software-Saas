import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/admin";

// Platform-admin-only endpoint for managing a single tenant organization:
// suspending/reactivating it and changing its plan tier. Suspended
// organizations are treated as unresolvable tenants (see lib/tenant.ts),
// which blocks their storefront, login, and checkout.
const updateSchema = z.object({
  status: z.enum(["active", "suspended"]).optional(),
  planTier: z.string().min(1).optional(),
});

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  await requirePlatformAdmin();

  const organization = await prisma.organization.findUnique({
    where: { id: params.id },
    include: {
      _count: { select: { users: true, customers: true, orders: true } },
      subscription: true,
    },
  });

  if (!organization) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  const revenue = await prisma.order.aggregate({
    where: { organizationId: params.id },
    _sum: { totalAmount: true, amountPaid: true },
  });

  return NextResponse.json({ organization, revenue: revenue._sum });
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await requirePlatformAdmin();

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const before = await prisma.organization.findUnique({
    where: { id: params.id },
  });

  const organization = await prisma.organization.update({
    where: { id: params.id },
    data: parsed.data,
  });

  const changes: string[] = [];
  if (before && parsed.data.status && parsed.data.status !== before.status) {
    changes.push(`status: ${before.status} -> ${parsed.data.status}`);
  }
  if (before && parsed.data.planTier && parsed.data.planTier !== before.planTier) {
    changes.push(`planTier: ${before.planTier} -> ${parsed.data.planTier}`);
  }

  if (changes.length > 0) {
    await prisma.auditLog.create({
      data: {
        organizationId: organization.id,
        action: "update_organization",
        performedBy: (session.user as any)?.name || "platform_admin",
        details: changes.join(", "),
      },
    });
  }

  return NextResponse.json({ organization });
}
