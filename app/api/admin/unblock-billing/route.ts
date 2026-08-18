import { NextResponse } from "next/server";
import { requireCurrentOrganization } from "@/lib/tenant";
import { requireOwnerSession, authzErrorResponse } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

// TEMPORARY dev/ops utility (same spirit as /api/admin/sync-schema) so the
// team's own working account doesn't get locked out by the new billing
// gate while Stripe checkout isn't wired up yet. Owner-only, scoped to the
// caller's own organization only. Marks the organization's subscription
// "active" and clears any past-due timestamp. Remove this route once real
// Stripe billing is wired up.

export async function POST() {
  const organization = await requireCurrentOrganization();
  try {
    await requireOwnerSession(organization.id);
  } catch (err) {
    return authzErrorResponse(err);
  }

  const subscription = await prisma.platformSubscription.upsert({
    where: { organizationId: organization.id },
    update: { status: "active", pastDueSince: null },
    create: { organizationId: organization.id, planTier: organization.planTier, status: "active" },
  });

  return NextResponse.json({ ok: true, subscription });
}
