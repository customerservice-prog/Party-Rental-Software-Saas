import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { requireCurrentOrganization } from "@/lib/tenant";
import { requireOwnerSession, authzErrorResponse } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

// Staff account management - lets an Owner see, add, edit, and remove the
// logins that belong to their organization. Every handler here requires an
// owner-level session; staff accounts cannot manage other accounts.

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
    select: { id: true, username: true, name: true, role: true, createdAt: true },
  });

  return NextResponse.json({ users });
}

export async function POST(req: NextRequest) {
  const organization = await requireCurrentOrganization();
  try {
    await requireOwnerSession(organization.id);
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
    },
    select: { id: true, username: true, name: true, role: true, createdAt: true },
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

  const data: Record<string, string> = {};
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

  const updated = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, username: true, name: true, role: true, createdAt: true },
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
  return NextResponse.json({ success: true });
}
