import { headers } from "next/headers";
import { prisma } from "./prisma";

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
        return prisma.organization.findUnique({ where: { slug } });
  }

  if (domain) {
        return prisma.organization.findUnique({ where: { customDomain: domain } });
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
