import { prisma } from "./prisma";

// Brute-force / abuse protection for the credentials login flow, mirroring
// the reference app's core/control_login_throttle.py:
//  - a rolling 15-minute failed-attempt counter per IP that locks sign-in
//    once too many wrong passwords have come from that address
//  - a separate 60-second burst counter per IP that caps how many login
//    POSTs (right or wrong) can be sent, to blunt scripted hammering
// State lives in the LoginThrottle table (one row per IP) instead of an
// in-memory cache, so it survives redeploys/multiple server instances.

const FAIL_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const FAIL_LIMIT = 40; // matches reference app's CONTROL_LOGIN_FAILS_PER_15_MIN default
const BURST_WINDOW_MS = 60 * 1000; // 1 minute
const BURST_LIMIT = 30; // matches reference app's CONTROL_LOGIN_POST_BURST_PER_MIN default

export const LOGIN_LOCK_MESSAGE =
  "Too many failed sign-in attempts from this network. Wait about 15 minutes and try again, or contact support.";
export const LOGIN_BURST_MESSAGE =
  "Too many login attempts from this network. Please wait a minute and try again.";

export function getClientIp(req: any): string {
  const headers = req?.headers;
  if (!headers) return "unknown";
  const get = (name: string): string | null => {
    if (typeof headers.get === "function") {
      return headers.get(name);
    }
    const value = headers[name] ?? headers[name.toLowerCase()];
    return typeof value === "string" ? value : null;
  };
  const forwarded = get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const real = get("x-real-ip");
  if (real) {
    return real.trim();
  }
  return "unknown";
}

async function getThrottle(ip: string) {
  return prisma.loginThrottle.findUnique({ where: { ip } });
}

export async function isLoginLocked(ip: string): Promise<boolean> {
  if (!ip || ip === "unknown") return false;
  const row = await getThrottle(ip);
  if (!row || !row.failExpiresAt) return false;
  if (row.failExpiresAt.getTime() < Date.now()) return false;
  return row.failCount >= FAIL_LIMIT;
}

export async function isLoginBurstLimited(ip: string): Promise<boolean> {
  if (!ip || ip === "unknown") return false;
  const row = await getThrottle(ip);
  if (!row || !row.burstExpiresAt) return false;
  if (row.burstExpiresAt.getTime() < Date.now()) return false;
  return row.burstCount >= BURST_LIMIT;
}

// Call once per incoming login POST, regardless of outcome, to track burst rate.
export async function noteLoginAttemptStart(ip: string): Promise<void> {
  if (!ip || ip === "unknown") return;
  const now = Date.now();
  const row = await getThrottle(ip);
  const burstActive = row?.burstExpiresAt && row.burstExpiresAt.getTime() >= now;
  if (!row) {
    await prisma.loginThrottle.create({
      data: { ip, burstCount: 1, burstExpiresAt: new Date(now + BURST_WINDOW_MS) },
    });
    return;
  }
  if (!burstActive) {
    await prisma.loginThrottle.update({
      where: { ip },
      data: { burstCount: 1, burstExpiresAt: new Date(now + BURST_WINDOW_MS) },
    });
  } else {
    await prisma.loginThrottle.update({
      where: { ip },
      data: { burstCount: { increment: 1 } },
    });
  }
}

// Call on a wrong username/password. Extends the 15-minute window on every
// failure (rolling lockout), same as the reference app's cache TTL reset.
export async function noteLoginFailure(ip: string): Promise<void> {
  if (!ip || ip === "unknown") return;
  const now = Date.now();
  const row = await getThrottle(ip);
  const failActive = row?.failExpiresAt && row.failExpiresAt.getTime() >= now;
  if (!row) {
    await prisma.loginThrottle.create({
      data: { ip, failCount: 1, failExpiresAt: new Date(now + FAIL_WINDOW_MS) },
    });
    return;
  }
  if (!failActive) {
    await prisma.loginThrottle.update({
      where: { ip },
      data: { failCount: 1, failExpiresAt: new Date(now + FAIL_WINDOW_MS) },
    });
  } else {
    await prisma.loginThrottle.update({
      where: { ip },
      data: { failCount: { increment: 1 }, failExpiresAt: new Date(now + FAIL_WINDOW_MS) },
    });
  }
}

// Call on a successful login to reset the failed-attempt counter for this IP.
export async function clearLoginFailures(ip: string): Promise<void> {
  if (!ip || ip === "unknown") return;
  const row = await getThrottle(ip);
  if (!row) return;
  await prisma.loginThrottle.update({
    where: { ip },
    data: { failCount: 0, failExpiresAt: null },
  });
}
