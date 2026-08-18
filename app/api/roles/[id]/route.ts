import { NextRequest, NextResponse } from "next/server";
import { requireCurrentOrganization } from "@/lib/tenant";
import { requireOwnerSession, authzErrorResponse } from "@/lib/authz";
import { logActivity } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { isValidPermissionCode } from "@/lib/permissions";

// Editing and removing individual staff roles. Only an owner can perform
// these actions.

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const organization = await requireCurrentOrganization();
  let session;
  try {
    session = await requireOwnerSession(organization.id);
  } catch (err) {
    return authzErrorResponse(err);
  }

  const target = await prisma.tenantRole.findFirst({
    where: { id: params.id, organizationId: organization.id },
  });
  if (!target) {
    return NextResponse.json({ error: "Role not found." }, { status: 404 });
  }

  const body = await req.json();
  const data: { name?: string; permissions?: string[]; isActive?: boolean } = {};

  if (typeof body.name === "string" && body.name.trim()) {
    data.name = body.name.trim();
  }
  if (Array.isArray(body.permissions)) {
    data.permissions = body.permissions.filter(
      (code: unknown): code is string => typeof code === "string" && isValidPermissionCode(code)
    );
  }
  if (typeof body.isActive === "boolean") {
    data.isActive = body.isActive;
  }

  const updated = await prisma.tenantRole.update({ where: { id: target.id }, data });

  await logActivity({
    organizationId: organization.id,
    performedBy: session.id,
    action: "Updated staff role",
    details: updated.name,
  });
  return NextResponse.json({ role: updated });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const organization = await requireCurrentOrganization();
  let session;
  try {
    session = await requireOwnerSession(organization.id);
  } catch (err) {
    return authzErrorResponse(err);
  }

  const target = await prisma.tenantRole.findFirst({
    where: { id: params.id, organizationId: organization.id },
  });
  if (!target) {
    return NextResponse.json({ error: "Role not found." }, { status: 404 });
  }

  const assignedCount = await prisma.user.count({ where: { tenantRoleId: target.id } });
  if (assignedCount > 0) {
    return NextResponse.json(
      {
        error:
          "Cannot delete a role assigned to " +
          assignedCount +
          " staff account(s). Reassign them first.",
      },
      { status: 400 }
    );
  }

  await prisma.tenantRole.delete({ where: { id: target.id } });

  await logActivity({
    organizationId: organization.id,
    performedBy: session.id,
    action: "Deleted staff role",
    details: target.name,
  });
  return NextResponse.json({ ok: true });
}
