import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  createDriverSessionCookieValue,
  DRIVER_SESSION_COOKIE,
  DRIVER_SESSION_MAX_AGE,
} from "@/lib/driverSession";

// Driver sign-in: business subdomain + PIN (no NextAuth, no User row -
// drivers authenticate completely separately from staff logins). Both the
// wrong-subdomain and wrong-PIN cases return the same generic error so a
// visitor can't use this to probe which subdomains exist.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const tenantSlug = String(body.tenantSlug || "").trim().toLowerCase();
  const pin = String(body.pin || "").trim();

  if (!tenantSlug || !pin) {
    return NextResponse.json(
      { error: "Enter your business subdomain and PIN." },
      { status: 400 }
    );
  }

  const organization = await prisma.organization.findUnique({ where: { slug: tenantSlug } });
  if (!organization || organization.status === "suspended") {
    return NextResponse.json({ error: "Invalid subdomain or PIN." }, { status: 401 });
  }

  const driver = await prisma.driver.findFirst({
    where: { organizationId: organization.id, pin, isActive: true },
  });
  if (!driver) {
    return NextResponse.json({ error: "Invalid subdomain or PIN." }, { status: 401 });
  }

  const cookieValue = createDriverSessionCookieValue(driver.id, organization.id);
  const res = NextResponse.json({ ok: true, driver: { id: driver.id, name: driver.name } });
  res.cookies.set(DRIVER_SESSION_COOKIE, cookieValue, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DRIVER_SESSION_MAX_AGE,
  });
  return res;
}
