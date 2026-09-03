import { NextRequest, NextResponse } from "next/server";
import { requireCurrentOrganization } from "@/lib/tenant";
import { requirePermission, authzErrorResponse } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const organization = await requireCurrentOrganization();
  const { searchParams } = new URL(req.url);
  const publishedOnly = searchParams.get("publishedOnly");
  const navOnly = searchParams.get("navOnly");

  const pages = await prisma.page.findMany({
    where: {
      organizationId: organization.id,
      ...(publishedOnly === "true" ? { isPublished: true } : {}),
      ...(navOnly === "true" ? { showInNav: true } : {}),
    },
    orderBy: { navOrder: "asc" },
  });

  return NextResponse.json({ pages });
}

export async function POST(req: NextRequest) {
  const organization = await requireCurrentOrganization();
  try {
    await requirePermission(organization.id, "pages.manage");
  } catch (err) {
    return authzErrorResponse(err);
  }
  const body = await req.json();

  if (!body.title || typeof body.title !== "string") {
    return NextResponse.json({ error: "Page title is required" }, { status: 400 });
  }
  if (!body.slug || typeof body.slug !== "string") {
    return NextResponse.json({ error: "Page slug is required" }, { status: 400 });
  }

  const slug = body.slug
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const RESERVED_SLUGS = new Set([
    "book",
    "checkout",
    "login",
    "signup",
    "onboarding",
    "admin",
    "platform-setup",
    "api",
    "dashboard",
    "rentals",
  ]);
  if (RESERVED_SLUGS.has(slug)) {
    return NextResponse.json(
      { error: "That page address is reserved. Choose a different one." },
      { status: 400 }
    );
  }

  const existing = await prisma.page.findFirst({
    where: { organizationId: organization.id, slug },
  });
  if (existing) {
    return NextResponse.json(
      { error: "A page with that address already exists" },
      { status: 400 }
    );
  }

  const page = await prisma.page.create({
    data: {
      organizationId: organization.id,
      slug,
      title: body.title,
      navLabel: typeof body.navLabel === "string" && body.navLabel ? body.navLabel : body.title,
      navOrder: typeof body.navOrder === "number" ? body.navOrder : 0,
      showInNav: typeof body.showInNav === "boolean" ? body.showInNav : true,
      isPublished: typeof body.isPublished === "boolean" ? body.isPublished : true,
      content: typeof body.content === "string" ? body.content : "[]",
    },
  });

  return NextResponse.json({ page }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const organization = await requireCurrentOrganization();
  try {
    await requirePermission(organization.id, "pages.manage");
  } catch (err) {
    return authzErrorResponse(err);
  }
  const body = await req.json();

  if (!body.id || typeof body.id !== "string") {
    return NextResponse.json({ error: "Page id is required" }, { status: 400 });
  }

  const existing = await prisma.page.findFirst({
    where: { id: body.id, organizationId: organization.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Page not found" }, { status: 404 });
  }

  const data: Record<string, unknown> = {};
  if (typeof body.title === "string") data.title = body.title;
  if (typeof body.navLabel === "string") data.navLabel = body.navLabel;
  if (typeof body.navOrder === "number") data.navOrder = body.navOrder;
  if (typeof body.showInNav === "boolean") data.showInNav = body.showInNav;
  if (typeof body.isPublished === "boolean") data.isPublished = body.isPublished;
  if (typeof body.content === "string") data.content = body.content;
  if (typeof body.slug === "string" && body.slug) {
    const slug = body.slug
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "");
    const conflict = await prisma.page.findFirst({
      where: { organizationId: organization.id, slug, NOT: { id: body.id } },
    });
    if (conflict) {
      return NextResponse.json(
        { error: "A page with that address already exists" },
        { status: 400 }
      );
    }
    data.slug = slug;
  }

  const page = await prisma.page.update({ where: { id: body.id }, data });

  return NextResponse.json({ page });
}

export async function DELETE(req: NextRequest) {
  const organization = await requireCurrentOrganization();
  try {
    await requirePermission(organization.id, "pages.manage");
  } catch (err) {
    return authzErrorResponse(err);
  }
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Page id is required" }, { status: 400 });
  }

  const existing = await prisma.page.findFirst({
    where: { id, organizationId: organization.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Page not found" }, { status: 404 });
  }

  await prisma.page.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
