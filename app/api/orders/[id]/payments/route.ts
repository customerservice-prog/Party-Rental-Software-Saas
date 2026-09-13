import { NextRequest, NextResponse } from "next/server";
import { requireCurrentOrganization } from "@/lib/tenant";
import { requirePermission, authzErrorResponse } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

// Staff-recorded payments and refunds against a specific order. Each row is
// a real transaction typed in by staff (amount, method, optional tip and
// note) - never fabricated or auto-generated. Recording a payment increases
// Order.amountPaid; recording a refund decreases it (floored at 0). This is
// the source of truth behind the Payments & Balances report views in
// /dashboard/reports. See prisma/schema.prisma Payment model.

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const organization = await requireCurrentOrganization();
  try {
    await requirePermission(organization.id, "orders.view");
  } catch (err) {
    return authzErrorResponse(err);
  }

  const order = await prisma.order.findFirst({
    where: { id: params.id, organizationId: organization.id },
    select: { id: true },
  });
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const payments = await prisma.payment.findMany({
    where: { orderId: order.id, organizationId: organization.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ payments });
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const organization = await requireCurrentOrganization();
  let user;
  try {
    user = await requirePermission(organization.id, "orders.manage");
  } catch (err) {
    return authzErrorResponse(err);
  }

  const order = await prisma.order.findFirst({
    where: { id: params.id, organizationId: organization.id },
  });
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const body = await request.json();
  const { amount, method, type, tip, note } = body;

  const parsedAmount = typeof amount === "number" ? Math.round(amount * 100) / 100 : NaN;
  if (!parsedAmount || parsedAmount <= 0) {
    return NextResponse.json({ error: "Enter a payment amount greater than $0" }, { status: 400 });
  }

  const allowedMethods = ["card", "cash", "check", "other"];
  const paymentMethod = typeof method === "string" && allowedMethods.includes(method) ? method : "other";

  const paymentType = type === "refund" ? "refund" : "payment";

  const parsedTip = typeof tip === "number" && tip > 0 ? Math.round(tip * 100) / 100 : 0;

  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { name: true } });

  const payment = await prisma.payment.create({
    data: {
      organizationId: organization.id,
      orderId: order.id,
      amount: parsedAmount,
      type: paymentType,
      method: paymentMethod,
      tip: parsedTip,
      note: typeof note === "string" && note.trim() ? note.trim().slice(0, 500) : null,
      recordedBy: dbUser?.name || null,
    },
  });

  const delta = paymentType === "refund" ? -parsedAmount : parsedAmount;
  const newAmountPaid = Math.max(0, Math.round((order.amountPaid + delta) * 100) / 100);

  await prisma.order.update({
    where: { id: order.id },
    data: { amountPaid: newAmountPaid },
  });

  return NextResponse.json({ payment, amountPaid: newAmountPaid });
}

// Deletes a payment/refund entry that was recorded in error, reversing its
// effect on Order.amountPaid. Uses the same "orders.manage" permission as
// recording one - this is a correction tool for staff, not a customer
// self-service action, and every deletion here is an explicit staff choice
// (never automatic).
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const organization = await requireCurrentOrganization();
  try {
    await requirePermission(organization.id, "orders.manage");
  } catch (err) {
    return authzErrorResponse(err);
  }

  const order = await prisma.order.findFirst({
    where: { id: params.id, organizationId: organization.id },
  });
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const paymentId = request.nextUrl.searchParams.get("paymentId");
  if (!paymentId) {
    return NextResponse.json({ error: "Missing paymentId" }, { status: 400 });
  }

  const payment = await prisma.payment.findFirst({
    where: { id: paymentId, orderId: order.id, organizationId: organization.id },
  });
  if (!payment) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  await prisma.payment.delete({ where: { id: payment.id } });

  const delta = payment.type === "refund" ? payment.amount : -payment.amount;
  const newAmountPaid = Math.max(0, Math.round((order.amountPaid + delta) * 100) / 100);

  await prisma.order.update({
    where: { id: order.id },
    data: { amountPaid: newAmountPaid },
  });

  return NextResponse.json({ ok: true, amountPaid: newAmountPaid });
}
