import { NextResponse } from "next/server";
import { requireCurrentOrganization } from "@/lib/tenant";
import { requireStaffSession, authzErrorResponse } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/audit";

function escapeCsv(value: string | null | undefined): string {
  const str = value == null ? "" : String(value);
  if (/[",\n]/.test(str)) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function money(n: number): string {
  return (n ?? 0).toFixed(2);
}

export async function GET() {
  try {
    const organization = await requireCurrentOrganization();
    const session = await requireStaffSession(organization.id);

    const items = await prisma.item.findMany({
      where: { organizationId: organization.id },
      orderBy: { name: "asc" },
      include: { category: true },
    });

    const header = [
      "Name",
      "Category",
      "Description",
      "Cost",
      "Quantity",
      "Visible To Customer",
      "Created",
    ];

    const rows = items.map((it) =>
      [
        escapeCsv(it.name),
        escapeCsv(it.category ? it.category.name : ""),
        escapeCsv(it.description),
        money(it.cost),
        String(it.quantity),
        it.displayToCustomer ? "Yes" : "No",
        escapeCsv(new Date(it.createdAt).toISOString().slice(0, 10)),
      ].join(",")
    );

    const csv = [header.join(","), ...rows].join("\n");

    await logActivity({
      organizationId: organization.id,
      performedBy: session.id,
      action: "Exported inventory CSV",
      details: `${items.length} items`,
    });

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="inventory.csv"',
      },
    });
  } catch (err) {
    return authzErrorResponse(err);
  }
}
