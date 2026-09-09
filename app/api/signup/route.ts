import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { TRIAL_DAYS } from "@/lib/plans";

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

// Starter staff roles created automatically for every new organization.
// These are just editable presets (an owner can rename, reassign
// permissions, or delete them at any time from Dashboard > Roles) - they
// exist so an owner inviting their first staff member isn't forced to
// build a permission set from scratch. Owners themselves never need a
// TenantRole; they implicitly have every permission (see lib/permissions.ts).
const DEFAULT_TENANT_ROLES: { name: string; slug: string; permissions: string[] }[] = [
  {
    name: "Manager",
    slug: "manager",
    permissions: [
      "orders.view",
      "orders.manage",
      "orders.export",
      "customers.view",
      "customers.manage",
      "customers.message",
      "inventory.view",
      "inventory.manage",
      "drivers.view",
      "drivers.manage",
      "reports.view",
      "coupons.manage",
    ],
  },
  {
    name: "Front Desk",
    slug: "front-desk",
    permissions: [
      "orders.view",
      "orders.manage",
      "customers.view",
      "customers.manage",
      "customers.message",
      "inventory.view",
    ],
  },
  {
    name: "Driver",
    slug: "driver",
    permissions: ["orders.view", "drivers.view"],
  },
];

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
  trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DAYS);

  const organization = await prisma.organization.create({
    data: {
      name: businessName,
      slug,
      contactEmail,
      planTier: "starter",
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
          planTier: "starter",
          status: "trialing",
        },
      },
      tenantRoles: {
        create: DEFAULT_TENANT_ROLES.map((role) => ({
          name: role.name,
          slug: role.slug,
          permissions: role.permissions,
          isSystem: true,
        })),
      },
    },
  });

  return NextResponse.json({
    organizationId: organization.id,
    slug: organization.slug,
  });
}
