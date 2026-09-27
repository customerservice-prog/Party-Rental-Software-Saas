import Link from "next/link";
import {requireCurrentOrganization} from "@/lib/tenant";
import {prisma} from "@/lib/prisma";
import {requirePermission,AuthzError} from "@/lib/authz";

function pctChange(current:number,previous:number){if(previous<=0)return null;return((current-previous)/previous)*100}
function monthLabel(date:Date){return date.toLocaleDateString("en-US",{month:"short"})}
const money=(value:number)=>value.toLocaleString("en-US",{style:"currency",currency:"USD"});

export default async function AnalyticsPage({searchParams:paramsPromise}:{searchParams:Promise<{tab?:string}>}){
  const params=await paramsPromise;
  const organization=await requireCurrentOrganization();
  try{await requirePermission(organization.id,"reports.view")}catch(err){
    if(err instanceof AuthzError)return <div className="friendly-admin-page"><div className="friendly-admin-head"><div><h1>Analytics</h1><p>You don&apos;t have permission to view analytics for this organization.</p></div></div></div>;
    throw err;
  }

  const allowed=["overview","revenue","orders","inventory","customers","website","seo"];
  const tab=allowed.includes(params.tab||"")?String(params.tab):"overview";
  const now=new Date(),start30=new Date(now),start60=new Date(now),start6mo=new Date(now);
  start30.setDate(start30.getDate()-30);start60.setDate(start60.getDate()-60);start6mo.setMonth(start6mo.getMonth()-5);start6mo.setDate(1);start6mo.setHours(0,0,0,0);

  const[current,previous,allCustomers,newCustomers30,sixMonthOrders,topItemsRaw,statusGroups,pagesCount]=await Promise.all([
    prisma.order.aggregate({where:{organizationId:organization.id,status:{not:"cancelled"},createdAt:{gte:start30}},_sum:{totalAmount:true,amountPaid:true},_count:{_all:true}}),
    prisma.order.aggregate({where:{organizationId:organization.id,status:{not:"cancelled"},createdAt:{gte:start60,lt:start30}},_sum:{totalAmount:true},_count:{_all:true}}),
    prisma.customer.count({where:{organizationId:organization.id}}),
    prisma.customer.count({where:{organizationId:organization.id,createdAt:{gte:start30}}}),
    prisma.order.findMany({where:{organizationId:organization.id,status:{not:"cancelled"},createdAt:{gte:start6mo}},select:{createdAt:true,totalAmount:true}}),
    prisma.orderItem.groupBy({by:["itemId"],where:{order:{organizationId:organization.id,status:{not:"cancelled"}}},_sum:{price:true,quantity:true},orderBy:{_sum:{price:"desc"}},take:10}),
    prisma.order.groupBy({by:["status"],where:{organizationId:organization.id},_count:{_all:true}}),
    prisma.page.count({where:{organizationId:organization.id}}),
  ]);

  const itemIds=topItemsRaw.map(row=>row.itemId),items=await prisma.item.findMany({where:{id:{in:itemIds},organizationId:organization.id}}),itemMap=new Map(items.map(item=>[item.id,item]));
  const revenue30=current._sum.totalAmount||0,collected30=current._sum.amountPaid||0,outstanding30=revenue30-collected30,orders30=current._count._all,avgOrder30=orders30?revenue30/orders30:0;
  const revenuePrev30=previous._sum.totalAmount||0,ordersPrev30=previous._count._all,avgOrderPrev30=ordersPrev30?revenuePrev30/ordersPrev30:0;
  const revenueChange=pctChange(revenue30,revenuePrev30),avgOrderChange=pctChange(avgOrder30,avgOrderPrev30);

  const buckets=new Map<string,number>();
  for(let i=0;i<6;i++){const d=new Date(start6mo);d.setMonth(d.getMonth()+i);buckets.set(monthLabel(d)+"-"+d.getFullYear(),0)}
  for(const order of sixMonthOrders){const key=monthLabel(order.createdAt)+"-"+order.createdAt.getFullYear();buckets.set(key,(buckets.get(key)||0)+(order.totalAmount||0))}
  const trend=Array.from(buckets.entries()).map(([label,amount])=>({label:label.split("-")[0],amount})),maxTrend=Math.max(1,...trend.map(row=>row.amount));

  const tabs=[
    ["overview","Overview"],["revenue","Revenue"],["orders","Orders"],["inventory","Inventory"],["customers","Customers"],["website","Website"],["seo","SEO"],
  ];

  const kpis=<div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
    <div className="friendly-admin-kpi"><small>Revenue (30d)</small><strong>{money(revenue30)}</strong>{revenueChange!==null&&<span className={"mt-1 block text-[9px] "+(revenueChange>=0?"text-green-600":"text-red-600")}>{revenueChange>=0?"↑":"↓"} {Math.abs(revenueChange).toFixed(0)}% vs prior</span>}</div>
    <div className="friendly-admin-kpi"><small>Collected (30d)</small><strong>{money(collected30)}</strong></div>
    <div className="friendly-admin-kpi"><small>Outstanding (30d)</small><strong className={outstanding30>0?"!text-orange-600":""}>{money(outstanding30)}</strong></div>
    <div className="friendly-admin-kpi"><small>Orders (30d)</small><strong>{orders30}</strong></div>
    <div className="friendly-admin-kpi"><small>Average Order</small><strong>{money(avgOrder30)}</strong>{avgOrderChange!==null&&<span className={"mt-1 block text-[9px] "+(avgOrderChange>=0?"text-green-600":"text-red-600")}>{avgOrderChange>=0?"↑":"↓"} {Math.abs(avgOrderChange).toFixed(0)}%</span>}</div>
    <div className="friendly-admin-kpi"><small>Customers</small><strong>{allCustomers}</strong></div>
  </div>;

  const revenuePanel=<>
    <div className="friendly-admin-card"><div className="friendly-admin-card-title">Revenue Trend (6 months)</div><div className="flex h-48 items-end gap-3">{trend.map((row,index)=><div key={index} className="flex flex-1 flex-col items-center"><div className="mb-1 text-[9px] text-gray-500">{money(row.amount)}</div><div className="w-full max-w-[48px] rounded bg-[#1a6fd4]" style={{height:Math.max(4,(row.amount/maxTrend)*140)}}/><div className="mt-1.5 text-[9px] text-gray-500">{row.label}</div></div>)}</div></div>
    <div className="grid gap-3 sm:grid-cols-3"><div className="friendly-admin-kpi"><small>Booked</small><strong>{money(revenue30)}</strong></div><div className="friendly-admin-kpi"><small>Collected</small><strong>{money(collected30)}</strong></div><div className="friendly-admin-kpi"><small>Still Due</small><strong>{money(outstanding30)}</strong></div></div>
  </>;

  const ordersPanel=<section className="friendly-admin-card flush"><div className="friendly-admin-subhead"><div><h2>Orders by Status</h2><p>Current order population by workflow status</p></div><Link href="/dashboard/orders" className="text-xs font-semibold text-[#1a6fd4]">Open Orders →</Link></div><div className="friendly-admin-table-wrap"><table className="friendly-admin-table"><thead><tr><th>Status</th><th className="numeric">Orders</th></tr></thead><tbody>{statusGroups.map(row=><tr key={row.status}><td className="capitalize">{row.status}</td><td className="numeric">{row._count._all}</td></tr>)}{!statusGroups.length&&<tr><td colSpan={2} className="friendly-admin-empty">No orders yet.</td></tr>}</tbody></table></div></section>;

  const inventoryPanel=<section className="friendly-admin-card flush"><div className="friendly-admin-subhead"><div><h2>Top Rentals by Revenue</h2><p>Highest-grossing rental items</p></div><Link href="/dashboard/inventory" className="text-xs font-semibold text-[#1a6fd4]">Open Items →</Link></div><div className="friendly-admin-table-wrap"><table className="friendly-admin-table"><thead><tr><th>Item</th><th className="numeric">Units Booked</th><th className="numeric">Recorded Line Revenue</th></tr></thead><tbody>{topItemsRaw.map(row=>{const item=itemMap.get(row.itemId);return <tr key={row.itemId}><td>{item?.name||"Unknown item"}</td><td className="numeric">{row._sum.quantity||0}</td><td className="numeric">{money(row._sum.price||0)}</td></tr>})}{!topItemsRaw.length&&<tr><td colSpan={3} className="friendly-admin-empty">No bookings yet.</td></tr>}</tbody></table></div></section>;

  return <div className="friendly-admin-page is-wide analytics-parity-page">
    <div className="friendly-admin-head analytics-parity-head"><div><h1>Analytics</h1><p>Business performance, bookings and operational insights.</p></div><div className="friendly-admin-actions"><span className="friendly-admin-secondary pointer-events-none">◷ Last 30 Days</span></div></div>
    <nav className="friendly-admin-tabs" aria-label="Analytics sections">{tabs.map(([key,label])=><Link key={key} href={"/dashboard/analytics?tab="+key} className={"friendly-admin-tab "+(tab===key?"is-active":"")}>{label}</Link>)}</nav>

    {tab==="overview"&&<div className="space-y-5">{kpis}{revenuePanel}<div className="grid gap-5 lg:grid-cols-2">{ordersPanel}{inventoryPanel}</div></div>}
    {tab==="revenue"&&<div className="space-y-5">{kpis}{revenuePanel}</div>}
    {tab==="orders"&&<div className="space-y-5"><div className="grid gap-3 sm:grid-cols-3"><div className="friendly-admin-kpi"><small>Orders (30d)</small><strong>{orders30}</strong></div><div className="friendly-admin-kpi"><small>Average Order</small><strong>{money(avgOrder30)}</strong></div><div className="friendly-admin-kpi"><small>Booked (30d)</small><strong>{money(revenue30)}</strong></div></div>{ordersPanel}</div>}
    {tab==="inventory"&&<div className="space-y-5">{inventoryPanel}<div className="flex flex-wrap gap-2"><Link href="/dashboard/deliveries/product-status-report" className="friendly-admin-secondary">Product Status Report</Link><Link href="/dashboard/deliveries/product-attention-report" className="friendly-admin-secondary">Product Attention Report</Link><Link href="/dashboard/returns" className="friendly-admin-secondary">Returns & Damage</Link></div></div>}
    {tab==="customers"&&<div className="space-y-5"><div className="grid gap-3 sm:grid-cols-3"><div className="friendly-admin-kpi"><small>Total Customers</small><strong>{allCustomers}</strong></div><div className="friendly-admin-kpi"><small>New (30d)</small><strong>{newCustomers30}</strong></div><div className="friendly-admin-kpi"><small>Orders (30d)</small><strong>{orders30}</strong></div></div><section className="friendly-admin-card"><h2 className="friendly-admin-card-title">Customer activity</h2><p className="text-xs leading-5 text-slate-500">Open the customer directory for latest payment, quote, order activity, balances and restrictions.</p><Link href="/dashboard/customers" className="friendly-admin-primary mt-4">Open Customers</Link></section></div>}
    {tab==="website"&&<section className="friendly-admin-card"><h2 className="friendly-admin-card-title">Website</h2><p className="text-xs leading-5 text-slate-500">This tenant currently has {pagesCount} saved website page{pagesCount===1?"":"s"}. Traffic analytics are not collected by this CRM yet, so this screen does not fabricate visits or conversion data.</p><div className="mt-4 flex flex-wrap gap-2"><Link href="/dashboard/website" className="friendly-admin-primary">Edit Website</Link><Link href="/dashboard/pages" className="friendly-admin-secondary">Website Pages</Link></div></section>}
    {tab==="seo"&&<section className="friendly-admin-card"><h2 className="friendly-admin-card-title">SEO configuration</h2><dl className="space-y-3 text-xs"><div><dt className="font-semibold text-slate-500">SEO title</dt><dd className="mt-1 text-slate-800">{organization.seoTitle||"Not set"}</dd></div><div><dt className="font-semibold text-slate-500">SEO description</dt><dd className="mt-1 text-slate-800">{organization.seoDescription||"Not set"}</dd></div><div><dt className="font-semibold text-slate-500">Public domain</dt><dd className="mt-1 text-slate-800">{organization.customDomain||organization.slug+".partyrentalcrm.com"}</dd></div></dl><Link href="/dashboard/settings/business#seo" className="friendly-admin-secondary mt-4">Edit SEO</Link></section>}
  </div>;
}
