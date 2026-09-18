import { NextRequest, NextResponse } from "next/server";
import { createHash, randomBytes, randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { requireCurrentOrganization } from "@/lib/tenant";
import { requirePermission, authzErrorResponse } from "@/lib/authz";

type PortalRow = {
  id: string;
  expiresAt: Date;
  revokedAt: Date | null;
  lastViewedAt: Date | null;
  createdAt: Date;
};

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const org = await requireCurrentOrganization();
  try { await requirePermission(org.id, "orders.view"); } catch (err) { return authzErrorResponse(err); }
  const order = await prisma.order.findFirst({ where: { id: params.id, organizationId: org.id }, select: { id: true } });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  const rows = await prisma.$queryRawUnsafe<PortalRow[]>(
    `SELECT "id","expiresAt","revokedAt","lastViewedAt","createdAt" FROM "CustomerPortalAccess" WHERE "organizationId"=$1 AND "orderId"=$2 ORDER BY "createdAt" DESC LIMIT 1`,
    org.id, order.id
  );
  const latest = rows[0] || null;
  return NextResponse.json({
    hasActiveLink: !!latest && !latest.revokedAt && new Date(latest.expiresAt) > new Date(),
    expiresAt: latest?.expiresAt || null,
    lastViewedAt: latest?.lastViewedAt || null,
    createdAt: latest?.createdAt || null,
  });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const org = await requireCurrentOrganization();
  let user;
  try { user = await requirePermission(org.id, "orders.manage"); } catch (err) { return authzErrorResponse(err); }
  const order = await prisma.order.findFirst({ where: { id: params.id, organizationId: org.id }, select: { id: true, eventDate: true, eventEndDate: true } });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const now = new Date();
  const eventBase = order.eventEndDate || order.eventDate;
  const afterEvent = new Date(eventBase.getTime() + 60 * 24 * 60 * 60 * 1000);
  const minimum = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const expiresAt = afterEvent > minimum ? afterEvent : minimum;
  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const id = randomUUID();

  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(
      `UPDATE "CustomerPortalAccess" SET "revokedAt"=CURRENT_TIMESTAMP WHERE "organizationId"=$1 AND "orderId"=$2 AND "revokedAt" IS NULL`,
      org.id, order.id
    );
    await tx.$executeRawUnsafe(
      `INSERT INTO "CustomerPortalAccess" ("id","organizationId","orderId","tokenHash","createdBy","expiresAt") VALUES ($1,$2,$3,$4,$5,$6)`,
      id, org.id, order.id, tokenHash, user.id, expiresAt
    );
    await tx.auditLog.create({
      data: { organizationId: org.id, action: "customer_portal.link_created", performedBy: user.id, details: JSON.stringify({ orderId: order.id, expiresAt: expiresAt.toISOString() }) },
    });
  });

  const origin = req.nextUrl.origin;
  return NextResponse.json({ url: `${origin}/portal/${token}`, expiresAt });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const org = await requireCurrentOrganization();
  let user;
  try { user = await requirePermission(org.id, "orders.manage"); } catch (err) { return authzErrorResponse(err); }
  const order = await prisma.order.findFirst({ where: { id: params.id, organizationId: org.id }, select: { id: true } });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`UPDATE "CustomerPortalAccess" SET "revokedAt"=CURRENT_TIMESTAMP WHERE "organizationId"=$1 AND "orderId"=$2 AND "revokedAt" IS NULL`, org.id, order.id);
    await tx.auditLog.create({ data: { organizationId: org.id, action: "customer_portal.link_revoked", performedBy: user.id, details: JSON.stringify({ orderId: order.id }) } });
  });
  return NextResponse.json({ ok: true });
}
