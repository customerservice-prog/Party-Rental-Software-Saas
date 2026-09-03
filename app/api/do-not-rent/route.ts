import { NextRequest, NextResponse } from "next/server";
import { requireCurrentOrganization } from "@/lib/tenant";
import { requirePermission, authzErrorResponse } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const organization = await requireCurrentOrganization();
  try {
    await requirePermission(organization.id, "do_not_rent.manage");
    } catch (err) {
    return authzErrorResponse(err);
    }
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim().toLowerCase();

  const restrictions = await prisma.doNotRentRestriction.findMany({
    where: {
      organizationId: organization.id,
      ...(q
          ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
              { phone: { contains: q, mode: "insensitive" } },
              { address: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
    orderBy: { createdAt: "desc" },
    });

  return NextResponse.json({ restrictions });
  }

export async function POST(req: NextRequest) {
  const organization = await requireCurrentOrganization();
  try {
    await requirePermission(organization.id, "do_not_rent.manage");
    } catch (err) {
    return authzErrorResponse(err);
    }
  const body = await req.json();

  const name = typeof body.name === "string" && body.name.trim() ? body.name.trim() : null;
  const email = typeof body.email === "string" && body.email.trim() ? body.email.trim().toLowerCase() : null;
  const phone = typeof body.phone === "string" && body.phone.trim() ? body.phone.trim() : null;
  const address = typeof body.address === "string" && body.address.trim() ? body.address.trim() : null;
  const reason = typeof body.reason === "string" && body.reason.trim() ? body.reason.trim() : null;

  if (!email && !phone && !address) {
    return NextResponse.json(
      { error: "Provide at least an email, phone, or address to restrict" },
      { status: 400 }
      );
    }

  const restriction = await prisma.doNotRentRestriction.create({
    data: { organizationId: organization.id, name, email, phone, address, reason },
    });

  return NextResponse.json({ restriction }, { status: 201 });
  }

export async function PATCH(req: NextRequest) {
  const organization = await requireCurrentOrganization();
  try {
    await requirePermission(organization.id, "do_not_rent.manage");
    } catch (err) {
    return authzErrorResponse(err);
    }
  const body = await req.json();

  if (!body.id || typeof body.id !== "string") {
    return NextResponse.json({ error: "Restriction id is required" }, { status: 400 });
    }

  const existing = await prisma.doNotRentRestriction.findFirst({
    where: { id: body.id, organizationId: organization.id },
    });
  if (!existing) {
    return NextResponse.json({ error: "Restriction not found" }, { status: 404 });
    }

  const restriction = await prisma.doNotRentRestriction.update({
    where: { id: body.id },
    data: { isActive: typeof body.isActive === "boolean" ? body.isActive : existing.isActive },
    });

  return NextResponse.json({ restriction });
  }

export async function DELETE(req: NextRequest) {
  const organization = await requireCurrentOrganization();
  try {
    await requirePermission(organization.id, "do_not_rent.manage");
    } catch (err) {
    return authzErrorResponse(err);
    }
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Restriction id is required" }, { status: 400 });
    }

  const existing = await prisma.doNotRentRestriction.findFirst({
    where: { id, organizationId: organization.id },
    });
  if (!existing) {
    return NextResponse.json({ error: "Restriction not found" }, { status: 404 });
    }

  await prisma.doNotRentRestriction.delete({ where: { id } });

  return NextResponse.json({ success: true });
  }
