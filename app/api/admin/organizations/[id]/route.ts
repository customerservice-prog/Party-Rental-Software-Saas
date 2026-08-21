import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/admin";

// Platform-admin-only endpoint for managing a single tenant organization:
// suspending/reactivating it, changing its plan tier, and manually managing
// its platform billing subscription. Manual subscription management exists
// because Stripe billing is not wired up yet - until then, this is how the
// team marks a tenant paid after receiving payment another way, extends a
// trial, or clears a past-due lock without waiting on live Stripe webhooks.
const updateSchema = z.object({
  status: z.enum(["active", "suspended"]).optional(),
  planTier: z.string().min(1).optional(),
  trialEndsAt: z.string().optional().nullable(),
  subscriptionStatus: z
    .enum(["trialing", "active", "past_due", "trial_ended", "unpaid", "canceled"])
    .optional(),
  subscriptionPlanTier: z.string().min(1).optional(),
  currentPeriodEnd: z.string().optional().nullable(),
});

function parseDateOrNull(value: string | null | undefined): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

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

  const data = parsed.data;

  const before = await prisma.organization.findUnique({
    where: { id: params.id },
    include: { subscription: true },
  });

  if (!before) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  const orgUpdateData: any = {};
  if (data.status !== undefined) orgUpdateData.status = data.status;
  if (data.planTier !== undefined) orgUpdateData.planTier = data.planTier;
  const trialEndsAt = parseDateOrNull(data.trialEndsAt);
  if (trialEndsAt !== undefined) orgUpdateData.trialEndsAt = trialEndsAt;

  const changes: string[] = [];
  if (data.status && data.status !== before.status) {
    changes.push(`status: ${before.status} -> ${data.status}`);
  }
  if (data.planTier && data.planTier !== before.planTier) {
    changes.push(`planTier: ${before.planTier} -> ${data.planTier}`);
  }
  if (trialEndsAt !== undefined) {
    const beforeVal = before.trialEndsAt ? before.trialEndsAt.toISOString() : "none";
    const afterVal = trialEndsAt ? trialEndsAt.toISOString() : "none";
    if (beforeVal !== afterVal) {
      changes.push(`trialEndsAt: ${beforeVal} -> ${afterVal}`);
    }
  }

  let organization: any = before;
  if (Object.keys(orgUpdateData).length > 0) {
    organization = await prisma.organization.update({
      where: { id: params.id },
      data: orgUpdateData,
      include: { subscription: true },
    });
  }

  const hasSubChange =
    data.subscriptionStatus !== undefined ||
    data.subscriptionPlanTier !== undefined ||
    data.currentPeriodEnd !== undefined;

  if (hasSubChange) {
    const existingSub = before.subscription;
    const subUpdateData: any = {};
    if (data.subscriptionPlanTier !== undefined) subUpdateData.planTier = data.subscriptionPlanTier;
    const currentPeriodEnd = parseDateOrNull(data.currentPeriodEnd);
    if (currentPeriodEnd !== undefined) subUpdateData.currentPeriodEnd = currentPeriodEnd;

    if (data.subscriptionStatus !== undefined) {
      subUpdateData.status = data.subscriptionStatus;
      const wasPastDue = existingSub?.status === "past_due";
      const willBePastDue = data.subscriptionStatus === "past_due";
      if (willBePastDue && !wasPastDue) {
        subUpdateData.pastDueSince = new Date();
      } else if (!willBePastDue) {
        subUpdateData.pastDueSince = null;
      }
    }

    const updatedSub = await prisma.platformSubscription.upsert({
      where: { organizationId: params.id },
      create: {
        organizationId: params.id,
        planTier: data.subscriptionPlanTier || "launch",
        status: data.subscriptionStatus || "trialing",
        currentPeriodEnd: currentPeriodEnd || null,
        pastDueSince: data.subscriptionStatus === "past_due" ? new Date() : null,
      },
      update: subUpdateData,
    });

    if (data.subscriptionStatus && data.subscriptionStatus !== existingSub?.status) {
      changes.push(`subscription status: ${existingSub?.status || "none"} -> ${data.subscriptionStatus}`);
    }
    if (data.subscriptionPlanTier && data.subscriptionPlanTier !== existingSub?.planTier) {
      changes.push(`subscription planTier: ${existingSub?.planTier || "none"} -> ${data.subscriptionPlanTier}`);
    }

    organization = { ...organization, subscription: updatedSub };
  } else {
    organization = { ...organization, subscription: before.subscription };
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
