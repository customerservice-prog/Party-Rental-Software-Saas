import { headers } from "next/headers";
import { getServerSession } from "next-auth";
import { prisma } from "./prisma";
import { authOptions } from "./auth";

/**
 * Resolves the current Organization (tenant) for a request based on the
 * x-tenant-slug / x-tenant-domain headers set by middleware.ts.
 *
 * Every server component / route handler that touches business data
 * (Category, Item, Customer, Order, etc.) should call this first and use
 * the returned organization.id to scope every Prisma query. Never trust a
 * tenant id passed in from the client directly - always resolve it here
 * from the authenticated request context.
 */
export async function getCurrentOrganization() {
        const headerList = headers();
        const slug = headerList.get("x-tenant-slug");
        const domain = headerList.get("x-tenant-domain");

  if (slug) {
            const org = await prisma.organization.findUnique({ where: { slug } });
            if (org) {
                        return org.status !== "suspended" ? org : null;
            }
  }

  if (domain) {
            const org = await prisma.organization.findUnique({ where: { customDomain: domain } });
            if (org) {
                        return org.status !== "suspended" ? org : null;
            }
  }

  // No tenant could be resolved from the request host (e.g. this app is
  // deployed on a single default domain with no per-tenant subdomains
  // configured), or the header pointed at a host that isn't registered to
  // any organization (e.g. the raw platform hostname). Fall back to the
  // organization the signed-in user authenticated into, which is stored
  // on their session/JWT, so we don't depend on subdomain routing to know
  // who the user's tenant is.
  const session = await getServerSession(authOptions);
        const organizationId = (session?.user as any)?.organizationId;
        if (organizationId) {
                  const org = await prisma.organization.findUnique({ where: { id: organizationId } });
                  return org && org.status !== "suspended" ? org : null;
        }

  return null;
}

/**
 * Convenience helper for route handlers / server actions that require a
 * tenant to exist. Throws if no tenant could be resolved so callers don't
 * accidentally run un-scoped queries.
 */
export async function requireCurrentOrganization() {
        const org = await getCurrentOrganization();
        if (!org) {
                  throw new Error("No tenant could be resolved for this request");
        }
        return org;
}
