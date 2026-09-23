import { getCurrentOrganization } from "@/lib/tenant";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { dashboardDates } from "@/lib/dashboardDates";
import Link from "next/link";
import HomeCalendar from "./HomeCalendar";
import HomeTasks from "./HomeTasks";
import BestSellersChart from "./BestSellersChart";
import Icon from "./components/Icon";
import {PageHeading,MetricCard,StatusBadge,EmptyState,SectionHeading,money,eventDateLabel} from "./components/TenantUI";
export default async function DashboardHomePage({searchParams: searchParamsPromise}:{searchParams:Promise<{year?:string;month?:string}>}){
  const searchParams = await searchParamsPromise;

 const org=await getCurrentOrganization();
 if(!org) redirect("/login");
 const now=new Date();
 const dates=dashboardDates(now,org.timezone,searchParams),active={in:["active","confirmed"]};
 const [itemCount,monthOrders,todayOrders,upcoming,weekCount,quoteCount,pendingCount,paymentGroups,balances,recentItems]=await Promise.all([
  prisma.item.count({where:{organizationId:org.id}}),
  prisma.order.findMany({where:{organizationId:org.id,eventDate:{gte:dates.monthStart,lt:dates.monthEnd}},select:{id:true,status:true,deliveryType:true,eventDate:true},orderBy:{eventDate:"asc"}}),
  prisma.order.findMany({where:{organizationId:org.id,status:active,eventDate:{gte:dates.today,lt:dates.tomorrow}},include:{customer:true,deliveryDriver:{select:{name:true}}},orderBy:{eventDate:"asc"}}),
  prisma.order.findMany({where:{organizationId:org.id,status:active,eventDate:{gte:dates.tomorrow}},include:{customer:true},orderBy:{eventDate:"asc"},take:5}),
  prisma.order.count({where:{organizationId:org.id,status:active,eventDate:{gte:dates.today,lt:dates.weekEnd}}}),
  prisma.order.count({where:{organizationId:org.id,status:"quote"}}),prisma.order.count({where:{organizationId:org.id,status:"pending"}}),
  prisma.payment.groupBy({by:["type"],where:{organizationId:org.id,createdAt:{gte:new Date(+now-30*86400000),lte:now}},_sum:{amount:true}}),
  prisma.order.aggregate({where:{organizationId:org.id,status:{in:["active","confirmed","completed"]},amountPaid:{lt:prisma.order.fields.totalAmount}},_sum:{totalAmount:true,amountPaid:true}}),
  prisma.orderItem.findMany({where:{order:{organizationId:org.id,status:{in:["active","confirmed","completed"]},createdAt:{gte:new Date(+now-60*86400000)}}},select:{quantity:true,item:{select:{name:true}}}}),
 ]);
 const netPayments=paymentGroups.reduce((sum,p)=>sum+(p.type==="refund"?-1:p.type==="payment"?1:0)*(p._sum.amount||0),0);
 const balance=(balances._sum.totalAmount||0)-(balances._sum.amountPaid||0);
 const deliveries=todayOrders.filter(o=>o.deliveryType!=="pickup"),pickups=todayOrders.filter(o=>o.deliveryType==="pickup");
 const popularity=new Map<string,number>();for(const line of recentItems){const name=line.item?.name||"Unnamed item";popularity.set(name,(popularity.get(name)||0)+line.quantity);}
 const best=Array.from(popularity,([name,qty])=>({name,qty})).sort((a,b)=>b.qty-a.qty).slice(0,5);
 return <div className="space-y-6 pb-4">
  <PageHeading eyebrow={dates.today.toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric",timeZone:"UTC"})} title="Your business at a glance" description="Bookings, your team's next steps, and the day ahead—all in one place." actions={<Link href="/dashboard/scheduling" className="tenant-button"><Icon name="calendar" className="h-4 w-4"/>Open calendar</Link>}/>
  {itemCount===0&&<div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-5"><div><h2 className="font-semibold text-emerald-950">Let's get your rental business ready</h2><p className="mt-1 text-sm text-emerald-800">Add your first items, set your prices, and start taking bookings.</p></div><Link href="/onboarding" className="tenant-button tenant-button-primary">Continue setup<Icon name="arrow" className="h-4 w-4"/></Link></div>}
  <section aria-label="Business summary" className="grid grid-cols-2 gap-3 xl:grid-cols-4">
   <MetricCard label="Next 7 days" value={weekCount} detail="Confirmed & active event bookings" icon="calendar" href="/dashboard/scheduling"/>
   <MetricCard label="Net payments" value={money(netPayments)} detail="Recorded payments less refunds · 30 days" icon="wallet" href="/dashboard/reports"/>
   <MetricCard label="Balance to collect" value={money(balance)} detail="Active, confirmed & completed orders" icon="orders" href="/dashboard/orders?balance=unpaid"/>
   <MetricCard label="Rental inventory" value={itemCount} detail="Items in your rental catalog" icon="box" href="/dashboard/inventory"/>
  </section>
  <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_330px]">
   <div className="space-y-6">
    <section className="tenant-panel"><SectionHeading title="Today's bookings" description={`${deliveries.length} delivery ${deliveries.length===1?"order":"orders"} · ${pickups.length} customer ${pickups.length===1?"pickup":"pickups"}`} href="/dashboard/operations" label="Open operations"/>
     {todayOrders.length?<div className="divide-y divide-slate-100">{todayOrders.map(order=><Link key={order.id} href={"/dashboard/orders/"+order.id} className="flex flex-wrap items-center gap-4 px-5 py-4 transition hover:bg-slate-50"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500"><Icon name={order.deliveryType==="pickup"?"box":"truck"}/></div><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-slate-800">{order.customer.firstName} {order.customer.lastName}</p><p className="mt-1 truncate text-xs text-slate-500">{order.orderNumber} · {order.deliveryType==="pickup"?"Customer pickup":order.deliveryDriver?.name||"Driver unassigned"}</p></div><div className="text-right"><StatusBadge status={order.status}/><p className="mt-1 text-xs text-slate-500">{money(Math.max(0,order.totalAmount-order.amountPaid))} due</p></div><Icon name="arrow" className="hidden h-4 w-4 text-slate-400 sm:block"/></Link>)}</div>:<EmptyState icon="calendar" title="A little breathing room today" description="No confirmed or active events today. Check upcoming bookings or prepare for your next event." href="/dashboard/orders" label="View orders"/>}
    </section>
    <section className="tenant-panel"><SectionHeading title="Coming up next" description="Your next confirmed and active events" href="/dashboard/orders"/>{upcoming.length?<div className="divide-y divide-slate-100">{upcoming.map(order=><Link key={order.id} href={"/dashboard/orders/"+order.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50"><div className="w-12 shrink-0 rounded-xl border border-slate-200 bg-slate-50 py-2 text-center"><span className="block text-[9px] font-semibold uppercase text-slate-500">{order.eventDate.toLocaleDateString("en-US",{month:"short",timeZone:"UTC"})}</span><b className="text-lg font-semibold text-slate-800">{order.eventDate.getUTCDate()}</b></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-800">{order.customer.firstName} {order.customer.lastName}</p><p className="mt-1 text-xs text-slate-500">{order.orderNumber} · {order.deliveryType==="pickup"?"Customer pickup":"Delivery"}</p></div><div className="text-right"><p className="text-sm font-semibold text-slate-800">{money(order.totalAmount)}</p><p className="mt-1 text-xs text-slate-500">{eventDateLabel(order.eventDate)}</p></div></Link>)}</div>:<EmptyState icon="orders" title="Ready for your next booking" description="Upcoming bookings will appear here as orders are confirmed." href="/dashboard/orders/new" label="Create an order"/>}</section>
   </div>
   <aside className="space-y-6"><section className="tenant-panel"><SectionHeading title="Keep things moving" description="Follow-ups for your office"/><div className="space-y-1 p-3">{[{label:"Open quotes",detail:"Turn an inquiry into an event",value:quoteCount,href:"/dashboard/orders?status=quote",icon:"orders" as const},{label:"Pending orders",detail:"Review the next step",value:pendingCount,href:"/dashboard/orders?status=pending",icon:"clock" as const}].map(row=><Link key={row.label} href={row.href} className="flex items-center gap-3 rounded-xl p-3 hover:bg-slate-50"><span className="rounded-lg bg-amber-50 p-2 text-amber-700"><Icon name={row.icon} className="h-4 w-4"/></span><span className="flex-1"><span className="block text-xs font-semibold text-slate-800">{row.label}</span><span className="mt-1 block text-[11px] text-slate-500">{row.detail}</span></span><span className="text-lg font-semibold text-slate-800">{row.value}</span><Icon name="arrow" className="h-3 w-3 text-slate-400"/></Link>)}</div></section><HomeTasks/><Link href="/dashboard/inventory" className="block rounded-2xl bg-[#e8efec] p-5"><Icon name="box" className="mb-3 h-6 w-6 text-emerald-800"/><h2 className="text-sm font-semibold text-emerald-950">Ready for the next rental?</h2><p className="mt-2 text-xs leading-5 text-emerald-900/70">Keep quantities, photos, and item conditions up to date before a busy weekend.</p><span className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-emerald-800">Manage inventory<Icon name="arrow" className="h-4 w-4"/></span></Link></aside>
  </div>
  <section className="tenant-panel"><SectionHeading title="Booking calendar" description="A monthly view of event dates. Customer pickups are orders collected by the customer."/><HomeCalendar year={dates.year} month={dates.month} todayKey={dates.today.toISOString().slice(0,10)} orders={monthOrders.map(o=>({...o,eventDate:o.eventDate.toISOString()}))}/></section>
  {best.length>0&&<section className="tenant-panel"><SectionHeading title="Most booked items" description="Quantities on active, confirmed & completed orders created in the last 60 days" href="/dashboard/reports" label="Open reports"/><div className="p-5"><BestSellersChart data={best}/></div></section>}
 </div>;
}
