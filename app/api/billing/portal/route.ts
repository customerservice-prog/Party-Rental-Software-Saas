import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCurrentOrganization } from "@/lib/tenant";
import { requireOwnerSession, authzErrorResponse } from "@/lib/authz";
import { stripe } from "@/lib/stripe";

// Creates a Stripe Billing Portal session so an organization owner can
// update payment methods, view invoices, change plans, or cancel their
// Party Rental CRM subscription without needing a support ticket.

export async function POST() {
  const organization = await requireCurrentOrganization();
  try {
    await requireOwnerSession(organization.id);
  } catch (err) {
    return authzErrorResponse(err);
  }

const subscription = await prisma.platformSubscription.findUnique({
  where: { organizationId: organization.id },
});

if (!subscription?.stripeCustomerId) {
  return NextResponse.json(
    { error: "No billing account found yet. Start a plan first before managing billing." },
    { status: 400 }
    );
}

const appUrl = process.env.PUBLIC_BASE_URL || "";

const portalSession = await stripe.billingPortal.sessions.create({
  customer: subscription.stripeCustomerId,
  return_url: `${appUrl}/dashboard/settings/billing`,
});

return NextResponse.json({ url: portalSession.url });
}
