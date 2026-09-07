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

try {
  const portalSession = await stripe.billingPortal.sessions.create({
    customer: subscription.stripeCustomerId,
    return_url: `${appUrl}/dashboard/settings/billing`,
  });

  return NextResponse.json({ url: portalSession.url });
} catch (err) {
  console.error("Failed to create billing portal session", err);

  const message = err instanceof Error ? err.message : "";

  if (message.includes("No such customer")) {
    await prisma.platformSubscription.update({
      where: { organizationId: organization.id },
      data: { stripeCustomerId: null },
    });

  return NextResponse.json(
    { error: "Your billing account needs to be reconnected. Please choose a plan again to continue." },
    { status: 409 }
    );
  }

  return NextResponse.json(
    { error: "We could not open the billing portal right now. Please try again in a moment or contact support." },
    { status: 502 }
    );
}
}
