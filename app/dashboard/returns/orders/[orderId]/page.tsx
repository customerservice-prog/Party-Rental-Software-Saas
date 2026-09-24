import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCurrentOrganization } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import ReturnReconciliation from "./ReturnReconciliation";

export default async function OrderReturnPage({params: paramsPromise}:{params:Promise<{orderId:string}>}){
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
        <Link href="/dashboard/returns" className="text-xs font-semibold text-[#1a6fd4]">← Returns & Damage</Link>
        <div className="mt-2 text-xs font-semibold text-[#1a6fd4]">Return · Order #{order.orderNumber}</div>
        <h1 className="mt-1 text-2xl font-bold text-dark">Reconcile returned equipment</h1>
        <p className="mt-1 text-sm text-slate-500">{order.customer.firstName} {order.customer.lastName} · {new Date(order.eventDate).toLocaleDateString()}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link href={`/dashboard/warehouse/orders/${order.id}`} className="friendly-admin-primary">Scan serialized assets</Link>
        <Link href={`/dashboard/orders/${order.id}/fulfillment`} className="friendly-admin-secondary">Fulfillment</Link>
      </div>
    </div>
    <ReturnReconciliation orderId={order.id} orderNumber={order.orderNumber}/>
  </div>;
}