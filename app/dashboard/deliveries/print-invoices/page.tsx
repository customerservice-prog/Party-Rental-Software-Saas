import Link from "next/link";
import {prisma} from "@/lib/prisma";
import {requireCurrentOrganization} from "@/lib/tenant";
import {requirePermission} from "@/lib/authz";
import PrintButton from "../PrintButton";

const money=(value:number)=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(value);

export default async function PrintInvoicesPage(){
  const organization=await requireCurrentOrganization();
  await requirePermission(organization.id,"orders.view");
  const start=new Date();start.setHours(0,0,0,0);
  const orders=await prisma.order.findMany({
    where:{organizationId:organization.id,eventDate:{gte:start},status:{notIn:["cancelled","canceled"]}},
    orderBy:{eventDate:"asc"},
    take:100,
    include:{customer:true,items:{include:{item:true}},orderAddons:true},
  });

  const companyAddress=[organization.address,organization.city,organization.state,organization.zip].filter(Boolean).join(", ");

  return <div className="friendly-admin-page is-wide print-page">
    <div className="friendly-admin-head print-hide">
      <div><Link href="/dashboard/deliveries" className="text-xs font-semibold text-[#1a6fd4] hover:underline">← Delivery Schedule</Link><h1 className="!mt-2">Print Invoices</h1><p>{orders.length} upcoming non-canceled order{orders.length===1?"":"s"} ready for batch printing.</p></div>
      <PrintButton label="Print All Invoices"/>
    </div>
    {!orders.length&&<div className="friendly-admin-card friendly-admin-empty">No upcoming invoices to print.</div>}
    <div className="space-y-6 print-stack">{orders.map(order=>{
      const balance=Math.max(0,order.totalAmount-order.amountPaid);
      return <article key={order.id} className="friendly-admin-card !mb-0 print-document">
        <div className="flex items-start justify-between gap-6 border-b border-slate-200 pb-4">
          <div><h2 className="text-xl font-extrabold text-slate-900">{organization.name}</h2>{companyAddress&&<p className="mt-1 text-xs text-slate-500">{companyAddress}</p>}{organization.contactPhone&&<p className="text-xs text-slate-500">{organization.contactPhone}</p>}{organization.contactEmail&&<p className="text-xs text-slate-500">{organization.contactEmail}</p>}</div>
          <div className="text-right"><div className="text-2xl font-extrabold text-slate-900">INVOICE</div><div className="mt-1 text-xs text-slate-500">Order #{order.orderNumber}</div></div>
        </div>
        <div className="grid gap-4 py-4 sm:grid-cols-2">
          <div><h3 className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400">Customer</h3><p className="mt-1 text-sm font-semibold">{order.customer.firstName} {order.customer.lastName}</p><p className="text-xs text-slate-500">{order.customer.email}</p>{order.customer.phone&&<p className="text-xs text-slate-500">{order.customer.phone}</p>}</div>
          <div className="sm:text-right"><h3 className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400">Event</h3><p className="mt-1 text-sm font-semibold">{order.eventDate.toLocaleDateString()}</p><p className="text-xs text-slate-500">{order.deliveryType==="pickup"?"Customer pickup":"Delivery"}</p>{order.deliveryAddress&&<p className="text-xs text-slate-500">{order.deliveryAddress}</p>}</div>
        </div>
        <table className="friendly-admin-table">
          <thead><tr><th>Rental item</th><th className="numeric">Qty</th><th className="money">Unit</th><th className="money">Total</th></tr></thead>
          <tbody>
            {order.items.map(line=><tr key={line.id}><td>{line.item.name}</td><td className="numeric">{line.quantity}</td><td className="money">{money(line.price)}</td><td className="money">{money(line.price*line.quantity)}</td></tr>)}
            {order.orderAddons.map(addon=><tr key={addon.id}><td>+ {addon.name}</td><td className="numeric">1</td><td className="money">{money(addon.price)}</td><td className="money">{money(addon.price)}</td></tr>)}
          </tbody>
        </table>
        <div className="ml-auto mt-4 max-w-sm space-y-2 text-xs">
          <div className="flex justify-between"><span>Subtotal</span><strong>{money(order.subtotal)}</strong></div>
          <div className="flex justify-between"><span>Delivery</span><strong>{money(order.deliveryFee)}</strong></div>
          <div className="flex justify-between"><span>Tax</span><strong>{money(order.taxAmount)}</strong></div>
          <div className="flex justify-between border-t border-slate-200 pt-2 text-sm"><span>Total</span><strong>{money(order.totalAmount)}</strong></div>
          <div className="flex justify-between"><span>Paid</span><strong>{money(order.amountPaid)}</strong></div>
          <div className="flex justify-between text-base"><span>Balance due</span><strong>{money(balance)}</strong></div>
        </div>
      </article>;
    })}</div>
  </div>;
}
