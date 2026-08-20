import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClientIp } from "@/lib/loginSecurity";

// TEMPORARY debug/admin utility for verifying the login-throttle feature
// during development. Lets us inspect and reset the caller's own IP's
// LoginThrottle row without waiting out the 15-minute lockout window in
// real time. Safe to remove once the feature has been fully verified in
// production (see also /api/admin/sync-schema and /api/admin/unblock-billing,
// which are temporary utilities of the same kind).

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const row = await prisma.loginThrottle.findUnique({ where: { ip } });
  return NextResponse.json({ ip, row });
}

export async function DELETE(req: NextRequest) {
  const ip = getClientIp(req);
  await prisma.loginThrottle.deleteMany({ where: { ip } });
  return NextResponse.json({ ok: true, ip });
}
