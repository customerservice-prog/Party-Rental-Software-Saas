import { NextRequest, NextResponse } from "next/server";
import { requireCurrentOrganization } from "@/lib/tenant";
import { requirePermission, authzErrorResponse } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromise;

  const organization = await requireCurrentOrganization();
  try { await requirePermission(organization.id, "orders.view"); } catch (err) { return authzErrorResponse(err); }
  const order = await prisma.order.findFirst({ where: { id: params.id, organizationId: organization.id }, select: { id: true } });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  const payments = await prisma.payment.findMany({ where: { orderId: order.id, organizationId: organization.id }, orderBy: { createdAt: "desc" } });
  return NextResponse.json({ payments });
}

export async function POST(request: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromise;

  const organization = await requireCurrentOrganization(); let user;
  try { user = await requirePermission(organization.id, "orders.manage"); } catch (err) { return authzErrorResponse(err); }
  const body = await request.json();
  const amount = typeof body.amount === "number" ? Math.round(body.amount * 100) / 100 : NaN;
  if (!amount || amount <= 0) return NextResponse.json({ error: "Enter an amount greater than $0" }, { status: 400 });
  const allowedMethods = ["card", "cash", "check", "ach", "store_credit", "other"];
  const method = typeof body.method === "string" && allowedMethods.includes(body.method) ? body.method : "other";
  const type = body.type === "refund" ? "refund" : "payment";
  const tip = typeof body.tip === "number" && body.tip > 0 ? Math.round(body.tip * 100) / 100 : 0;
  const note = typeof body.note === "string" && body.note.trim() ? body.note.trim().slice(0, 500) : null;
  try {
    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({ where: { id: params.id, organizationId: organization.id } });
      if (!order) throw new Error("ORDER_NOT_FOUND");
      if (type === "refund" && amount > order.amountPaid + 0.001) throw new Error("REFUND_EXCEEDS_PAID");
      const dbUser = await tx.user.findUnique({ where: { id: user.id }, select: { name: true } });
      const payment = await tx.payment.create({ data: { organizationId: organization.id, orderId: order.id, amount, type, method, tip, note, recordedBy: dbUser?.name || null } });
      const delta = type === "refund" ? -amount : amount;
      const amountPaid = Math.max(0, Math.round((order.amountPaid + delta) * 100) / 100);
      await tx.order.update({ where: { id: order.id }, data: { amountPaid } });
      await tx.auditLog.create({ data: { organizationId: organization.id, action: type === "refund" ? "order.payment.refund" : "order.payment.recorded", performedBy: user.id, details: JSON.stringify({ orderId: order.id, paymentId: payment.id, amount, method, tip }) } });
      return { payment, amountPaid };
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof Error && err.message === "ORDER_NOT_FOUND") return NextResponse.json({ error: "Order not found" }, { status: 404 });
    if (err instanceof Error && err.message === "REFUND_EXCEEDS_PAID") return NextResponse.json({ error: "Refund cannot exceed the amount currently paid on this order" }, { status: 400 });
    throw err;
  }
}

export async function DELETE(request: NextRequest, { params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = await paramsPromise;

  const organization = await requireCurrentOrganization(); let user;
  try { user = await requirePermission(organization.id, "orders.manage"); } catch (err) { return authzErrorResponse(err); }
  const paymentId = request.nextUrl.searchParams.get("paymentId");
  if (!paymentId) return NextResponse.json({ error: "Missing paymentId" }, { status: 400 });
  try {
    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({ where: { id: params.id, organizationId: organization.id } });
      if (!order) throw new Error("ORDER_NOT_FOUND");
      const payment = await tx.payment.findFirst({ where: { id: paymentId, orderId: order.id, organizationId: organization.id } });
      if (!payment) throw new Error("PAYMENT_NOT_FOUND");
      await tx.payment.delete({ where: { id: payment.id } });
      const delta = payment.type === "refund" ? payment.amount : -payment.amount;
      const amountPaid = Math.max(0, Math.round((order.amountPaid + delta) * 100) / 100);
      await tx.order.update({ where: { id: order.id }, data: { amountPaid } });
      await tx.auditLog.create({ data: { organizationId: organization.id, action: "order.payment.deleted", performedBy: user.id, details: JSON.stringify({ orderId: order.id, paymentId: payment.id, amount: payment.amount, type: payment.type, method: payment.method }) } });
      return { ok: true, amountPaid };
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof Error && err.message === "ORDER_NOT_FOUND") return NextResponse.json({ error: "Order not found" }, { status: 404 });
    if (err instanceof Error && err.message === "PAYMENT_NOT_FOUND") return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    throw err;
  }
}
