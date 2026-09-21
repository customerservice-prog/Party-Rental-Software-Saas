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
  return <div className="space-y-5 pb-10">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <Link href="/dashboard/returns" className="text-xs font-bold text-blue-600">← Returns & Damage</Link>
        <div className="mt-2 text-xs font-black uppercase tracking-[.16em] text-blue-600">Return · Order #{order.orderNumber}</div>
        <h1 className="mt-1 text-3xl font-black tracking-tight">Reconcile returned equipment</h1>
        <p className="mt-1 text-sm text-slate-500">{order.customer.firstName} {order.customer.lastName} · {new Date(order.eventDate).toLocaleDateString()}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link href={`/dashboard/warehouse/orders/${order.id}`} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white">Scan serialized assets</Link>
        <Link href={`/dashboard/orders/${order.id}/fulfillment`} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black">Fulfillment</Link>
      </div>
    </div>
    <ReturnReconciliation orderId={order.id} orderNumber={order.orderNumber}/>
  </div>;
}