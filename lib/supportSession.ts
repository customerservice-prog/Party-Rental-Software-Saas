import { createHmac, timingSafeEqual } from "crypto";

export const SUPPORT_COOKIE = "prcrm_support_tenant";
export const SUPPORT_SECONDS = 20 * 60;

function signature(payload: string) {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET is required for support sessions.");
  return createHmac("sha256", secret).update("platform-support:" + payload).digest("base64url");
}

export type SupportSession = { organizationId: string; adminId: string; userId: string; sessionVersion: number; expiresAt: number };

export function createSupportSession(organizationId: string, adminId: string, userId: string, sessionVersion: number) {
  const payload = Buffer.from(JSON.stringify({ organizationId, adminId, userId, sessionVersion, expiresAt: Date.now() + SUPPORT_SECONDS * 1000 })).toString("base64url");
  return payload + "." + signature(payload);
}

export function readSupportSession(value: string | undefined, adminId: string): string | null {
  return readSupportSessionDetails(value, adminId)?.organizationId ?? null;
}

export function readSupportSessionDetails(value: string | undefined, adminId: string): SupportSession | null {
  if (!value) return null;
  try {
    const [payload, mac, extra] = value.split(".");
    if (!payload || !mac || extra !== undefined) return null;
    const expected = Buffer.from(signature(payload));
    const actual = Buffer.from(mac);
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (data.adminId !== adminId || !Number.isFinite(data.expiresAt) || data.expiresAt <= Date.now()) return null;
    if (typeof data.organizationId !== "string" || !data.organizationId || typeof data.userId !== "string" || !data.userId || !Number.isInteger(data.sessionVersion)) return null;
    return data as SupportSession;
  } catch {
    return null;
  }
}
