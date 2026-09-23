import { requireCurrentOrganization } from "@/lib/tenant";
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

 let org;
 try{org=await requireCurrentOrganization();}
 catch(error){
  if(error instanceof Error&&error.message==="No tenant could be resolved for this request") redirect("/login");
  throw error;
 }
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
 return <div className="space-y-4 pb-4">
  <PageHeading
   eyebrow={dates.today.toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric",timeZone:"UTC"})}
   title="Dashboard"
   description="Bookings, payments, inventory, and today’s rental operations at a glance."
   actions={<div className="flex gap-2"><Link href="/dashboard/scheduling" className="tenant-button"><Icon name="calendar" className="h-4 w-4"/>Full Calendar</Link><Link href="/dashboard/orders/new" className="tenant-button tenant-button-primary"><Icon name="plus" className="h-4 w-4"/>Create Order</Link></div>}
  />

  {itemCount===0&&<div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-green-200 bg-green-50 p-4"><div><h2 className="font-semibold text-green-950">Let’s get your rental business ready</h2><p className="mt-1 text-xs text-green-800">Add your first items, set your prices, and start taking bookings.</p></div><Link href="/onboarding" className="tenant-button tenant-button-primary">Continue setup<Icon name="arrow" className="h-4 w-4"/></Link></div>}

  <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.75fr)_360px]">
   <section className="tenant-panel">
    <SectionHeading title="Booking Calendar" description="Your event schedule at a glance" href="/dashboard/scheduling" label="Open scheduling"/>
    <HomeCalendar year={dates.year} month={dates.month} todayKey={dates.today.toISOString().slice(0,10)} orders={monthOrders.map(o=>({...o,eventDate:o.eventDate.toISOString()}))}/>
   </section>

   <aside className="space-y-3">
    <div className="grid grid-cols-2 gap-3">
     <MetricCard label="Upcoming Events" value={weekCount} detail="Next 7 days" icon="calendar" href="/dashboard/scheduling"/>
     <MetricCard label="Payments" value={money(netPayments)} detail="Last 30 days" icon="wallet" href="/dashboard/reports"/>
     <MetricCard label="Balance Due" value={money(balance)} detail="To collect" icon="orders" href="/dashboard/orders?balance=unpaid"/>
     <MetricCard label="Inventory" value={itemCount} detail="Catalog items" icon="box" href="/dashboard/inventory"/>
    </div>

    <section className="tenant-panel">
     <SectionHeading title="Office Follow-ups" description="Items needing attention"/>
     <div className="space-y-1 p-3">
      {[
       {label:"Open quotes",detail:"Turn an inquiry into an event",value:quoteCount,href:"/dashboard/orders?status=quote",icon:"orders" as const},
       {label:"Pending orders",detail:"Review the next step",value:pendingCount,href:"/dashboard/orders?status=pending",icon:"clock" as const},
      ].map(row=><Link key={row.label} href={row.href} className="flex items-center gap-3 rounded-lg p-2.5 hover:bg-slate-50"><span className="rounded-md bg-green-50 p-2 text-green-700"><Icon name={row.icon} className="h-4 w-4"/></span><span className="min-w-0 flex-1"><span className="block text-xs font-semibold text-slate-800">{row.label}</span><span className="mt-0.5 block truncate text-[10px] text-slate-500">{row.detail}</span></span><span className="text-lg font-bold text-slate-800">{row.value}</span></Link>)}
     </div>
    </section>

    <HomeTasks/>
   </aside>
  </div>

  <div className="grid gap-4 xl:grid-cols-2">
   <section className="tenant-panel">
    <SectionHeading title="Today’s Bookings" description={`${deliveries.length} delivery ${deliveries.length===1?"order":"orders"} · ${pickups.length} customer ${pickups.length===1?"pickup":"pickups"}`} href="/dashboard/operations" label="Open operations"/>
    {todayOrders.length?<div className="divide-y divide-slate-100">{todayOrders.map(order=><Link key={order.id} href={"/dashboard/orders/"+order.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500"><Icon name={order.deliveryType==="pickup"?"box":"truck"}/></div><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-slate-800">{order.customer.firstName} {order.customer.lastName}</p><p className="mt-0.5 truncate text-[10px] text-slate-500">{order.orderNumber} · {order.deliveryType==="pickup"?"Customer pickup":order.deliveryDriver?.name||"Driver unassigned"}</p></div><div className="text-right"><StatusBadge status={order.status}/><p className="mt-1 text-[10px] text-slate-500">{money(Math.max(0,order.totalAmount-order.amountPaid))} due</p></div></Link>)}</div>:<EmptyState icon="calendar" title="No bookings today" description="Confirmed and active events scheduled for today will appear here." href="/dashboard/orders" label="View orders"/>}
   </section>

   <section className="tenant-panel">
    <SectionHeading title="Coming Up Next" description="Your next confirmed and active events" href="/dashboard/orders"/>
    {upcoming.length?<div className="divide-y divide-slate-100">{upcoming.map(order=><Link key={order.id} href={"/dashboard/orders/"+order.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50"><div className="w-11 shrink-0 rounded-lg border border-slate-200 bg-slate-50 py-1.5 text-center"><span className="block text-[9px] font-semibold uppercase text-slate-500">{order.eventDate.toLocaleDateString("en-US",{month:"short",timeZone:"UTC"})}</span><b className="text-base font-bold text-slate-800">{order.eventDate.getUTCDate()}</b></div><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-slate-800">{order.customer.firstName} {order.customer.lastName}</p><p className="mt-0.5 text-[10px] text-slate-500">{order.orderNumber} · {order.deliveryType==="pickup"?"Customer pickup":"Delivery"}</p></div><div className="text-right"><p className="text-xs font-bold text-slate-800">{money(order.totalAmount)}</p><p className="mt-0.5 text-[10px] text-slate-500">{eventDateLabel(order.eventDate)}</p></div></Link>)}</div>:<EmptyState icon="orders" title="Ready for your next booking" description="Upcoming bookings will appear here as orders are confirmed." href="/dashboard/orders/new" label="Create an order"/>}
   </section>
  </div>

  {best.length>0&&<section className="tenant-panel"><SectionHeading title="Most Booked Items" description="Quantities on active, confirmed & completed orders created in the last 60 days" href="/dashboard/reports" label="Open reports"/><div className="p-4"><BestSellersChart data={best}/></div></section>}
 </div>;
}
