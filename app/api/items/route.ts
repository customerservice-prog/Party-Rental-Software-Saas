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

export async function GET(req: NextRequest) {
    const organization = await requireCurrentOrganization();
    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get("categoryId");

  const items = await prisma.item.findMany({
        where: {
                organizationId: organization.id,
                ...(categoryId ? { categoryId } : {}),
        },
        include: { category: true },
        orderBy: { name: "asc" },
  });

  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
    const organization = await requireCurrentOrganization();
    const body = await req.json();

  if (!body.name || typeof body.name !== "string") {
        return NextResponse.json({ error: "Item name is required" }, { status: 400 });
  }
    if (!body.categoryId || typeof body.categoryId !== "string") {
          return NextResponse.json({ error: "Category is required" }, { status: 400 });
    }
    if (typeof body.cost !== "number") {
          return NextResponse.json({ error: "Cost is required" }, { status: 400 });
    }

  const slug = slugify(body.name);

  const item = await prisma.item.create({
        data: {
                organizationId: organization.id,
                categoryId: body.categoryId,
                name: body.name,
                slug,
                description: typeof body.description === "string" ? body.description : null,
                cost: body.cost,
                quantity: typeof body.quantity === "number" ? body.quantity : 1,
                picture: typeof body.picture === "string" ? body.picture : null,
                displayToCustomer:
                          typeof body.displayToCustomer === "boolean" ? body.displayToCustomer : true,
        },
  });

  return NextResponse.json({ item }, { status: 201 });
}
