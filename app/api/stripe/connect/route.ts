import { NextResponse } from "next/server";
import { requireCurrentOrganization } from "@/lib/tenant";
import { requireOwnerSession, authzErrorResponse } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

export async function GET() {
    const organization = await requireCurrentOrganization();
        try {
                    await requireOwnerSession(organization.id);
        } catch (err) {
                    return authzErrorResponse(err);
        }

  if (!organization.stripeAccountId) {
        return NextResponse.json({ connected: false });
  }

  const account = await stripe.accounts.retrieve(organization.stripeAccountId);

  return NextResponse.json({
        connected: true,
        payoutsEnabled: account.payouts_enabled,
        detailsSubmitted: account.details_submitted,
  });
}

export async function POST() {
    const organization = await requireCurrentOrganization();
        try {
                    await requireOwnerSession(organization.id);
        } catch (err) {
                    return authzErrorResponse(err);
        }

  let accountId = organization.stripeAccountId;

  if (!accountId) {
        const account = await stripe.accounts.create({
                type: "express",
                email: organization.contactEmail || undefined,
                business_profile: {
                          name: organization.name,
                },
        });
        accountId = account.id;

      await prisma.organization.update({
              where: { id: organization.id },
              data: { stripeAccountId: accountId },
      });
  }

  const appUrl = process.env.PUBLIC_BASE_URL || "";

  const accountLink = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: `${appUrl}/dashboard/settings`,
        return_url: `${appUrl}/dashboard/settings`,
        type: "account_onboarding",
  });

  return NextResponse.json({ url: accountLink.url });
}
