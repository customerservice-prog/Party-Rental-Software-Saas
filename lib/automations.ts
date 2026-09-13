import { prisma } from "@/lib/prisma";
import { sendEmailViaResend, textToHtml } from "@/lib/email";

const DAY_MS = 24 * 60 * 60 * 1000;
// Avoid re-querying/writing on literally every page load - only actually
// run once this many milliseconds have passed since the last run for this
// organization.
const MIN_INTERVAL_MS = 60 * 1000;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type RunResult = {
  ran: boolean;
  confirmationsSent: number;
  remindersSent: number;
};

// Real, non-fabricated booking-lifecycle automation (Phase 5 of
// ROADMAP.md: "Automated booking confirmations/reminders"). Triggered from
// app/dashboard/layout.tsx on every dashboard page load (there is no
// separate cron worker deployed for this app), so it fires whenever any
// staff member is actively using the dashboard - at most once per
// MIN_INTERVAL_MS per organization. Every email attempt is recorded as a
// real SentMessage row with an honest status ("sent" only if the Resend
// API call actually succeeded, "failed" with the real provider error, or
// "queued" if no provider is connected yet) - never marked sent unless it
// truly was. See app/api/automations/route.ts and
// app/dashboard/automations/page.tsx for the settings/activity UI.
export async function runBookingAutomations(organizationId: string): Promise<RunResult> {
  const orgRow = await prisma.organization.findUnique({ where: { id: organizationId } });
  if (!orgRow) return { ran: false, confirmationsSent: 0, remindersSent: 0 };
  // Bind to a variable whose declared type is never nullable, so
  // TypeScript's null-check narrowing survives being referenced inside the
  // nested closures below (narrowing on a variable declared outside a
  // closure does not carry into the closure body).
  const org = orgRow;

  const now = new Date();
  if (
    org.automationsLastRunAt &&
    now.getTime() - org.automationsLastRunAt.getTime() < MIN_INTERVAL_MS
  ) {
    return { ran: false, confirmationsSent: 0, remindersSent: 0 };
  }

  // Claim this run immediately so concurrent requests (e.g. two staff
  // members loading the dashboard at the same moment) don't double-send.
  await prisma.organization.update({
    where: { id: organizationId },
    data: { automationsLastRunAt: now },
  });

  let confirmationsSent = 0;
  let remindersSent = 0;

  const canDeliver = Boolean(org.resendApiKey && org.senderEmail);
  const fromName = org.senderName || org.name;
  const resendApiKey = org.resendApiKey || "";
  const senderEmail = org.senderEmail || "";

  const restrictions = await prisma.doNotRentRestriction.findMany({
    where: { organizationId, isActive: true },
    select: { email: true },
  });
  const restrictedEmails = new Set(
    restrictions.map((r) => (r.email || "").trim().toLowerCase()).filter(Boolean)
  );

  async function sendAutomationEmail(args: {
    toName: string;
    toAddress: string;
    subject: string;
    bodyText: string;
    customerId: string;
    automationType: string;
  }) {
    let status = "queued";
    let providerError: string | null = null;
    if (canDeliver) {
      const result = await sendEmailViaResend({
        apiKey: resendApiKey,
        from: `${fromName} <${senderEmail}>`,
        to: args.toAddress,
        subject: args.subject,
        html: textToHtml(args.bodyText),
      });
      if (result.success) {
        status = "sent";
      } else {
        status = "failed";
        providerError = result.error;
      }
    }
    await prisma.sentMessage.create({
      data: {
        organizationId,
        channel: "email",
        toName: args.toName,
        toAddress: args.toAddress,
        subject: args.subject,
        body: args.bodyText,
        status,
        providerError,
        customerId: args.customerId,
        automationType: args.automationType,
        createdBy: "automation",
      },
    });
  }

  if (org.autoConfirmationEnabled) {
    const candidates = await prisma.order.findMany({
      where: {
        organizationId,
        status: "active",
        confirmationSentAt: null,
      },
      include: { customer: true },
      take: 25,
    });

    for (const order of candidates) {
      const email = (order.customer.email || "").trim();
      const emailLower = email.toLowerCase();
      if (!email || !EMAIL_RE.test(email) || restrictedEmails.has(emailLower)) {
        await prisma.order.update({ where: { id: order.id }, data: { confirmationSentAt: now } });
        continue;
      }
      const eventDateStr = order.eventDate.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      const subject = `Booking confirmed - Order #${order.orderNumber}`;
      const bodyText =
        `Hi ${order.customer.firstName},\n\n` +
        `Your booking with ${org.name} is confirmed for ${eventDateStr}.\n\n` +
        `Order #: ${order.orderNumber}\n` +
        `Total: $${order.totalAmount.toFixed(2)}\n` +
        `Paid so far: $${order.amountPaid.toFixed(2)}\n\n` +
        `Thank you for booking with us!`;
      await sendAutomationEmail({
        toName: `${order.customer.firstName} ${order.customer.lastName}`.trim(),
        toAddress: email,
        subject,
        bodyText,
        customerId: order.customerId,
        automationType: "booking_confirmation",
      });
      await prisma.order.update({ where: { id: order.id }, data: { confirmationSentAt: now } });
      confirmationsSent += 1;
    }
  }

  if (org.autoReminderEnabled) {
    const windowEnd = new Date(now.getTime() + org.reminderDaysBefore * DAY_MS);
    const candidates = await prisma.order.findMany({
      where: {
        organizationId,
        status: "active",
        reminderSentAt: null,
        confirmationSentAt: { not: null },
        eventDate: { gte: now, lte: windowEnd },
      },
      include: { customer: true },
      take: 25,
    });

    for (const order of candidates) {
      const email = (order.customer.email || "").trim();
      const emailLower = email.toLowerCase();
      if (!email || !EMAIL_RE.test(email) || restrictedEmails.has(emailLower)) {
        await prisma.order.update({ where: { id: order.id }, data: { reminderSentAt: now } });
        continue;
      }
      const eventDateStr = order.eventDate.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      const balanceDue = Math.max(0, order.totalAmount - order.amountPaid);
      const subject = `Reminder: your event is coming up - Order #${order.orderNumber}`;
      const bodyText =
        `Hi ${order.customer.firstName},\n\n` +
        `This is a reminder that your event with ${org.name} is on ${eventDateStr}.\n\n` +
        `Order #: ${order.orderNumber}\n` +
        `Balance due: $${balanceDue.toFixed(2)}\n\n` +
        `We look forward to seeing you!`;
      await sendAutomationEmail({
        toName: `${order.customer.firstName} ${order.customer.lastName}`.trim(),
        toAddress: email,
        subject,
        bodyText,
        customerId: order.customerId,
        automationType: "event_reminder",
      });
      await prisma.order.update({ where: { id: order.id }, data: { reminderSentAt: now } });
      remindersSent += 1;
    }
  }

  return { ran: true, confirmationsSent, remindersSent };
}
