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

    const orders = await prisma.order.findMany({
      where: { organizationId: organization.id },
      orderBy: { createdAt: "desc" },
      include: { customer: true },
    });

    const header = [
      "Order Number",
      "Customer",
      "Email",
      "Status",
      "Source",
      "Event Date",
      "Delivery Type",
      "Subtotal",
      "Tax",
      "Delivery Fee",
      "Total",
      "Amount Paid",
      "Balance Due",
      "Created",
    ];

    const rows = orders.map((o) =>
      [
        escapeCsv(o.orderNumber),
        escapeCsv(
          o.customer ? `${o.customer.firstName} ${o.customer.lastName}` : ""
        ),
        escapeCsv(o.customer ? o.customer.email : ""),
        escapeCsv(o.status),
        escapeCsv(o.source),
        escapeCsv(new Date(o.eventDate).toISOString().slice(0, 10)),
        escapeCsv(o.deliveryType),
        money(o.subtotal),
        money(o.taxAmount),
        money(o.deliveryFee),
        money(o.totalAmount),
        money(o.amountPaid),
        money((o.totalAmount ?? 0) - (o.amountPaid ?? 0)),
        escapeCsv(new Date(o.createdAt).toISOString().slice(0, 10)),
      ].join(",")
    );

    const csv = [header.join(","), ...rows].join("\n");

    await logActivity({
      organizationId: organization.id,
      performedBy: session.id,
      action: "Exported orders CSV",
      details: `${orders.length} orders`,
    });

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="orders.csv"',
      },
    });
  } catch (err) {
    return authzErrorResponse(err);
  }
}
