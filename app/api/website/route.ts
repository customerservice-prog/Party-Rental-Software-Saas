import { NextRequest, NextResponse } from "next/server";
import { requireCurrentOrganization } from "@/lib/tenant";
import { requirePermission, authzErrorResponse } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { validateSections, buildDefaultSections } from "@/lib/websiteSections";

// Powers the dashboard "Website" editor (app/dashboard/website/page.tsx).
// The public homepage (app/page.tsx) reads Website rows directly with
// Prisma and never calls this route - this is authenticated tenant-staff
// tooling only, gated on the existing "pages.manage" permission (the same
// one that already governs Website Pages / branding).

type OrgLite = {
  name: string;
  heroImageUrl: string | null;
  aboutText: string | null;
  logoUrl: string | null;
};

async function getOrCreateWebsite(organizationId: string, org: OrgLite) {
  const existing = await prisma.website.findUnique({ where: { organizationId } });
  if (existing) return existing;

  // Idempotent: if two requests race to create the first draft for this
  // organization, upsert ensures we never end up with duplicate rows (the
  // organizationId column is unique).
  return prisma.website.upsert({
    where: { organizationId },
    update: {},
    create: {
      organizationId,
      draftSections: JSON.stringify(buildDefaultSections(org)),
    },
  });
}

export async function GET() {
  const organization = await requireCurrentOrganization();
  try {
    await requirePermission(organization.id, "pages.manage");
  } catch (err) {
    return authzErrorResponse(err);
  }

  const website = await getOrCreateWebsite(organization.id, organization);

  return NextResponse.json({
    draftSections: JSON.parse(website.draftSections),
    publishedSections: website.publishedSections ? JSON.parse(website.publishedSections) : null,
    publishedAt: website.publishedAt,
    hasUnpublishedChanges: website.publishedSections !== website.draftSections,
  });
}

export async function PATCH(req: NextRequest) {
  const organization = await requireCurrentOrganization();
  try {
    await requirePermission(organization.id, "pages.manage");
  } catch (err) {
    return authzErrorResponse(err);
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  let sections;
  try {
    sections = validateSections(body.sections);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid sections";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  await getOrCreateWebsite(organization.id, organization);

  const updated = await prisma.website.update({
    where: { organizationId: organization.id },
    data: { draftSections: JSON.stringify(sections) },
  });

  return NextResponse.json({
    draftSections: JSON.parse(updated.draftSections),
    publishedSections: updated.publishedSections ? JSON.parse(updated.publishedSections) : null,
    publishedAt: updated.publishedAt,
    hasUnpublishedChanges: updated.publishedSections !== updated.draftSections,
  });
}

export async function POST(req: NextRequest) {
  const organization = await requireCurrentOrganization();
  try {
    await requirePermission(organization.id, "pages.manage");
  } catch (err) {
    return authzErrorResponse(err);
  }

  const body = await req.json().catch(() => ({}));
  const action = body?.action;

  const website = await getOrCreateWebsite(organization.id, organization);

  if (action === "publish") {
    // Atomic: the public homepage only ever reads publishedSections, so
    // customers never see a half-published mix of old and new content.
    const updated = await prisma.website.update({
      where: { organizationId: organization.id },
      data: { publishedSections: website.draftSections, publishedAt: new Date() },
    });
    return NextResponse.json({
      draftSections: JSON.parse(updated.draftSections),
      publishedSections: JSON.parse(updated.publishedSections as string),
      publishedAt: updated.publishedAt,
      hasUnpublishedChanges: false,
    });
  }

  if (action === "discard") {
    // Reset the draft back to whatever is currently live (or, if nothing
    // has ever been published yet, back to the safe generated starter).
    const fallback = website.publishedSections || JSON.stringify(buildDefaultSections(organization));
    const updated = await prisma.website.update({
      where: { organizationId: organization.id },
      data: { draftSections: fallback },
    });
    return NextResponse.json({
      draftSections: JSON.parse(updated.draftSections),
      publishedSections: updated.publishedSections ? JSON.parse(updated.publishedSections) : null,
      publishedAt: updated.publishedAt,
      hasUnpublishedChanges: updated.publishedSections !== updated.draftSections,
    });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
