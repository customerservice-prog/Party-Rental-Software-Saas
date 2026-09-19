import { prisma } from "@/lib/prisma";
import { sendEmailViaResend, textToHtml } from "@/lib/email";
import { normalizeSmsNumber, sendSmsViaTwilio } from "@/lib/sms";

const DAY_MS = 24 * 60 * 60 * 1000;
const MIN_INTERVAL_MS = 60 * 1000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type RunResult = {
  ran: boolean;
  confirmationsSent: number;
  remindersSent: number;
  balanceRemindersSent: number;
};

// Runs tenant booking-lifecycle email automations when dashboard activity
// invokes it. "confirmed" is the current booking status; "active" remains
// included for backward compatibility with older orders created before the
// status vocabulary was standardized.
export async function runBookingAutomations(organizationId: string): Promise<RunResult> {
  const orgRow = await prisma.organization.findUnique({ where: { id: organizationId } });
  if (!orgRow) return { ran: false, confirmationsSent: 0, remindersSent: 0, balanceRemindersSent: 0 };
  const org = orgRow;

  const now = new Date();
  if (
    org.automationsLastRunAt &&
    now.getTime() - org.automationsLastRunAt.getTime() < MIN_INTERVAL_MS
  ) {
    return { ran: false, confirmationsSent: 0, remindersSent: 0, balanceRemindersSent: 0 };
  }

  await prisma.organization.update({
    where: { id: organizationId },
    data: { automationsLastRunAt: now },
  });

  let confirmationsSent = 0;
  let remindersSent = 0;
  let balanceRemindersSent = 0;

  const canDeliver = Boolean(org.resendApiKey && org.senderEmail);
  const canText = Boolean(org.twilioAccountSid && org.twilioAuthToken && org.twilioFromNumber);
  const fromName = org.senderName || org.name;
  const resendApiKey = org.resendApiKey || "";
  const senderEmail = org.senderEmail || "";

  const restrictions = await prisma.doNotRentRestriction.findMany({
    where: { organizationId, isActive: true },
    select: { email: true, phone: true },
  });
  const restrictedEmails = new Set(
    restrictions.map((r) => (r.email || "").trim().toLowerCase()).filter(Boolean)
  );
  const restrictedPhones = new Set(
    restrictions.map((r) => normalizeSmsNumber(r.phone || "")).filter(Boolean)
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
      if (result.success) status = "sent";
      else {
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

  async function sendAutomationSms(args: {
    toName: string;
    phone: string | null | undefined;
    subject: string;
    bodyText: string;
    customerId: string;
    automationType: string;
  }) {
    const toAddress = normalizeSmsNumber(args.phone || "");
    if (!canText || !toAddress || restrictedPhones.has(toAddress)) return;
    const existing = await prisma.sentMessage.findFirst({
      where: {
        organizationId,
        channel: "sms",
        customerId: args.customerId,
        automationType: args.automationType,
        subject: args.subject,
      },
      select: { id: true },
    });
    if (existing) return;
    const result = await sendSmsViaTwilio({
      accountSid: org.twilioAccountSid!,
      authToken: org.twilioAuthToken!,
      from: org.twilioFromNumber!,
      to: toAddress,
      body: args.bodyText,
    });
    await prisma.sentMessage.create({
      data: {
        organizationId,
        channel: "sms",
        toName: args.toName,
        toAddress,
        subject: args.subject,
        body: args.bodyText,
        status: result.success ? "sent" : "failed",
        providerError: result.success ? null : result.error,
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
        status: { in: ["confirmed", "active"] },
        confirmationSentAt: null,
      },
      include: { customer: true },
      take: 25,
    });

    for (const order of candidates) {
      const email = (order.customer.email || "").trim();
      const emailLower = email.toLowerCase();
      const canEmailCustomer = Boolean(email && EMAIL_RE.test(email) && !restrictedEmails.has(emailLower));
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
      if (canEmailCustomer) {
        await sendAutomationEmail({
          toName: `${order.customer.firstName} ${order.customer.lastName}`.trim(),
          toAddress: email,
          subject,
          bodyText,
          customerId: order.customerId,
          automationType: "booking_confirmation",
        });
      }
      await sendAutomationSms({
        toName: `${order.customer.firstName} ${order.customer.lastName}`.trim(),
        phone: order.customer.phone,
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
        status: { in: ["confirmed", "active"] },
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
      const canEmailCustomer = Boolean(email && EMAIL_RE.test(email) && !restrictedEmails.has(emailLower));
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
      if (canEmailCustomer) {
        await sendAutomationEmail({
          toName: `${order.customer.firstName} ${order.customer.lastName}`.trim(),
          toAddress: email,
          subject,
          bodyText,
          customerId: order.customerId,
          automationType: "event_reminder",
        });
      }
      await sendAutomationSms({
        toName: `${order.customer.firstName} ${order.customer.lastName}`.trim(),
        phone: order.customer.phone,
        subject,
        bodyText,
        customerId: order.customerId,
        automationType: "event_reminder",
      });
      await prisma.order.update({ where: { id: order.id }, data: { reminderSentAt: now } });
      remindersSent += 1;
    }
  }


  if (org.autoBalanceReminderEnabled) {
    const balanceWindowEnd = new Date(now.getTime() + org.balanceReminderDaysBefore * DAY_MS);
    const candidates = await prisma.order.findMany({
      where: {
        organizationId,
        status: { in: ["confirmed", "active"] },
        balanceReminderSentAt: null,
        eventDate: { gte: now, lte: balanceWindowEnd },
      },
      include: { customer: true },
      take: 50,
    });

    for (const order of candidates) {
      const balance = Math.max(0, order.totalAmount - order.amountPaid);
      if (balance <= 0.009) {
        await prisma.order.update({ where: { id: order.id }, data: { balanceReminderSentAt: now } });
        continue;
      }
      const email = (order.customer.email || "").trim();
      const emailLower = email.toLowerCase();
      const canEmailCustomer = Boolean(email && EMAIL_RE.test(email) && !restrictedEmails.has(emailLower));
      const eventDateStr = order.eventDate.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      const subject = `Balance due - Order #${order.orderNumber}`;
      const bodyText =
        `Hi ${order.customer.firstName},\n\n` +
        `A remaining balance of ${balance.toFixed(2)} is due for your rental with ${org.name} on ${eventDateStr}.\n\n` +
        `Order #: ${order.orderNumber}\n` +
        `Order total: ${order.totalAmount.toFixed(2)}\n` +
        `Paid so far: ${order.amountPaid.toFixed(2)}\n` +
        `Balance due: ${balance.toFixed(2)}\n\n` +
        `Please contact us if you have any questions about your balance.`;

      if (canEmailCustomer) {
        await sendAutomationEmail({
          toName: `${order.customer.firstName} ${order.customer.lastName}`.trim(),
          toAddress: email,
          subject,
          bodyText,
          customerId: order.customerId,
          automationType: "balance_due",
        });
      }
      await sendAutomationSms({
        toName: `${order.customer.firstName} ${order.customer.lastName}`.trim(),
        phone: order.customer.phone,
        subject,
        bodyText,
        customerId: order.customerId,
        automationType: "balance_due",
      });
      await prisma.order.update({ where: { id: order.id }, data: { balanceReminderSentAt: now } });
      balanceRemindersSent += 1;
    }
  }

  return { ran: true, confirmationsSent, remindersSent, balanceRemindersSent };
}
