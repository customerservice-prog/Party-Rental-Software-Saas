import { createHash } from "crypto";
import { prisma } from "./prisma";

type AccessRow = {
  id: string;
  organizationId: string;
  orderId: string;
  expiresAt: Date;
  revokedAt: Date | null;
};

export async function resolveCustomerPortalToken(rawToken: string) {
  if (!rawToken || rawToken.length < 20 || rawToken.length > 200) return null;
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
  const rows = await prisma.$queryRawUnsafe<AccessRow[]>(
    `SELECT "id","organizationId","orderId","expiresAt","revokedAt" FROM "CustomerPortalAccess" WHERE "tokenHash"=$1 LIMIT 1`,
    tokenHash
  );
  const access = rows[0];
  if (!access || access.revokedAt || new Date(access.expiresAt) <= new Date()) return null;
  await prisma.$executeRawUnsafe(
    `UPDATE "CustomerPortalAccess" SET "lastViewedAt"=CURRENT_TIMESTAMP WHERE "id"=$1`,
    access.id
  ).catch(() => undefined);
  return access;
}
