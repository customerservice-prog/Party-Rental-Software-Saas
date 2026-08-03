import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

const signupSchema = z.object({
    businessName: z.string().min(2),
    slug: z
      .string()
      .min(3)
      .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and dashes only"),
    ownerName: z.string().min(2),
    username: z.string().min(3),
    password: z.string().min(8),
    contactEmail: z.string().email(),
});

export async function POST(req: Request) {
    const body = await req.json();
    const parsed = signupSchema.safeParse(body);

  if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.flatten() },
          { status: 400 }
              );
  }

  const { businessName, slug, ownerName, username, password, contactEmail } =
        parsed.data;

  const existing = await prisma.organization.findUnique({ where: { slug } });
    if (existing) {
          return NextResponse.json(
            { error: "That subdomain is already taken. Please choose another." },
            { status: 409 }
                );
    }

  const passwordHash = await bcrypt.hash(password, 10);
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 14);

  const organization = await prisma.organization.create({
        data: {
                name: businessName,
                slug,
                contactEmail,
                planTier: "launch",
                status: "trial",
                trialEndsAt,
                users: {
                          create: {
                                      name: ownerName,
                                      username,
                                      password: passwordHash,
                                      role: "owner",
                          },
                },
                subscription: {
                          create: {
                                      planTier: "launch",
                                      status: "trialing",
                          },
                },
        },
  });

  return NextResponse.json({
        organizationId: organization.id,
        slug: organization.slug,
  });
}
