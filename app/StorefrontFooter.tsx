import Link from "next/link";
import { prisma } from "@/lib/prisma";

// Shared footer for tenant storefront pages (home, book, rentals, and any
// tenant-created custom Pages). Mirrors StorefrontNav's data-fetching
// pattern so nav and footer quick links always stay in sync automatically.
//
// Only ever renders real, tenant-provided information - every contact
// field is optional and simply omitted if the tenant hasn't filled it in
// (never fabricated placeholder text, reviews, or claims).
//
// The accent color mirrors the tenant's chosen brand color
// (Organization.primaryColor, set in Settings), matching StorefrontNav and
// the rest of the storefront instead of a fixed platform blue.
export default async function StorefrontFooter({
  organizationId,
}: {
  organizationId: string;
}) {
  const [organization, pages] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        name: true,
        tagline: true,
        primaryColor: true,
        contactEmail: true,
        contactPhone: true,
        address: true,
        city: true,
        state: true,
        zip: true,
        facebookUrl: true,
        instagramUrl: true,
      },
    }),
    prisma.page.findMany({
      where: { organizationId, showInNav: true, isPublished: true },
      orderBy: { navOrder: "asc" },
    }),
  ]);

  if (!organization) return null;

  const accent = organization.primaryColor || "#4f46e5";
  const hasContact =
    organization.address || organization.contactPhone || organization.contactEmail;
  const hasSocial = organization.facebookUrl || organization.instagramUrl;

  return (
    <footer className="border-t bg-gray-50 mt-auto" style={{ "--brand": accent } as any}>
      <div className="max-w-6xl mx-auto px-4 py-10 grid grid-cols-1 sm:grid-cols-3 gap-8 text-sm">
        <div>
          <div className="font-bold text-gray-900">{organization.name}</div>
          {organization.tagline && (
            <p className="text-gray-500 mt-1">{organization.tagline}</p>
          )}
        </div>

        <div>
          <div className="font-semibold text-gray-900 mb-2">Quick Links</div>
          <ul className="space-y-1 text-gray-600">
            <li>
              <Link href="/" className="hover:text-[var(--brand)]">
                Home
              </Link>
            </li>
            <li>
              <Link href="/book" className="hover:text-[var(--brand)]">
                Book Now
              </Link>
            </li>
            <li>
              <Link href="/order-status" className="hover:text-[var(--brand)]">
                Track Order
              </Link>
            </li>
            {pages.map((page) => (
              <li key={page.id}>
                <Link href={"/" + page.slug} className="hover:text-[var(--brand)]">
                  {page.navLabel || page.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {(hasContact || hasSocial) && (
          <div>
            <div className="font-semibold text-gray-900 mb-2">Contact</div>
            <ul className="space-y-1 text-gray-600">
              {organization.address && (
                <li>
                  {organization.address}
                  {organization.city ? ", " + organization.city : ""}
                  {organization.state ? ", " + organization.state : ""}{" "}
                  {organization.zip || ""}
                </li>
              )}
              {organization.contactPhone && (
                <li>
                  <a href={"tel:" + organization.contactPhone} className="hover:text-[var(--brand)]">
                    {organization.contactPhone}
                  </a>
                </li>
              )}
              {organization.contactEmail && (
                <li>
                  <a href={"mailto:" + organization.contactEmail} className="hover:text-[var(--brand)]">
                    {organization.contactEmail}
                  </a>
                </li>
              )}
              {hasSocial && (
                <li className="flex gap-3 pt-1">
                  {organization.facebookUrl && (
                    <a
                      href={organization.facebookUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:text-[var(--brand)]"
                    >
                      Facebook
                    </a>
                  )}
                  {organization.instagramUrl && (
                    <a
                      href={organization.instagramUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:text-[var(--brand)]"
                    >
                      Instagram
                    </a>
                  )}
                </li>
              )}
            </ul>
          </div>
        )}
      </div>
      <div className="border-t">
        <div className="max-w-6xl mx-auto px-4 py-4 text-xs text-gray-400">
          © {new Date().getFullYear()} {organization.name}. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
