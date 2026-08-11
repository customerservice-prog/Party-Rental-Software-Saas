import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  requireCurrentOrganization,
  requireStaffSession,
  authzErrorResponse,
} from "@/lib/authz";
import { logActivity } from "@/lib/audit";

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

    // NOTE: Actual delivery (email/SMS provider) is not yet wired up.
    // Messages are persisted with status "queued" and will be sent once
    // provider credentials are configured.
    const message = await prisma.sentMessage.create({
      data: {
        organizationId: organization.id,
        channel,
        toName: toName || toAddress,
        toAddress,
        subject,
        body: bodyText,
        status: "queued",
        templateId: data.templateId ? String(data.templateId) : null,
        customerId: data.customerId ? String(data.customerId) : null,
        createdBy: session.id,
      },
    });

    await logActivity({
      organizationId: organization.id,
      performedBy: session.id,
      action: "Queued message",
      details: `${channel} to ${message.toAddress}`,
    });

    return NextResponse.json({ message });
  } catch (err) {
    return authzErrorResponse(err);
  }
}
