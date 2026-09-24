import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCurrentOrganization } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import OrderWarehouseScanner from "./OrderWarehouseScanner";

export default async function OrderWarehouseScanPage({params: paramsPromise}:{params:Promise<{orderId:string}>}){
  const params = await paramsPromise;

  const organization=await requireCurrentOrganization();
  const order=await prisma.order.findFirst({
    where:{id:params.orderId,organizationId:organization.id},
    include:{customer:true},
  });
  if(!order)notFound();
  return <div className="friendly-admin-page is-wide">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <Link href={`/dashboard/orders/${order.id}/fulfillment`} className="text-xs font-semibold text-[#1a6fd4]">← Order fulfillment</Link>
        <div className="mt-2 text-xs font-semibold text-[#1a6fd4]">Warehouse · Order #{order.orderNumber}</div>
        <h1 className="mt-1 text-2xl font-bold text-dark">Scan assets for this order</h1>
        <p className="mt-1 text-sm text-slate-500">{order.customer.firstName} {order.customer.lastName} · {new Date(order.eventDate).toLocaleDateString()}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link href="/dashboard/warehouse" className="friendly-admin-secondary">Asset registry</Link>
        <Link href="/dashboard/deliveries/packing-list" className="friendly-admin-secondary">Packing list</Link>
      </div>
    </div>
    <OrderWarehouseScanner orderId={order.id} orderNumber={order.orderNumber}/>
  </div>;
}
