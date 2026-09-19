import { NextRequest, NextResponse } from "next/server";
import { requireCurrentOrganization } from "@/lib/tenant";
import { requireOwnerSession, authzErrorResponse } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/audit";

// Never send the raw Resend API key back to the browser - only a boolean
// and a last-4-characters hint. Used by both GET and PATCH responses so
// the Settings page can show "Connected (...ab12)" without ever
// round-tripping the real secret. See app/dashboard/settings/page.tsx.
function toSafeOrganization(organization: any) {
  const {
    name, slug, logoUrl, primaryColor, tagline, heroImageUrl, seoTitle,
    seoDescription, aboutText, contractTerms, facebookUrl, instagramUrl,
    showHoursOnSite, flatDeliveryFee, taxRate, contactEmail, contactPhone,
    address, city, state, zip, timezone, resendApiKey, senderEmail, senderName,
    twilioAccountSid, twilioAuthToken, twilioFromNumber,
  } = organization;
  return {
    name, slug, logoUrl, primaryColor, tagline, heroImageUrl, seoTitle,
    seoDescription, aboutText, contractTerms, facebookUrl, instagramUrl,
    showHoursOnSite, flatDeliveryFee, taxRate, contactEmail, contactPhone,
    address, city, state, zip, timezone, senderEmail, senderName, twilioFromNumber,
    emailProviderConfigured: Boolean(resendApiKey),
    resendApiKeyLast4: resendApiKey ? String(resendApiKey).slice(-4) : "",
    smsProviderConfigured: Boolean(twilioAccountSid && twilioAuthToken && twilioFromNumber),
    twilioAccountSidLast4: twilioAccountSid ? String(twilioAccountSid).slice(-4) : "",
  };
}

export async function GET() {
  const organization = await requireCurrentOrganization();
  return NextResponse.json({ organization: toSafeOrganization(organization) });
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
    "twilioFromNumber",
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

  if (typeof body.twilioAccountSid === "string" && body.twilioAccountSid.trim()) {
    data.twilioAccountSid = body.twilioAccountSid.trim();
  }
  if (typeof body.twilioAuthToken === "string" && body.twilioAuthToken.trim()) {
    data.twilioAuthToken = body.twilioAuthToken.trim();
  }
  if (body.disconnectSmsProvider === true) {
    data.twilioAccountSid = null;
    data.twilioAuthToken = null;
    data.twilioFromNumber = null;
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
  return NextResponse.json({ organization: toSafeOrganization(updated) });
}
