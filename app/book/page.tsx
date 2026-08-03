import Link from "next/link";
import { requireCurrentOrganization } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";

export default async function BookPage() {
    const organization = await requireCurrentOrganization();

  const items = await prisma.item.findMany({
        where: { organizationId: organization.id, displayToCustomer: true },
        orderBy: { name: "asc" },
  });

  return (
        <div className="max-w-6xl mx-auto p-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Browse Rentals</h1>
              <p className="text-gray-600 mb-8">
                      Pick the items you would like to rent from {organization.name} and request a booking.
              </p>
        
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {items.length === 0 && (
                    <p className="text-gray-500 col-span-full">
                                No rental items are available yet. Please check back soon.
                    </p>
                      )}
                {items.map((item) => (
                    <div key={item.id} className="bg-white rounded-lg shadow overflow-hidden flex flex-col">
                                <div className="h-40 bg-gray-100 flex items-center justify-center text-gray-400 text-sm">
                                  {item.picture ? (
                                      <img src={item.picture} alt={item.name} className="h-full w-full object-cover" />
                                    ) : (
                                      "No image"
                                    )}
                                </div>
                                <div className="p-4 flex flex-col flex-1">
                                              <h2 className="font-semibold text-gray-900">{item.name}</h2>
                                              <p className="text-sm text-gray-500 mt-1 flex-1">{item.description}</p>
                                              <div className="mt-4 flex items-center justify-between">
                                                              <span className="text-indigo-600 font-bold">${item.cost.toFixed(2)}</span>
                                                              <Link
                                                                                  href={`/checkout?itemId=${item.id}`}
                                                                                  className="bg-indigo-600 text-white text-sm px-3 py-1.5 rounded-md hover:bg-indigo-700"
                                                                                >
                                                                                Book Now
                                                              </Link>
                                              </div>
                                </div>
                    </div>
                  ))}
              </div>
        </div>
      );
}
