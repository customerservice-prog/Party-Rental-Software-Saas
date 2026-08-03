import { requireCurrentOrganization } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function DashboardHomePage() {
    const organization = await requireCurrentOrganization();

  const [itemCount, orderCount, customerCount] = await Promise.all([
        prisma.item.count({ where: { organizationId: organization.id } }),
        prisma.order.count({ where: { organizationId: organization.id } }),
        prisma.customer.count({ where: { organizationId: organization.id } }),
      ]);

  const stats = [
    { label: "Inventory Items", value: itemCount },
    { label: "Total Orders", value: orderCount },
    { label: "Customers", value: customerCount },
      ];

  return (
        <div>
              <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      {itemCount === 0 && (
        <div className="mb-6 rounded-md bg-indigo-50 border border-indigo-200 p-4 text-sm">
          <span className="font-medium">Finish setting up your business.</span>{" "}
          <Link href="/onboarding" className="text-indigo-600 underline">
            Complete onboarding
          </Link>
        </div>
      )}
              <div className="grid grid-cols-3 gap-4">
                {stats.map((stat) => (
                    <div key={stat.label} className="border rounded p-4">
                                <div className="text-sm text-gray-500">{stat.label}</div>
                                <div className="text-3xl font-bold">{stat.value}</div>
                    </div>
                  ))}
              </div>
        </div>
      );
}
