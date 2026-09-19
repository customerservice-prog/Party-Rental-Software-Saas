import { prisma } from "@/lib/prisma";
import { sendEmailViaResend, textToHtml } from "@/lib/email";
import { normalizeSmsNumber, sendSmsViaTwilio } from "@/lib/sms";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type OrderNotificationArgs = {
  organizationId: string;
  orderId: string;
  automationType: string;
  subject: string;
  bodyText: string;
  createdBy: string;
};

export async function sendOrderNotification(args: OrderNotificationArgs) {
  const order = await prisma.order.findFirst({
    where: { id: args.orderId, organizationId: args.organizationId },
    include: { customer: true, organization: true },
  });
  if (!order) return { status: "skipped", reason: "order_not_found" } as const;

  const email = (order.customer.email || "").trim();
  const phone = normalizeSmsNumber(order.customer.phone || "");

  const restrictions = await prisma.doNotRentRestriction.findMany({
    where: { organizationId: args.organizationId, isActive: true },
    select: { email: true, phone: true },
  });
  const restricted = restrictions.some((row) => {
    const blockedEmail = (row.email || "").trim().toLowerCase();
    const blockedPhone = normalizeSmsNumber(row.phone || "");
    return (blockedEmail && blockedEmail === email.toLowerCase()) || (blockedPhone && blockedPhone === phone);
  });
  if (restricted) return { status: "skipped", reason: "restricted_customer" } as const;

  const org = order.organization;
  const toName = `${order.customer.firstName} ${order.customer.lastName}`.trim();
  const results: Array<{ channel: "email" | "sms"; status: string; duplicate?: boolean }> = [];

  if (EMAIL_RE.test(email)) {
    const duplicate = await prisma.sentMessage.findFirst({
      where: {
        organizationId: args.organizationId,
        customerId: order.customerId,
        channel: "email",
        automationType: args.automationType,
        subject: args.subject,
      },
      select: { id: true, status: true },
    });
    if (duplicate) {
      results.push({ channel: "email", status: duplicate.status, duplicate: true });
    } else {
      let status = "queued";
      let providerError: string | null = null;
      if (org.resendApiKey && org.senderEmail) {
        const sent = await sendEmailViaResend({
          apiKey: org.resendApiKey,
          from: `${org.senderName || org.name} <${org.senderEmail}>`,
          to: email,
          subject: args.subject,
          html: textToHtml(args.bodyText),
        });
        if (sent.success) status = "sent";
        else {
          status = "failed";
          providerError = sent.error;
        }
      }
      await prisma.sentMessage.create({
        data: {
          organizationId: args.organizationId,
          channel: "email",
          toName,
          toAddress: email,
          subject: args.subject,
          body: args.bodyText,
          status,
          providerError,
          customerId: order.customerId,
          automationType: args.automationType,
          createdBy: args.createdBy,
        },
      });
      results.push({ channel: "email", status });
    }
  }

  if (phone && org.twilioAccountSid && org.twilioAuthToken && org.twilioFromNumber) {
    const duplicate = await prisma.sentMessage.findFirst({
      where: {
        organizationId: args.organizationId,
        customerId: order.customerId,
        channel: "sms",
        automationType: args.automationType,
        subject: args.subject,
      },
      select: { id: true, status: true },
    });
    if (duplicate) {
      results.push({ channel: "sms", status: duplicate.status, duplicate: true });
    } else {
      const sent = await sendSmsViaTwilio({
        accountSid: org.twilioAccountSid,
        authToken: org.twilioAuthToken,
        from: org.twilioFromNumber,
        to: phone,
        body: args.bodyText,
      });
      const status = sent.success ? "sent" : "failed";
      const providerError = sent.success ? null : sent.error;
      await prisma.sentMessage.create({
        data: {
          organizationId: args.organizationId,
          channel: "sms",
          toName,
          toAddress: phone,
          subject: args.subject,
          body: args.bodyText,
          status,
          providerError,
          customerId: order.customerId,
          automationType: args.automationType,
          createdBy: args.createdBy,
        },
      });
      results.push({ channel: "sms", status });
    }
  }

  if (!results.length) return { status: "skipped", reason: "no_reachable_channel" } as const;
  return { status: results.some((r) => r.status === "sent") ? "sent" : results[0].status, results } as const;
}
