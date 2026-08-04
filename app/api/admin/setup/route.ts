import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

// One-time setup endpoint for creating the first platform-level
// super-admin account. Once a platform_admin user exists, this
// endpoint refuses all further requests.
const setupSchema = z.object({
  name: z.string().min(2),
  username: z.string().min(3),
  password: z.string().min(8),
});

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = setupSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const existingAdmin = await prisma.user.findFirst({
    where: { role: "platform_admin" },
  });

  if (existingAdmin) {
    return NextResponse.json(
      { error: "A platform admin account already exists." },
      { status: 403 }
    );
  }

  const { name, username, password } = parsed.data;
  const passwordHash = await bcrypt.hash(password, 10);

  let platformOrg = await prisma.organization.findUnique({
    where: { slug: "_platform_internal" },
  });

  if (!platformOrg) {
    platformOrg = await prisma.organization.create({
      data: {
        name: "Platform Admin",
        slug: "_platform_internal",
      },
    });
  }

  await prisma.user.create({
    data: {
      organizationId: platformOrg.id,
      name,
      username,
      password: passwordHash,
      role: "platform_admin",
    },
  });

  return NextResponse.json({ success: true });
}
