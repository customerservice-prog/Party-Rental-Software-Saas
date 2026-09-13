import { NextRequest, NextResponse } from "next/server";
import { requireCurrentOrganization } from "@/lib/tenant";
import { requireOwnerSession, authzErrorResponse } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/audit";

export async function GET() {
  const organization = await requireCurrentOrganization();
  const {
    name, slug, logoUrl, primaryColor, tagline, heroImageUrl, seoTitle,
    seoDescription, aboutText, contractTerms, facebookUrl, instagramUrl,
    showHoursOnSite, flatDeliveryFee, taxRate, contactEmail, contactPhone,
    address, city, state, zip, timezone, resendApiKey, senderEmail, senderName,
  } = organization;
  // The Resend API key is a tenant-owned secret the tenant typed in
  // themselves - never send the raw value back to the browser. Only a
  // masked hint (last 4 characters) and a boolean are exposed, so the
  // Settings page can show "Connected (...ab12)" without ever displaying
  // or round-tripping the real key. See app/dashboard/settings/page.tsx.
  const emailProviderConfigured = Boolean(resendApiKey);
  const resendApiKeyLast4 = resendApiKey ? resendApiKey.slice(-4) : "";
  return NextResponse.json({
    organization: {
      name, slug, logoUrl, primaryColor, tagline, heroImageUrl, seoTitle,
      seoDescription, aboutText, contractTerms, facebookUrl, instagramUrl,
      showHoursOnSite, flatDeliveryFee, taxRate, contactEmail, contactPhone,
      address, city, state, zip, timezone, senderEmail, senderName,
      emailProviderConfigured, resendApiKeyLast4,
    },
  });
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
    "seoTitle",
    "seoDescription",
    "aboutText",
    "contractTerms",
    "facebookUrl",
    "instagramUrl",
    "senderEmail",
    "senderName",
  ];

  const data: Record<string, string | boolean | number | null> = {};
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
  // The Resend API key is only ever updated when the owner types a brand
  // new, non-empty value in Settings - the Settings page never pre-fills
  // this field with the real key, so an untouched/blank field can never
  // accidentally overwrite or wipe out an already-connected key. A
  // separate explicit "disconnect" action clears it.
  if (typeof body.resendApiKey === "string" && body.resendApiKey.trim()) {
    data.resendApiKey = body.resendApiKey.trim();
  }
  if (body.disconnectEmailProvider === true) {
    data.resendApiKey = null;
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
