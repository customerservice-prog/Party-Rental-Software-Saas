import { requireCurrentOrganization } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";

export default async function InventoryPage() {
    const organization = await requireCurrentOrganization();

  const categories = await prisma.category.findMany({
        where: { organizationId: organization.id },
        include: { items: true },
        orderBy: { sortOrder: "asc" },
  });

  return (
        <div>
              <div className="flex items-center justify-between mb-6">
                      <h1 className="text-2xl font-bold">Inventory</h1>
              </div>
        
          {categories.length === 0 && (
                  <p className="text-gray-500">
                            No categories yet. Add your first rental category to get started.
                  </p>
              )}
        
              <div className="space-y-6">
                {categories.map((category) => (
                    <div key={category.id} className="border rounded p-4">
                                <h2 className="font-semibold text-lg mb-2">{category.name}</h2>
                                <table className="w-full text-sm text-left">
                                              <thead>
                                                              <tr className="text-gray-500 border-b">
                                                                                <th className="py-1">Item</th>
                                                                                <th className="py-1">Cost</th>
                                                                                <th className="py-1">Quantity</th>
                                                                                <th className="py-1">Visible</th>
                                                              </tr>
                                              </thead>
                                              <tbody>
                                                {category.items.map((item) => (
                                        <tr key={item.id} className="border-b last:border-0">
                                                            <td className="py-1">{item.name}</td>
                                                            <td className="py-1">${item.cost.toFixed(2)}</td>
                                                            <td className="py-1">{item.quantity}</td>
                                                            <td className="py-1">
                                                              {item.displayToCustomer ? "Yes" : "No"}
                                                            </td>
                                        </tr>
                                      ))}
                                              </tbody>
                                </table>
                    </div>
                  ))}
              </div>
        </div>
      );
}
