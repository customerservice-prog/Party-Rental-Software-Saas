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

    const [orderStats, orderCount, statusGroups, leadSourceGroups] =
      await Promise.all([
        prisma.order.aggregate({
          where: { organizationId: organization.id },
          _sum: { totalAmount: true, amountPaid: true },
        }),
        prisma.order.count({
          where: { organizationId: organization.id },
        }),
        prisma.order.groupBy({
          by: ["status"],
          where: { organizationId: organization.id },
          _count: { _all: true },
        }),
        prisma.customer.groupBy({
          by: ["leadSource"],
          where: { organizationId: organization.id },
          _count: { _all: true },
        }),
      ]);

    const totalRevenue = orderStats._sum.totalAmount || 0;
    const totalCollected = orderStats._sum.amountPaid || 0;
    const outstanding = totalRevenue - totalCollected;

    const lines: string[] = [];
    lines.push("Metric,Value");
    lines.push("Total Orders," + orderCount);
    lines.push("Total Revenue," + money(totalRevenue));
    lines.push("Total Collected," + money(totalCollected));
    lines.push("Outstanding Balance," + money(outstanding));

    lines.push("");
    lines.push("Orders by Status,Count");
    for (const g of statusGroups) {
      lines.push(escapeCsv(g.status) + "," + g._count._all);
    }

    lines.push("");
    lines.push("Leads by Source,Count");
    for (const g of leadSourceGroups) {
      lines.push(escapeCsv(g.leadSource) + "," + g._count._all);
    }

    const csv = lines.join("\n");

    await logActivity({
      organizationId: organization.id,
      performedBy: session.id,
      action: "Exported reports CSV",
      details: `${orderCount} orders summarized`,
    });

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="reports-summary.csv"',
      },
    });
  } catch (err) {
    return authzErrorResponse(err);
  }
}
