import { NextRequest, NextResponse } from "next/server";
import { requireCurrentOrganization } from "@/lib/tenant";
import { requirePermission, authzErrorResponse } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { validateSections, buildDefaultSections, type WebsiteSection } from "@/lib/websiteSections";

type OrgLite = { name: string; heroImageUrl: string | null; aboutText: string | null; logoUrl: string | null };

function parseSections(value: string | null | undefined): WebsiteSection[] | null {
  if (!value) return null;
  try { return validateSections(JSON.parse(value)); } catch { return null; }
}

async function authorize() {
  const organization = await requireCurrentOrganization();
  try {
    await requirePermission(organization.id, "pages.manage");
    return { organization, error: null };
  } catch (err) {
    return { organization, error: authzErrorResponse(err) };
  }
}

async function getOrCreateWebsite(organizationId: string, org: OrgLite) {
  const existing = await prisma.website.findUnique({ where: { organizationId } });
  if (existing) return existing;
  return prisma.website.upsert({
    where: { organizationId },
    update: {},
    create: { organizationId, draftSections: JSON.stringify(buildDefaultSections(org)) },
  });
}

export async function GET() {
  const { organization, error } = await authorize();
  if (error) return error;
  const website = await getOrCreateWebsite(organization.id, organization);
  const draftSections = parseSections(website.draftSections) || buildDefaultSections(organization);
  const publishedSections = parseSections(website.publishedSections);
  return NextResponse.json({
    draftSections,
    publishedSections,
    publishedAt: website.publishedAt,
    hasUnpublishedChanges: JSON.stringify(draftSections) !== JSON.stringify(publishedSections || []),
  });
}

export async function PATCH(req: NextRequest) {
  const { organization, error } = await authorize();
  if (error) return error;
  const body = await req.json().catch(() => null);
  if (!body || !("sections" in body)) return NextResponse.json({ error: "Invalid request body" }, { status: 400 });

  let sections: WebsiteSection[];
  try { sections = validateSections(body.sections); }
  catch (err) { return NextResponse.json({ error: err instanceof Error ? err.message : "Invalid sections" }, { status: 400 }); }

  await getOrCreateWebsite(organization.id, organization);
  const serialized = JSON.stringify(sections);
  const updated = await prisma.website.update({ where: { organizationId: organization.id }, data: { draftSections: serialized } });
  const publishedSections = parseSections(updated.publishedSections);
  return NextResponse.json({
    draftSections: sections,
    publishedSections,
    publishedAt: updated.publishedAt,
    hasUnpublishedChanges: serialized !== JSON.stringify(publishedSections || []),
  });
}

export async function POST(req: NextRequest) {
  const { organization, error } = await authorize();
  if (error) return error;
  const body = await req.json().catch(() => null);
  if (!body || typeof body.action !== "string") return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  const website = await getOrCreateWebsite(organization.id, organization);

  if (body.action === "publish") {
    const draft = parseSections(website.draftSections);
    if (!draft) return NextResponse.json({ error: "The current draft is invalid. Save the page again before publishing." }, { status: 409 });
    const serialized = JSON.stringify(draft);
    const updated = await prisma.website.update({
      where: { organizationId: organization.id },
      data: { draftSections: serialized, publishedSections: serialized, publishedAt: new Date() },
    });
    return NextResponse.json({ draftSections: draft, publishedSections: draft, publishedAt: updated.publishedAt, hasUnpublishedChanges: false });
  }

  if (body.action === "discard") {
    const published = parseSections(website.publishedSections);
    const draft = published || buildDefaultSections(organization);
    const serialized = JSON.stringify(draft);
    const updated = await prisma.website.update({ where: { organizationId: organization.id }, data: { draftSections: serialized } });
    return NextResponse.json({ draftSections: draft, publishedSections: published, publishedAt: updated.publishedAt, hasUnpublishedChanges: !published });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
