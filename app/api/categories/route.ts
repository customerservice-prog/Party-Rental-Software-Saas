import { NextRequest, NextResponse } from "next/server";
import { requireCurrentOrganization } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";

function slugify(value: string) {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");
}

export async function GET() {
    const organization = await requireCurrentOrganization();
    const categories = await prisma.category.findMany({
          where: { organizationId: organization.id },
          orderBy: { sortOrder: "asc" },
          include: { _count: { select: { items: true } } },
    });
    return NextResponse.json({ categories });
}

export async function POST(req: NextRequest) {
    const organization = await requireCurrentOrganization();
    const body = await req.json();

  if (!body.name || typeof body.name !== "string") {
        return NextResponse.json({ error: "Category name is required" }, { status: 400 });
  }

  const slug = slugify(body.name);

  const category = await prisma.category.create({
        data: {
                organizationId: organization.id,
                name: body.name,
                slug,
                description: typeof body.description === "string" ? body.description : null,
                picture: typeof body.picture === "string" ? body.picture : null,
                displayToCustomer:
                          typeof body.displayToCustomer === "boolean" ? body.displayToCustomer : true,
        },
  });

  return NextResponse.json({ category }, { status: 201 });
}
