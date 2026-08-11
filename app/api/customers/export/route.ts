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

export async function GET(request: Request) {
  try {
    const organization = await requireCurrentOrganization();
    const session = await requireStaffSession(organization.id);

    const { searchParams } = new URL(request.url);
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");
    const dateFilter: { gte?: Date; lte?: Date } = {};
    if (fromParam) {
      const fromDate = new Date(fromParam);
      if (!isNaN(fromDate.getTime())) dateFilter.gte = fromDate;
    }
    if (toParam) {
      const toDate = new Date(toParam);
      if (!isNaN(toDate.getTime())) {
        toDate.setHours(23, 59, 59, 999);
        dateFilter.lte = toDate;
      }
    }
    const dateWhere = (dateFilter.gte || dateFilter.lte) ? { createdAt: dateFilter } : {};

    const customers = await prisma.customer.findMany({
      where: { organizationId: organization.id, ...dateWhere },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { orders: true } } },
    });

    const header = [
      "First Name",
      "Last Name",
      "Email",
      "Phone",
      "Address",
      "City",
      "State",
      "Zip",
      "Lead Source",
      "Orders",
      "Joined",
    ];

    const rows = customers.map((c) =>
      [
        escapeCsv(c.firstName),
        escapeCsv(c.lastName),
        escapeCsv(c.email),
        escapeCsv(c.phone),
        escapeCsv(c.address),
        escapeCsv(c.city),
        escapeCsv(c.state),
        escapeCsv(c.zip),
        escapeCsv(c.leadSource),
        String(c._count.orders),
        escapeCsv(new Date(c.createdAt).toISOString().slice(0, 10)),
      ].join(",")
    );

    const csv = [header.join(","), ...rows].join("\n");

    await logActivity({
      organizationId: organization.id,
      performedBy: session.id,
      action: "Exported customers CSV",
      details: `${customers.length} customers`,
    });

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="customers.csv"',
      },
    });
  } catch (err) {
    return authzErrorResponse(err);
  }
}
