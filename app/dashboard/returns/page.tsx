import Link from "next/link";
import { requireCurrentOrganization } from "@/lib/tenant";
import { requirePermission } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import ReturnConditionControls from "./ReturnConditionControls";
import QuantityExceptions from "./QuantityExceptions";

export default async function ReturnsPage(){
  const org=await requireCurrentOrganization();
  await requirePermission(org.id,"inventory.view");
  const now=new Date(),past=new Date(now.getTime()-21*86400000);
  const [orders,items,qtyHoldRows]=await Promise.all([
    prisma.order.findMany({
      where:{organizationId:org.id,eventDate:{gte:past,lte:now},status:{notIn:["cancelled","canceled"]}},
      include:{customer:true,items:{include:{item:true}}},
      orderBy:{eventDate:"desc"},take:60,
    }),
    prisma.item.findMany({where:{organizationId:org.id},orderBy:{updatedAt:"desc"}}),
    prisma.$queryRawUnsafe<{count:number;quantity:number}[]>(
      `SELECT COUNT(*)::int AS "count",COALESCE(SUM("quantity"),0)::int AS "quantity"
       FROM "InventoryQuantityException" WHERE "organizationId"=$1 AND "status"='open'`,org.id
    ).catch(()=>[{count:0,quantity:0}]),
  ]);
  const qtyHolds=qtyHoldRows[0]||{count:0,quantity:0};
  const unresolved=items.filter(i=>["missing","damaged","needs_repair","out_of_service"].includes(i.status));
  const recentItemIds=new Set(orders.flatMap(o=>o.items.map(x=>x.itemId)));
  const recentInventory=items.filter(i=>recentItemIds.has(i.id));

  return <div className="space-y-5 pb-10">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div><div className="text-xs font-black uppercase tracking-[.16em] text-blue-600">Warehouse Control</div><h1 className="mt-1 text-3xl font-black tracking-tight">Returns & Damage</h1><p className="mt-1 text-sm text-slate-500">Reconcile every order, quarantine damaged or missing quantities, and restore repaired equipment to availability.</p></div>
      <div className="flex flex-wrap gap-2"><Link href="/dashboard/warehouse" className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black">Warehouse scan</Link><Link href="/dashboard/operations" className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black">← Operations</Link></div>
    </div>
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      {[["Recent orders",orders.length],["Items to inspect",recentInventory.length],["Open quantity holds",qtyHolds.quantity],["Missing catalog items",items.filter(i=>i.status==="missing").length],["Repair / damaged",items.filter(i=>i.status==="damaged"||i.status==="needs_repair").length]].map(([a,b])=><div key={String(a)} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="text-[10px] font-black uppercase text-slate-400">{a}</div><div className="mt-1 text-2xl font-black">{b}</div></div>)}
    </div>

    <div className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4"><h2 className="font-black">Recent rental returns</h2><p className="text-xs text-slate-500">Open an order to reconcile physical quantities. Packages expand into their actual chairs, tables, tents and other components.</p></div>
        {orders.length?<div className="divide-y divide-slate-100">{orders.map(o=><Link key={o.id} href={`/dashboard/returns/orders/${o.id}`} className="grid grid-cols-[78px_1fr_auto] gap-3 px-5 py-4 hover:bg-slate-50"><div><b className="text-xs text-blue-700">{new Date(o.eventDate).toLocaleDateString("en-US",{month:"short",day:"numeric"})}</b><p className="text-[9px] capitalize text-slate-400">{o.status}</p></div><div className="min-w-0"><b className="block truncate text-sm">{o.customer?`${o.customer.firstName} ${o.customer.lastName}`:`#${o.orderNumber}`}</b><p className="mt-1 line-clamp-1 text-[10px] text-slate-500">{o.items.map(x=>`${x.quantity}× ${x.item.name}`).join(" · ")||"No rental items"}</p></div><span className="self-center rounded-lg bg-blue-50 px-3 py-2 text-[10px] font-black text-blue-700">Reconcile →</span></Link>)}</div>:<p className="p-10 text-center text-sm text-slate-400">No recent returns.</p>}
      </section>

      <aside className="space-y-4">
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="mb-3"><h2 className="font-black text-amber-950">Quantity exceptions</h2><p className="text-xs text-amber-800">Damaged or missing non-serialized units are automatically removed from bookable capacity. Resolve them here when repaired or recovered.</p></div>
          <QuantityExceptions/>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <h2 className="font-black">Whole-item condition</h2><p className="mb-3 text-xs text-slate-500">Use this only when the entire catalog item should be flagged. For a few damaged/missing units, use per-order reconciliation instead.</p>
          <div className="max-h-[520px] space-y-2 overflow-y-auto pr-1">{recentInventory.length?recentInventory.map(i=><ReturnConditionControls key={i.id} itemId={i.id} itemName={i.name} currentStatus={i.status} currentNotes={i.attentionNotes}/>):<div className="rounded-xl bg-white p-5 text-center text-xs text-slate-400">Nothing currently awaiting inspection.</div>}</div>
        </section>
      </aside>
    </div>

    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-4"><h2 className="font-black">Catalog-wide quarantine</h2><p className="text-xs text-slate-500">Items whose entire catalog record is currently flagged unavailable/attention.</p></div>
      {unresolved.length?<div className="grid gap-px bg-slate-100 sm:grid-cols-2 lg:grid-cols-3">{unresolved.slice(0,18).map(i=><div key={i.id} className="bg-white px-5 py-3"><div className="flex justify-between gap-2"><b className="text-xs">{i.name}</b><span className="text-[9px] font-black uppercase text-amber-700">{i.status.replaceAll("_"," ")}</span></div>{i.attentionNotes&&<p className="mt-1 text-[10px] text-slate-500">{i.attentionNotes}</p>}</div>)}</div>:<div className="m-5 rounded-xl bg-emerald-50 p-4 text-xs font-bold text-emerald-700">✓ No whole-item quarantine flags</div>}
    </section>
  </div>;
}