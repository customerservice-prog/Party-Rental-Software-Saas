import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Root domain the platform is served from, e.g. "ourplatform.com".
// Requests to "acme.ourplatform.com" resolve to tenant slug "acme".
const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "localhost:3000";

// Paths that are platform-level (not tenant storefronts), e.g. marketing site,
// tenant signup, and the platform super-admin area.
const PLATFORM_ONLY_HOSTS = new Set([
    ROOT_DOMAIN,
    `www.${ROOT_DOMAIN}`,
  ]);

export function middleware(req: NextRequest) {
    const host = req.headers.get("host") || "";

  // Platform marketing site / signup / super-admin - no tenant context.
  if (PLATFORM_ONLY_HOSTS.has(host)) {
        return NextResponse.next();
  }

  // Custom domain or subdomain -> resolve tenant slug.
  let tenantSlug: string | null = null;

  if (host.endsWith(`.${ROOT_DOMAIN}`)) {
        // Subdomain-based tenant, e.g. acme.ourplatform.com
      tenantSlug = host.replace(`.${ROOT_DOMAIN}`, "");
  } else {
        // Treat as a fully custom domain (e.g. rentals.acmeparty.com).
      // Actual lookup of custom domain -> tenant happens in the route handler
      // / data layer, since middleware should stay fast and stateless here.
      tenantSlug = null;
  }

  // Pass tenant context down via request header so server components /
  // route handlers can scope every database query to this tenant.
  const requestHeaders = new Headers(req.headers);
    if (tenantSlug) {
          requestHeaders.set("x-tenant-slug", tenantSlug);
    } else {
          requestHeaders.set("x-tenant-domain", host);
    }

  return NextResponse.next({
        request: { headers: requestHeaders },
  });
}

export const config = {
    matcher: [
          "/((?!_next/static|_next/image|favicon.ico).*)",
        ],
};
