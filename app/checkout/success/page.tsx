import Link from "next/link";
import { requireCurrentOrganization } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";

export default async function CheckoutSuccessPage({
    searchParams,
}: {
    searchParams: { orderId?: string };
}) {
    const organization = await requireCurrentOrganization();

  const order = searchParams.orderId
      ? await prisma.order.findFirst({
                where: { id: searchParams.orderId, organizationId: organization.id },
                include: { customer: true },
      })
        : null;

  return (
        <div className="max-w-xl mx-auto p-8 text-center">
              <div className="bg-white shadow rounded-lg p-10">
                      <div className="text-green-500 text-5xl mb-4">&#10003;</div>
                      <h1 className="text-2xl font-bold text-gray-900 mb-2">Booking Confirmed!</h1>
                      <p className="text-gray-600 mb-6">
                                Thank you{order?.customer ? `, ${order.customer.firstName}` : ""}. Your rental request
                                has been received and we will be in touch shortly to confirm the details.
                      </p>
                {order && (
                    <p className="text-sm text-gray-500 mb-6">
                                Order Number: <span className="font-medium text-gray-800">{order.orderNumber}</span>
                    </p>
                      )}
                      <Link
                                  href="/"
                                  className="inline-block bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700"
                                >
                                Return Home
                      </Link>
              </div>
        </div>
      );
}
