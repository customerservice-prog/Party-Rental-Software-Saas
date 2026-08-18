import { NextRequest, NextResponse } from "next/server";
import { requireCurrentOrganization } from "@/lib/tenant";
import { requireOwnerSession, authzErrorResponse } from "@/lib/authz";
import { logActivity } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { isValidPermissionCode } from "@/lib/permissions";

// Custom staff roles per organization. Only owners can create, edit, or
// remove roles - this lets an owner build a role like "Dispatcher" or
// "Front Desk" with only the permissions that role needs, instead of every
// staff login being all-or-nothing.

function slugify(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return base || "role";
}

export async function GET() {
  const organization = await requireCurrentOrganization();
  try {
    await requireOwnerSession(organization.id);
  } catch (err) {
    return authzErrorResponse(err);
  }

  const roles = await prisma.tenantRole.findMany({
    where: { organizationId: organization.id },
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { users: true } } },
  });

  return NextResponse.json({ roles });
}

export async function POST(req: NextRequest) {
  const organization = await requireCurrentOrganization();
  let session;
  try {
    session = await requireOwnerSession(organization.id);
  } catch (err) {
    return authzErrorResponse(err);
  }

  const body = await req.json();
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const rawPermissions = Array.isArray(body.permissions) ? body.permissions : [];
  const permissions = rawPermissions.filter(
    (code: unknown): code is string => typeof code === "string" && isValidPermissionCode(code)
  );

  if (!name) {
    return NextResponse.json({ error: "Role name is required." }, { status: 400 });
  }

  const baseSlug = slugify(name);
  let slug = baseSlug;
  let attempt = 1;
  while (
    await prisma.tenantRole.findUnique({
      where: { organizationId_slug: { organizationId: organization.id, slug } },
    })
  ) {
    attempt += 1;
    slug = baseSlug + "-" + attempt;
  }

  const created = await prisma.tenantRole.create({
    data: {
      organizationId: organization.id,
      name,
      slug,
      permissions,
    },
  });

  await logActivity({
    organizationId: organization.id,
    performedBy: session.id,
    action: "Created staff role",
    details: created.name + " (" + permissions.length + " permissions)",
  });
  return NextResponse.json({ role: created }, { status: 201 });
}
