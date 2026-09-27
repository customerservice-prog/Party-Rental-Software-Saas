import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCurrentOrganization } from "@/lib/tenant";
import { requireStaffSession, requireOwnerSession, authzErrorResponse } from "@/lib/authz";
import { getMarketplaceApp, MARKETPLACE_APPS, marketplacePriceCents } from "@/lib/appMarketplace";
import { provisionRentSketch, deactivateRentSketch } from "@/lib/rentSketchProvisioning";
import { getEffectivePlanCommercial } from "@/lib/platformPlans";

async function billingSummary(organizationId: string, planTier: string) {
  const subscription = await prisma.platformSubscription.findUnique({ where: { organizationId } });
  const interval = subscription?.billingInterval === "annual" ? "annual" : "monthly";
  const commercial = await getEffectivePlanCommercial(subscription?.planTier || planTier);
  const configured = interval === "annual" ? commercial.annualMonthlyPrice : commercial.monthlyPrice;
  const baseRecurringCents = configured == null ? null : Math.round(configured * (interval === "annual" ? 12 : 1) * 100);
  return { subscription, interval, baseRecurringCents };
}

export async function GET() {
  const organization = await requireCurrentOrganization();
  try { await requireStaffSession(organization.id); } catch (err) { return authzErrorResponse(err); }

  const [{ subscription, interval, baseRecurringCents }, installations] = await Promise.all([
    billingSummary(organization.id, organization.planTier),
    prisma.tenantAppInstallation.findMany({ where: { organizationId: organization.id } }),
  ]);
  const byCode = new Map(installations.map(row => [row.appCode, row]));
  const activeAppsCents = installations.filter(row => row.status === "active").reduce((sum, row) => sum + row.priceCents, 0);

  return NextResponse.json({
    billing: {
      interval,
      linked: Boolean(subscription?.stripeSubId),
      currentPeriodEnd: subscription?.currentPeriodEnd || null,
      baseRecurringCents,
      installedAppsCents: activeAppsCents,
      currentRecurringCents: baseRecurringCents == null ? null : baseRecurringCents + activeAppsCents,
      estimateOnly: true,
    },
    apps: MARKETPLACE_APPS.map(app => {
      const installation = byCode.get(app.code);
      const priceCents = marketplacePriceCents(app, interval);
      return {
        ...app,
        priceCents,
        installation: installation ? {
          status: installation.status,
          billingInterval: installation.billingInterval,
          priceCents: installation.priceCents,
          externalTenantSlug: installation.externalTenantSlug,
          externalStatus: installation.externalStatus,
          errorMessage: installation.errorMessage,
          activatedAt: installation.activatedAt,
        } : null,
        recurringAfterInstallCents: baseRecurringCents == null ? null : baseRecurringCents + activeAppsCents + (installation?.status === "active" ? 0 : priceCents),
      };
    }),
  });
}

export async function POST(request: NextRequest) {
  const organization = await requireCurrentOrganization();
  let actor;
  try { actor = await requireOwnerSession(organization.id); } catch (err) { return authzErrorResponse(err); }

  const body = await request.json();
  const app = getMarketplaceApp(typeof body.appCode === "string" ? body.appCode : "");
  if (!app) return NextResponse.json({ error: "Marketplace app not found." }, { status: 404 });

  const subscription = await prisma.platformSubscription.findUnique({ where: { organizationId: organization.id } });
  if (!subscription?.stripeSubId) {
    return NextResponse.json({ error: "A linked Party Rental CRM subscription is required before paid apps can be installed." }, { status: 409 });
  }
  if (!organization.contactEmail) {
    return NextResponse.json({ error: "Add a business contact email in Admin → Company Info before installing RentSketch." }, { status: 409 });
  }

  const interval = subscription.billingInterval === "annual" ? "annual" : "monthly";
  const priceCents = marketplacePriceCents(app, interval);
  const existing = await prisma.tenantAppInstallation.findUnique({
    where: { organizationId_appCode: { organizationId: organization.id, appCode: app.code } },
  });
  if (existing?.status === "active") return NextResponse.json({ installation: existing });

  const installation = await prisma.tenantAppInstallation.upsert({
    where: { organizationId_appCode: { organizationId: organization.id, appCode: app.code } },
    create: { organizationId: organization.id, appCode: app.code, status: "provisioning", billingInterval: interval, priceCents },
    update: { status: "provisioning", billingInterval: interval, priceCents, errorMessage: null, canceledAt: null },
  });

  try {
    if (app.code !== "rentsketch") throw new Error("Unsupported marketplace provisioner");
    const tenant = await provisionRentSketch(organization);
    const pending = await prisma.tenantAppInstallation.update({
      where: { id: installation.id },
      data: {
        status: "billing_pending",
        externalTenantId: tenant.id,
        externalTenantSlug: tenant.slug,
        externalEmbedKey: tenant.embedKey,
        externalStatus: tenant.subscriptionStatus,
        errorMessage: null,
      },
    });
    await prisma.auditLog.create({
      data: {
        organizationId: organization.id,
        action: "marketplace.app.provisioned",
        performedBy: actor.id,
        details: JSON.stringify({ appCode: app.code, installationId: pending.id, priceCents, interval }),
      },
    });
    return NextResponse.json({
      installation: pending,
      billingPending: true,
      message: "RentSketch workspace is provisioned and locked until recurring billing is attached.",
    }, { status: 202 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Marketplace provisioning failed";
    await prisma.tenantAppInstallation.update({
      where: { id: installation.id },
      data: { status: "error", errorMessage: message.slice(0, 1000) },
    });
    return NextResponse.json({ error: message === "RENTSKETCH_NOT_CONFIGURED" ? "RentSketch provisioning is not configured yet." : message }, { status: 502 });
  }
}

export async function DELETE(request: NextRequest) {
  const organization = await requireCurrentOrganization();
  let actor;
  try { actor = await requireOwnerSession(organization.id); } catch (err) { return authzErrorResponse(err); }

  const appCode = request.nextUrl.searchParams.get("appCode") || "";
  const app = getMarketplaceApp(appCode);
  if (!app) return NextResponse.json({ error: "Marketplace app not found." }, { status: 404 });

  const installation = await prisma.tenantAppInstallation.findUnique({
    where: { organizationId_appCode: { organizationId: organization.id, appCode: app.code } },
  });
  if (!installation) return NextResponse.json({ ok: true });
  if (installation.status === "active" && installation.stripeSubscriptionItemId) {
    return NextResponse.json({ error: "Active marketplace billing must be removed before this app can be canceled." }, { status: 409 });
  }

  try {
    if (installation.externalTenantId && app.code === "rentsketch") await deactivateRentSketch(organization.id);
  } catch {}

  const updated = await prisma.tenantAppInstallation.update({
    where: { id: installation.id },
    data: { status: "canceled", externalStatus: "canceled", canceledAt: new Date(), errorMessage: null },
  });
  await prisma.auditLog.create({
    data: { organizationId: organization.id, action: "marketplace.app.canceled", performedBy: actor.id, details: JSON.stringify({ appCode: app.code, installationId: updated.id }) },
  });
  return NextResponse.json({ installation: updated });
}
