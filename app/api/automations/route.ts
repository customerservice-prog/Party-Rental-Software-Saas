import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCurrentOrganization } from "@/lib/tenant";
import { requirePermission, requireOwnerSession, authzErrorResponse } from "@/lib/authz";
import { logActivity } from "@/lib/audit";
import { runBookingAutomations } from "@/lib/automations";

export async function GET() {
  try {
    const organization = await requireCurrentOrganization();
    await requirePermission(organization.id, "customers.message");

    const [confirmationsSentCount, remindersSentCount, recent] = await Promise.all([
      prisma.sentMessage.count({
        where: { organizationId: organization.id, automationType: "booking_confirmation" },
      }),
      prisma.sentMessage.count({
        where: { organizationId: organization.id, automationType: "event_reminder" },
      }),
      prisma.sentMessage.findMany({
        where: { organizationId: organization.id, automationType: { not: null } },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
    ]);

    return NextResponse.json({
      autoConfirmationEnabled: organization.autoConfirmationEnabled,
      autoReminderEnabled: organization.autoReminderEnabled,
      reminderDaysBefore: organization.reminderDaysBefore,
      automationsLastRunAt: organization.automationsLastRunAt,
      emailProviderConfigured: Boolean(organization.resendApiKey && organization.senderEmail),
      confirmationsSentCount,
      remindersSentCount,
      recent,
    });
  } catch (err) {
    return authzErrorResponse(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const organization = await requireCurrentOrganization();
    const session = await requireOwnerSession(organization.id);
    const body = await req.json();

    const data: Record<string, boolean | number> = {};
    if (typeof body.autoConfirmationEnabled === "boolean") {
      data.autoConfirmationEnabled = body.autoConfirmationEnabled;
    }
    if (typeof body.autoReminderEnabled === "boolean") {
      data.autoReminderEnabled = body.autoReminderEnabled;
    }
    if (
      typeof body.reminderDaysBefore === "number" &&
      Number.isFinite(body.reminderDaysBefore) &&
      body.reminderDaysBefore >= 1 &&
      body.reminderDaysBefore <= 30
    ) {
      data.reminderDaysBefore = Math.round(body.reminderDaysBefore);
    }

    await prisma.organization.update({ where: { id: organization.id }, data });
    await logActivity({
      organizationId: organization.id,
      performedBy: session.id,
      action: "Updated automation settings",
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return authzErrorResponse(err);
  }
}

export async function POST() {
  try {
    const organization = await requireCurrentOrganization();
    await requirePermission(organization.id, "customers.message");
    // Manual "Run now" - bypass the min-interval throttle by clearing
    // automationsLastRunAt first so this always actually executes.
    await prisma.organization.update({
      where: { id: organization.id },
      data: { automationsLastRunAt: null },
    });
    const result = await runBookingAutomations(organization.id);
    return NextResponse.json(result);
  } catch (err) {
    return authzErrorResponse(err);
  }
}
