import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCurrentOrganization } from "@/lib/tenant";
import { requireStaffSession, requireOwnerSession, authzErrorResponse } from "@/lib/authz";
import { logActivity } from "@/lib/audit";
import { sendEmailViaResend, textToHtml } from "@/lib/email";
import { normalizeSmsNumber, sendSmsViaTwilio } from "@/lib/sms";
import { platformFeatureEnabled } from "@/lib/platformControl";

export async function GET() {
  try {
    const organization = await requireCurrentOrganization();
    await requireStaffSession(organization.id);

    const messages = await prisma.sentMessage.findMany({
      where: { organizationId: organization.id },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    return NextResponse.json({ messages });
  } catch (err) {
    return authzErrorResponse(err);
  }
}

export async function POST(request: Request) {
  try {
    const organization = await requireCurrentOrganization();
    const session = await requireStaffSession(organization.id);

    const data = await request.json();
    const channel = data.channel === "sms" ? "sms" : "email";
    const toName = (data.toName || "").trim();
    const toAddress = (data.toAddress || "").trim();
    const subject = data.subject ? String(data.subject).trim() : null;
    const bodyText = (data.body || "").trim();

    if (!toAddress) {
      return NextResponse.json(
        { error: "A recipient email or phone number is required." },
        { status: 400 }
      );
    }
    if (!bodyText) {
      return NextResponse.json(
        { error: "Message body cannot be empty." },
        { status: 400 }
      );
    }

    // Real delivery only happens when the tenant has connected the matching
    // provider. Otherwise the message remains queued and is never falsely
    // reported as sent.
    let status = "queued";
    let providerError: string | null = null;
    let providerMessageId: string | null = null;
    let normalizedRecipient = toAddress;

    if (channel === "email" && organization.resendApiKey && organization.senderEmail) {
      const fromName = organization.senderName || organization.name;
      const result = await sendEmailViaResend({
        apiKey: organization.resendApiKey,
        from: `${fromName} <${organization.senderEmail}>`,
        to: toAddress,
        subject: subject || "Message from " + organization.name,
        html: textToHtml(bodyText),
      });
      if (result.success) {
        status = "sent";
        providerMessageId = result.id || null;
      } else {
        status = "failed";
        providerError = result.error;
      }
    }

    if (channel === "sms") {
      const smsEnabled = await platformFeatureEnabled("messaging.sms", organization.id, organization.planTier, true);
      if (!smsEnabled) return NextResponse.json({ error: "SMS is disabled for this organization by the platform." }, { status: 403 });
      normalizedRecipient = normalizeSmsNumber(toAddress);
      if (!normalizedRecipient || normalizedRecipient.length < 11) {
        return NextResponse.json({ error: "Enter a valid mobile phone number." }, { status: 400 });
      }
      if (organization.twilioAccountSid && organization.twilioAuthToken && organization.twilioFromNumber) {
        const result = await sendSmsViaTwilio({
          accountSid: organization.twilioAccountSid,
          authToken: organization.twilioAuthToken,
          from: organization.twilioFromNumber,
          to: normalizedRecipient,
          body: bodyText,
        });
        if (result.success) {
          status = "sent";
          providerMessageId = result.id || null;
        } else {
          status = "failed";
          providerError = result.error;
        }
      }
    }

    const message = await prisma.sentMessage.create({
      data: {
        organizationId: organization.id,
        channel,
        toName: toName || toAddress,
        toAddress: normalizedRecipient,
        subject,
        body: bodyText,
        status,
        direction: "outbound",
        fromAddress: channel === "sms" ? organization.twilioFromNumber : organization.senderEmail,
        providerMessageId,
        providerError,
        templateId: data.templateId ? String(data.templateId) : null,
        customerId: data.customerId ? String(data.customerId) : null,
        createdBy: session.id,
      },
    });

    await logActivity({
      organizationId: organization.id,
      performedBy: session.id,
      action: status === "sent" ? "Sent message" : status === "failed" ? "Failed to send message" : "Queued message",
      details: `${channel} to ${message.toAddress}${providerError ? " - " + providerError : ""}`,
    });

    return NextResponse.json({ message });
  } catch (err) {
    return authzErrorResponse(err);
  }
}

export async function DELETE(request: Request) {
  try {
    const organization = await requireCurrentOrganization();
    const session = await requireOwnerSession(organization.id);

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "A message id is required." }, { status: 400 });
    }

    const existing = await prisma.sentMessage.findFirst({
      where: { id, organizationId: organization.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Message not found." }, { status: 404 });
    }

    await prisma.sentMessage.delete({ where: { id } });

    await logActivity({
      organizationId: organization.id,
      performedBy: session.id,
      action: "Deleted message",
      details: `${existing.channel} to ${existing.toAddress}`,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return authzErrorResponse(err);
  }
}
