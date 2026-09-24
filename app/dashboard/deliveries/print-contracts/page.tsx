import Link from "next/link";
import {prisma} from "@/lib/prisma";
import {requireCurrentOrganization} from "@/lib/tenant";
import {requirePermission} from "@/lib/authz";
import PrintButton from "../PrintButton";

export default async function PrintContractsPage(){
  const organization=await requireCurrentOrganization();
  await requirePermission(organization.id,"orders.view");
  const start=new Date();start.setHours(0,0,0,0);
  const orders=await prisma.order.findMany({
    where:{organizationId:organization.id,eventDate:{gte:start},status:{notIn:["cancelled","canceled"]}},
    orderBy:{eventDate:"asc"},
    take:100,
    include:{customer:true,items:{include:{item:true}},contract:true},
  });

  return <div className="friendly-admin-page is-wide print-page">
    <div className="friendly-admin-head print-hide">
      <div><Link href="/dashboard/deliveries" className="text-xs font-semibold text-[#1a6fd4] hover:underline">← Delivery Schedule</Link><h1 className="!mt-2">Print Contracts</h1><p>{orders.length} upcoming non-canceled order{orders.length===1?"":"s"} ready for contract printing.</p></div>
      <PrintButton label="Print All Contracts"/>
    </div>
    {!orders.length&&<div className="friendly-admin-card friendly-admin-empty">No upcoming contracts to print.</div>}
    <div className="space-y-6 print-stack">{orders.map(order=>{
      const terms=order.contract?.contractText||organization.contractTerms||"No contract terms have been configured for this rental business.";
      return <article key={order.id} className="friendly-admin-card !mb-0 print-document">
        <div className="flex items-start justify-between gap-6 border-b border-slate-200 pb-4">
          <div><h2 className="text-xl font-extrabold">{organization.name}</h2><p className="mt-1 text-xs text-slate-500">Rental Agreement</p></div>
          <div className="text-right"><p className="text-sm font-bold">Order #{order.orderNumber}</p><p className="text-xs text-slate-500">Event {order.eventDate.toLocaleDateString()}</p></div>
        </div>
        <div className="grid gap-4 py-4 sm:grid-cols-2">
          <div><h3 className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400">Customer</h3><p className="mt-1 text-sm font-semibold">{order.customer.firstName} {order.customer.lastName}</p><p className="text-xs text-slate-500">{order.customer.email}</p>{order.customer.phone&&<p className="text-xs text-slate-500">{order.customer.phone}</p>}</div>
          <div className="sm:text-right"><h3 className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400">Rental location</h3><p className="mt-1 text-sm">{order.deliveryType==="pickup"?"Customer pickup":order.deliveryAddress||order.customer.address||"No delivery address on file"}</p></div>
        </div>
        <div className="rounded-md border border-slate-200 p-4">
          <h3 className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Rental items</h3>
          <ul className="mt-2 grid gap-1 text-xs">{order.items.map(line=><li key={line.id}>{line.quantity} × {line.item.name}</li>)}</ul>
        </div>
        <div className="mt-4 whitespace-pre-wrap text-xs leading-6 text-slate-700">{terms}</div>
        <div className="mt-8 grid gap-8 sm:grid-cols-2">
          <div><div className="border-b border-slate-500 pb-2 text-xs">{order.contract?.signatureName||""}</div><p className="mt-1 text-[10px] text-slate-500">Customer signature / printed name</p></div>
          <div><div className="border-b border-slate-500 pb-2 text-xs">{order.contract?.signedAt?order.contract.signedAt.toLocaleString():""}</div><p className="mt-1 text-[10px] text-slate-500">Date signed</p></div>
        </div>
        <p className="mt-5 text-[10px] text-slate-500">{order.contract?.signedAt?"Digital signature recorded in Party Rental CRM.":"Awaiting customer signature."}</p>
      </article>;
    })}</div>
  </div>;
}
