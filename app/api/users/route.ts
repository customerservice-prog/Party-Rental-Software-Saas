import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { requireCurrentOrganization } from "@/lib/tenant";
import { requireOwnerSession, authzErrorResponse } from "@/lib/authz";
import { logActivity } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

// Staff account management - lets an Owner see, add, edit, and remove the
// logins that belong to their organization. Every handler here requires an
// owner-level session; staff accounts cannot manage other accounts.

const userSelect = {
  id: true,
  username: true,
  name: true,
  role: true,
  tenantRoleId: true,
  createdAt: true,
  tenantRole: { select: { id: true, name: true } },
} as const;

// Resolves and validates an optional tenantRoleId from a request body.
// Returns undefined when the field wasn't sent (leave unchanged), null when
// it should be cleared, or the id string when it should be set. Throws a
// plain Error with a user-facing message on invalid input.
async function resolveTenantRoleId(
  organizationId: string,
  body: Record<string, unknown>
): Promise<string | null | undefined> {
  if (!("tenantRoleId" in body)) return undefined;
  const value = body.tenantRoleId;
  if (value === null || value === "") return null;
  if (typeof value !== "string") {
    throw new Error("Invalid role selection.");
  }
  const role = await prisma.tenantRole.findFirst({
    where: { id: value, organizationId },
  });
  if (!role) {
    throw new Error("Selected role was not found.");
  }
  return role.id;
}

export async function GET() {
  const organization = await requireCurrentOrganization();
  try {
    await requireOwnerSession(organization.id);
  } catch (err) {
    return authzErrorResponse(err);
  }

  const users = await prisma.user.findMany({
    where: { organizationId: organization.id },
    orderBy: { createdAt: "asc" },
    select: userSelect,
  });

  return NextResponse.json({ users });
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
  const username = typeof body.username === "string" ? body.username.trim().toLowerCase() : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const role = body.role === "owner" ? "owner" : "staff";

  if (username.length < 3) {
    return NextResponse.json({ error: "Username must be at least 3 characters." }, { status: 400 });
  }
  if (!name) {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  let tenantRoleId: string | null = null;
  if (role === "staff") {
    try {
      const resolved = await resolveTenantRoleId(organization.id, body);
      tenantRoleId = resolved ?? null;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Invalid role selection.";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }

  const existing = await prisma.user.findUnique({
    where: { organizationId_username: { organizationId: organization.id, username } },
  });
  if (existing) {
    return NextResponse.json({ error: "That username is already taken." }, { status: 400 });
  }

  const hashed = await bcrypt.hash(password, 10);
  const created = await prisma.user.create({
    data: {
      organizationId: organization.id,
      username,
      name,
      password: hashed,
      role,
      tenantRoleId,
    },
    select: userSelect,
  });

  await logActivity({
    organizationId: organization.id,
    performedBy: session.id,
    action: "Created staff account",
    details: created.name + " (@" + created.username + ") as " + created.role,
  });
  return NextResponse.json({ user: created }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const organization = await requireCurrentOrganization();
  let actingUser;
  try {
    actingUser = await requireOwnerSession(organization.id);
  } catch (err) {
    return authzErrorResponse(err);
  }

  const body = await req.json();
  const id = typeof body.id === "string" ? body.id : "";
  if (!id) {
    return NextResponse.json({ error: "User id is required." }, { status: 400 });
  }

  const target = await prisma.user.findFirst({ where: { id, organizationId: organization.id } });
  if (!target) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const data: Record<string, unknown> = {};
  if (typeof body.name === "string" && body.name.trim()) {
    data.name = body.name.trim();
  }
  if (body.role === "owner" || body.role === "staff") {
    if (target.role === "owner" && body.role === "staff") {
      const ownerCount = await prisma.user.count({
        where: { organizationId: organization.id, role: "owner" },
      });
      if (ownerCount <= 1) {
        return NextResponse.json(
          { error: "Cannot demote the only remaining owner." },
          { status: 400 }
        );
      }
    }
    data.role = body.role;
    if (body.role === "owner") {
      data.tenantRoleId = null;
    }
  }
  if (typeof body.password === "string" && body.password.length > 0) {
    if (body.password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }
    data.password = await bcrypt.hash(body.password, 10);
  }
  if (data.role !== "owner" && (target.role === "staff" || data.role === "staff")) {
    try {
      const resolved = await resolveTenantRoleId(organization.id, body);
      if (resolved !== undefined) {
        data.tenantRoleId = resolved;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Invalid role selection.";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }

  const updated = await prisma.user.update({
    where: { id },
    data,
    select: userSelect,
  });

  await logActivity({
    organizationId: organization.id,
    performedBy: actingUser.id,
    action: "Updated staff account",
    details: updated.name + " (@" + updated.username + ") role: " + updated.role,
  });
  return NextResponse.json({ user: updated });
}

export async function DELETE(req: NextRequest) {
  const organization = await requireCurrentOrganization();
  let actingUser;
  try {
    actingUser = await requireOwnerSession(organization.id);
  } catch (err) {
    return authzErrorResponse(err);
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "User id is required." }, { status: 400 });
  }

  const target = await prisma.user.findFirst({ where: { id, organizationId: organization.id } });
  if (!target) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }
  if (target.id === actingUser.id) {
    return NextResponse.json({ error: "You cannot delete your own account." }, { status: 400 });
  }
  if (target.role === "owner") {
    const ownerCount = await prisma.user.count({
      where: { organizationId: organization.id, role: "owner" },
    });
    if (ownerCount <= 1) {
      return NextResponse.json(
        { error: "Cannot delete the only remaining owner." },
        { status: 400 }
      );
    }
  }

  await prisma.user.delete({ where: { id } });
  await logActivity({
    organizationId: organization.id,
    performedBy: actingUser.id,
    action: "Deleted staff account",
    details: target.name + " (@" + target.username + ")",
  });
  return NextResponse.json({ success: true });
}
