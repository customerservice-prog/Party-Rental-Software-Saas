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
    },
  });

  if (!organization) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  return NextResponse.json({ organization });
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  await requirePlatformAdmin();

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const organization = await prisma.organization.update({
    where: { id: params.id },
    data: parsed.data,
  });

  return NextResponse.json({ organization });
}
