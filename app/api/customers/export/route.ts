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

export async function GET() {
  try {
    const organization = await requireCurrentOrganization();
    const session = await requireStaffSession(organization.id);

    const customers = await prisma.customer.findMany({
      where: { organizationId: organization.id },
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
