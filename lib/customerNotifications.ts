import { prisma } from "@/lib/prisma";
import { sendEmailViaResend, textToHtml } from "@/lib/email";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type OrderNotificationArgs = {
  organizationId: string;
  orderId: string;
  automationType: string;
  subject: string;
  bodyText: string;
  createdBy: string;
};

/**
 * Sends (or honestly queues) a transactional customer email and records it in
 * SentMessage. The caller never needs access to tenant credentials. This is
 * intentionally email-only until a tenant-owned SMS provider is connected.
 */
export async function sendOrderNotification(args: OrderNotificationArgs) {
  const order = await prisma.order.findFirst({
    where: { id: args.orderId, organizationId: args.organizationId },
    include: { customer: true, organization: true },
  });
  if (!order) return { status: "skipped", reason: "order_not_found" } as const;

  const toAddress = (order.customer.email || "").trim();
  if (!EMAIL_RE.test(toAddress)) return { status: "skipped", reason: "invalid_email" } as const;

  const blocked = await prisma.doNotRentRestriction.findFirst({
    where: {
      organizationId: args.organizationId,
      isActive: true,
      email: { equals: toAddress, mode: "insensitive" },
    },
    select: { id: true },
  });
  if (blocked) return { status: "skipped", reason: "restricted_customer" } as const;

  // A driver status transition is one-way, but this extra guard protects
  // against client retries or duplicated requests producing duplicate emails.
  const existing = await prisma.sentMessage.findFirst({
    where: {
      organizationId: args.organizationId,
      customerId: order.customerId,
      automationType: args.automationType,
      subject: args.subject,
    },
    select: { id: true, status: true },
  });
  if (existing) return { status: existing.status, duplicate: true } as const;

  const org = order.organization;
  let status = "queued";
  let providerError: string | null = null;
  if (org.resendApiKey && org.senderEmail) {
    const result = await sendEmailViaResend({
      apiKey: org.resendApiKey,
      from: `${org.senderName || org.name} <${org.senderEmail}>`,
      to: toAddress,
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
      organizationId: args.organizationId,
      channel: "email",
      toName: `${order.customer.firstName} ${order.customer.lastName}`.trim(),
      toAddress,
      subject: args.subject,
      body: args.bodyText,
      status,
      providerError,
      customerId: order.customerId,
      automationType: args.automationType,
      createdBy: args.createdBy,
    },
  });

  return { status } as const;
}
