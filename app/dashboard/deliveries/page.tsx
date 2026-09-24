import {requireCurrentOrganization} from "@/lib/tenant";
import {prisma} from "@/lib/prisma";
import AssignDriverSelect from "./assign-driver-select";
import Link from "next/link";

export default async function DeliveriesPage(){
 const organization=await requireCurrentOrganization();
 const[orders,drivers]=await Promise.all([
  prisma.order.findMany({where:{organizationId:organization.id},orderBy:{eventDate:"asc"},include:{customer:true,deliveryDriver:true}}),
  prisma.driver.findMany({where:{organizationId:organization.id,isActive:true},orderBy:{name:"asc"}}),
 ]);
 const active=orders.filter(o=>o.status!=="cancelled"&&o.status!=="canceled");
 const deliveryCount=active.filter(o=>o.deliveryType!=="pickup").length,pickupCount=active.filter(o=>o.deliveryType==="pickup").length;
 return <div className="friendly-admin-page">
  <div className="friendly-admin-head"><div><h1>Delivery Schedule</h1><p>{deliveryCount} delivery{deliveryCount===1?"":"s"} · {pickupCount} pickup{pickupCount===1?"":"s"} · {orders.length} total</p></div><div className="friendly-admin-actions"><Link href="/dashboard/dispatch" className="friendly-admin-secondary">Dispatch</Link><Link href="/dashboard/deliveries/packing-list" className="friendly-admin-primary">Print Packing List</Link></div></div>

  <div className="flex flex-wrap gap-2 mb-4">
   <Link href="/dashboard/dispatch" className="friendly-admin-secondary">Assign Drivers</Link>
   <Link href="/dashboard/deliveries/packing-list" className="friendly-admin-secondary">Packing List</Link>
   <Link href="/dashboard/warehouse" className="friendly-admin-secondary">Warehouse</Link>
   <Link href="/dashboard/returns" className="friendly-admin-secondary">Returns & Damage</Link>
   <Link href="/dashboard/drivers" className="friendly-admin-secondary">Manage Drivers</Link>
  </div>

  <div className="friendly-admin-stack">
   {orders.map(o=>{const due=Math.max(0,o.totalAmount-o.amountPaid),cancelled=o.status==="cancelled"||o.status==="canceled";return <div key={o.id} className={"friendly-admin-card !mb-0 border-l-4 "+(cancelled?"border-gray-400 opacity-75":o.deliveryType==="pickup"?"border-purple-400":"border-blue-500")}>
    <div className="flex flex-wrap items-start justify-between gap-3">
     <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center gap-2">
       <span className={"friendly-admin-badge "+(o.deliveryType==="pickup"?"yellow":"blue")}>{o.deliveryType==="pickup"?"Customer Pickup":"Delivery"}</span>
       {cancelled&&<span className="friendly-admin-badge gray">Canceled</span>}
       <Link href={"/dashboard/orders/"+o.id} className="font-semibold text-[#1a6fd4] hover:underline">{o.orderNumber}</Link>
       <span className="font-semibold text-[#333]">{o.customer.firstName} {o.customer.lastName}</span>
      </div>
      <p className="mt-2 text-xs text-gray-500">{o.deliveryAddress||o.customer.address||"No delivery address on file"}</p>
      <div className="mt-3 flex flex-wrap gap-2">
       <div className="rounded border border-green-200 bg-green-50 px-2 py-1"><div className="text-[9px] font-bold uppercase text-green-700">Event Date</div><div className="text-[10px] font-semibold text-gray-800">{new Date(o.eventDate).toLocaleDateString()}</div></div>
       <div className="rounded border border-gray-200 bg-gray-50 px-2 py-1"><div className="text-[9px] font-bold uppercase text-gray-600">Status</div><div className="text-[10px] font-semibold capitalize text-gray-800">{o.status}</div></div>
      </div>
     </div>
     <div className="text-right"><div className={"text-xs font-bold "+(due>0?"text-red-600":"text-green-700")}>{due>0?"Balance: $"+due.toFixed(2):"Paid in Full"}</div><Link href={"/dashboard/orders/"+o.id} className="friendly-admin-secondary !min-h-0 !px-3 !py-1 mt-2">View</Link></div>
    </div>
    <div className="mt-3 border-t border-gray-100 pt-3 flex flex-wrap items-center gap-3"><label className="text-[10px] font-semibold text-gray-500">Driver</label><AssignDriverSelect orderId={o.id} drivers={drivers} currentDriverId={o.deliveryDriverId}/></div>
   </div>})}
   {!orders.length&&<div className="friendly-admin-card friendly-admin-empty">No deliveries or pickups scheduled yet.</div>}
  </div>
 </div>;
}
