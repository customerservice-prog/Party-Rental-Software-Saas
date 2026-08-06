import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCurrentOrganization } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import AssignDriverSelect from "../../deliveries/assign-driver-select";
import OrderTasks from "./OrderTasks";
import OrderStatusSelect from "./OrderStatusSelect";

export default async function OrderDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const organization = await requireCurrentOrganization();

  const [order, drivers] = await Promise.all([
    prisma.order.findFirst({
      where: { id: params.id, organizationId: organization.id },
      include: {
        customer: true,
        items: { include: { item: true } },
        orderAddons: true,
        contract: true,
        deliveryDriver: true,
        pickupDriver: true,
      },
    }),
    prisma.driver.findMany({
      where: { organizationId: organization.id, isActive: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!order) {
    notFound();
  }

  const balanceDue = order.totalAmount - order.amountPaid;

  return (
    <div className="p-8 max-w-4xl">
      <Link href="/dashboard/orders" className="text-sm text-brand-600 hover:underline">
        &larr; Back to Orders
      </Link>

      <div className="flex items-center justify-between mt-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Order {order.orderNumber}</h1>
        <OrderStatusSelect orderId={order.id} currentStatus={order.status} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white shadow rounded-lg p-5">
          <h2 className="font-semibold text-gray-900 mb-3">Customer</h2>
          <p className="text-sm text-gray-700">
            <Link href={"/dashboard/customers/" + order.customer.id} className="text-brand-600 hover:underline">
              {order.customer.firstName} {order.customer.lastName}
            </Link>
          </p>
          <p className="text-sm text-gray-500">{order.customer.email}</p>
          {order.customer.phone && <p className="text-sm text-gray-500">{order.customer.phone}</p>}
        </div>

        <div className="bg-white shadow rounded-lg p-5">
          <h2 className="font-semibold text-gray-900 mb-3">Event &amp; Delivery</h2>
          <p className="text-sm text-gray-700">Event date: {order.eventDate.toDateString()}</p>
          <p className="text-sm text-gray-700 capitalize">Type: {order.deliveryType}</p>
          {order.deliveryAddress && (
            <p className="text-sm text-gray-500">{order.deliveryAddress}</p>
          )}
          <div className="mt-3">
            <label className="text-xs text-gray-400 block mb-1">Delivery driver</label>
            <AssignDriverSelect
              orderId={order.id}
              drivers={drivers}
              currentDriverId={order.deliveryDriverId}
            />
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-5 mb-6">
        <h2 className="font-semibold text-gray-900 mb-3">Items</h2>
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="text-gray-500 border-b">
              <th className="py-1">Item</th>
              <th className="py-1">Qty</th>
              <th className="py-1">Price</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((oi) => (
              <tr key={oi.id} className="border-b last:border-0">
                <td className="py-2">{oi.item.name}</td>
                <td className="py-2">{oi.quantity}</td>
                <td className="py-2">${oi.price.toFixed(2)}</td>
              </tr>
            ))}
            {order.orderAddons.map((addon) => (
              <tr key={addon.id} className="border-b last:border-0 text-gray-500">
                <td className="py-2">+ {addon.name}</td>
                <td className="py-2">-</td>
                <td className="py-2">${addon.price.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 border-t pt-4 space-y-1 text-sm text-gray-700 max-w-xs ml-auto">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>${order.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Delivery fee</span>
            <span>${order.deliveryFee.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Tax</span>
            <span>${order.taxAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-semibold">
            <span>Total</span>
            <span>${order.totalAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-gray-500">
            <span>Paid</span>
            <span>${order.amountPaid.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-semibold text-brand-600">
            <span>Balance due</span>
            <span>${balanceDue.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-5 mb-6">
        <h2 className="font-semibold text-gray-900 mb-2">Contract</h2>
        {order.contract?.signedAt ? (
          <div>
            <p className="text-sm text-green-700">
              Signed by {order.contract.signatureName} on{" "}
              {order.contract.signedAt.toDateString()}
            </p>
            {order.contract.contractText && (
              <details className="mt-2">
                <summary className="text-sm text-indigo-600 cursor-pointer">View signed contract text</summary>
                <div className="mt-1 max-h-48 overflow-y-auto rounded-md border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600 whitespace-pre-wrap">
                  {order.contract.contractText}
                </div>
              </details>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-500">Not signed yet.</p>
        )}
      </div>

      <div className="bg-white shadow rounded-lg p-5">
        <h2 className="font-semibold text-gray-900 mb-3">Tasks for this order</h2>
        <OrderTasks orderId={order.id} />
      </div>
    </div>
  );
}
