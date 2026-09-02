import { cookies } from "next/headers";
import crypto from "crypto";
import { prisma } from "./prisma";

// Drivers are not User accounts (no password, no NextAuth session) - they
// sign in with a per-organization PIN from /driver/login. This gives them
// their own lightweight, signed cookie session, completely separate from
// the staff dashboard's NextAuth session/permissions system, so a driver
// session can never accidentally touch owner/staff-only data or routes.
// Mirrors how the reference app's mobile API uses its own token auth
// instead of the Django control-panel session.

const COOKIE_NAME = "driver_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 14; // 14 days

function getSecret(): string {
  return process.env.NEXTAUTH_SECRET || "dev-driver-session-secret";
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", getSecret()).update(payload).digest("hex");
}

export function createDriverSessionCookieValue(driverId: string, organizationId: string): string {
  const payload = JSON.stringify({ driverId, organizationId, iat: Date.now() });
  const encoded = Buffer.from(payload, "utf8").toString("base64url");
  const signature = sign(encoded);
  return encoded + "." + signature;
}

function parseDriverSessionCookieValue(
  value: string | undefined
): { driverId: string; organizationId: string } | null {
  if (!value) return null;
  const parts = value.split(".");
  if (parts.length !== 2) return null;
  const [encoded, signature] = parts;
  const expected = sign(encoded);
  if (signature.length !== expected.length) return null;
  const isValid = crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  if (!isValid) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    if (!payload?.driverId || !payload?.organizationId) return null;
    return { driverId: payload.driverId, organizationId: payload.organizationId };
  } catch {
    return null;
  }
}

export const DRIVER_SESSION_COOKIE = COOKIE_NAME;
export const DRIVER_SESSION_MAX_AGE = MAX_AGE_SECONDS;

// Reads the driver session cookie and loads the underlying Driver row,
// confirming it (and its organization) are still active. Returns null for
// any failure case - no cookie, bad signature, deactivated driver, or
// suspended tenant - so every caller can treat those identically (redirect
// to /driver/login) instead of crashing.
export async function getCurrentDriver() {
  const cookieStore = cookies();
  const raw = cookieStore.get(COOKIE_NAME)?.value;
  const parsed = parseDriverSessionCookieValue(raw);
  if (!parsed) return null;

  const driver = await prisma.driver.findFirst({
    where: { id: parsed.driverId, organizationId: parsed.organizationId, isActive: true },
    include: { organization: true },
  });
  if (!driver || driver.organization.status === "suspended") return null;

  return driver;
}
