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

// Paths that stay platform-level even when a tenant_slug cookie is present.
const PLATFORM_ONLY_PATH_PREFIXES = [
  "/signup",
  "/login",
  "/admin",
  "/platform-setup",
  "/api/admin",
  "/api/signup",
];

function isPlatformOnlyPath(pathname: string) {
  return PLATFORM_ONLY_PATH_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
}

export function middleware(req: NextRequest) {
  const host = req.headers.get("host") || "";
  const isPlatformHost = PLATFORM_ONLY_HOSTS.has(host);
  const url = req.nextUrl.clone();
  const pathname = url.pathname;

  // Path-based tenant routing, e.g. /t/acme/dashboard.
  // This lets tenants be reached even when wildcard subdomains are not
  // available on the current hosting domain. Once a real custom domain
  // with wildcard DNS is configured, subdomain routing below takes over
  // and this path-based mode becomes optional.
  const pathTenantMatch = pathname.match(/^\/t\/([a-zA-Z0-9-]+)((?:\/.*)?)$/);
  if (isPlatformHost && pathTenantMatch) {
    const slug = pathTenantMatch[1];
    const rest = pathTenantMatch[2] || "";
    url.pathname = rest === "" ? "/" : rest;

    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("x-tenant-slug", slug);

    const response = NextResponse.rewrite(url, {
      request: { headers: requestHeaders },
    });
    // Remember this tenant so plain relative links (e.g. "/dashboard")
    // keep working after the initial /t/<slug> visit.
    response.cookies.set("tenant_slug", slug, { path: "/", sameSite: "lax" });
    return response;
  }

  // Platform marketing site / signup / login / super-admin - no tenant context.
  if (isPlatformHost && isPlatformOnlyPath(pathname)) {
    return NextResponse.next();
  }

  // Custom domain or subdomain -> resolve tenant slug.
  let tenantSlug: string | null = null;
  if (!isPlatformHost && host.endsWith(`.${ROOT_DOMAIN}`)) {
    tenantSlug = host.replace(`.${ROOT_DOMAIN}`, "");
  }

  const requestHeaders = new Headers(req.headers);

  if (tenantSlug) {
    requestHeaders.set("x-tenant-slug", tenantSlug);
  } else if (isPlatformHost) {
    // Fall back to a tenant remembered from a previous /t/<slug> visit.
    const cookieSlug = req.cookies.get("tenant_slug")?.value;
    if (cookieSlug) {
      requestHeaders.set("x-tenant-slug", cookieSlug);
    } else {
      requestHeaders.set("x-tenant-domain", host);
    }
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
