import { requireCurrentOrganization } from "@/lib/tenant";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { dashboardDates } from "@/lib/dashboardDates";
import { getOrganizationWeather } from "@/lib/weather";
import Link from "next/link";
import HomeCalendar from "./HomeCalendar";
import HomeTasks from "./HomeTasks";
import HomeWeather from "./HomeWeather";
import HomeScreen from "./HomeScreen";
import HomeMeetings from "./HomeMeetings";
import BestSellersChart from "./BestSellersChart";
import MonthlyPaymentsChart from "./MonthlyPaymentsChart";
import Icon from "./components/Icon";
import {SectionHeading,money} from "./components/TenantUI";

export default async function DashboardHomePage({searchParams: searchParamsPromise}:{searchParams:Promise<{year?:string;month?:string}>}){
 const searchParams=await searchParamsPromise;
 let org;
 try{org=await requireCurrentOrganization();}
 catch(error){
  if(error instanceof Error&&error.message==="No tenant could be resolved for this request") redirect("/login");
  throw error;
 }
 const now=new Date(),dates=dashboardDates(now,org.timezone,searchParams),active={in:["active","confirmed"]};
 const historyStart=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth()-12,1));
 const [
  itemCount,monthOrders,weekCount,quoteCount,pendingCount,paymentGroups,todayPaymentGroups,
  balances,recentItems,paymentHistory,weather
 ]=await Promise.all([
  prisma.item.count({where:{organizationId:org.id}}),
  prisma.order.findMany({where:{organizationId:org.id,eventDate:{gte:dates.monthStart,lt:dates.monthEnd}},select:{id:true,status:true,deliveryType:true,eventDate:true},orderBy:{eventDate:"asc"}}),
  prisma.order.count({where:{organizationId:org.id,status:active,eventDate:{gte:dates.today,lt:dates.weekEnd}}}),
  prisma.order.count({where:{organizationId:org.id,status:"quote"}}),
  prisma.order.count({where:{organizationId:org.id,status:"pending"}}),
  prisma.payment.groupBy({by:["type"],where:{organizationId:org.id,createdAt:{gte:new Date(+now-30*86400000),lte:now}},_sum:{amount:true}}),
  prisma.payment.groupBy({by:["type"],where:{organizationId:org.id,createdAt:{gte:dates.today,lt:dates.tomorrow}},_sum:{amount:true}}),
  prisma.order.aggregate({where:{organizationId:org.id,status:{in:["active","confirmed","completed"]},amountPaid:{lt:prisma.order.fields.totalAmount}},_sum:{totalAmount:true,amountPaid:true}}),
  prisma.orderItem.findMany({where:{order:{organizationId:org.id,status:{in:["active","confirmed","completed"]},createdAt:{gte:new Date(+now-60*86400000)}}},select:{quantity:true,item:{select:{name:true}}}}),
  prisma.payment.findMany({where:{organizationId:org.id,createdAt:{gte:historyStart,lte:now}},select:{amount:true,type:true,createdAt:true},orderBy:{createdAt:"asc"}}),
  getOrganizationWeather(org).catch(()=>null),
 ]);
 const net=(rows:any[])=>rows.reduce((sum,p)=>sum+(p.type==="refund"?-1:p.type==="payment"?1:0)*(p._sum.amount||0),0);
 const netPayments=net(paymentGroups),collectedToday=net(todayPaymentGroups);
 const balance=(balances._sum.totalAmount||0)-(balances._sum.amountPaid||0);
 const popularity=new Map<string,number>();
 for(const line of recentItems){const name=line.item?.name||"Unnamed item";popularity.set(name,(popularity.get(name)||0)+line.quantity);}
 const best=Array.from(popularity,([name,qty])=>({name,qty})).sort((a,b)=>b.qty-a.qty).slice(0,6);
 const monthBuckets=new Map<string,number>();
 for(let i=12;i>=0;i--){const d=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth()-i,1));monthBuckets.set(`${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,"0")}`,0);}
 for(const p of paymentHistory){const key=`${p.createdAt.getUTCFullYear()}-${String(p.createdAt.getUTCMonth()+1).padStart(2,"0")}`;if(monthBuckets.has(key)){const signed=p.type==="refund"?-p.amount:p.type==="payment"?p.amount:0;monthBuckets.set(key,(monthBuckets.get(key)||0)+signed);}}
 const monthlyPayments=Array.from(monthBuckets,([key,total])=>{const [y,m]=key.split("-").map(Number);return{label:new Date(Date.UTC(y,m-1,1)).toLocaleDateString("en-US",{month:"short",year:"2-digit",timeZone:"UTC"}),total:Math.max(0,total)};});
 return <div className="fpr-home pb-5">
  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
   <Link href="/dashboard/workforce" className="tenant-button"><Icon name="users" className="h-4 w-4"/>Open Employee Hub</Link>
   <div className="flex flex-wrap gap-2">
    <Link href="/dashboard/orders/new" className="tenant-button tenant-button-primary"><Icon name="plus" className="h-4 w-4"/>New Order</Link>
    <Link href="/dashboard/scheduling" className="tenant-button"><Icon name="calendar" className="h-4 w-4"/>Full Calendar</Link>
   </div>
  </div>

  {itemCount===0&&<div className="mb-3 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-green-200 bg-green-50 p-4"><div><h2 className="font-semibold text-green-950">Get your rental business ready</h2><p className="mt-1 text-xs text-green-800">Add inventory and pricing before taking live bookings.</p></div><Link href="/onboarding" className="tenant-button tenant-button-primary">Continue setup</Link></div>}

  <div className="fpr-home-grid">
   <div className="min-w-0 space-y-3">
    <section className="tenant-panel">
     <HomeCalendar year={dates.year} month={dates.month} todayKey={dates.today.toISOString().slice(0,10)} orders={monthOrders.map(o=>({...o,eventDate:o.eventDate.toISOString()}))}/>
    </section>
    <HomeScreen/>
    <HomeMeetings contactEmail={org.contactEmail}/>
   </div>

   <aside className="min-w-0 space-y-3">
    <Link href="/dashboard/reports" className="tenant-metric tenant-metric-green block"><span className="text-xs font-semibold text-slate-500">Collected Today</span><div className="mt-2 text-[28px] font-bold tracking-tight text-slate-950 tabular-nums">{money(collectedToday)}</div><p className="mt-1 text-[11px] text-slate-500">Recorded payments less refunds today</p></Link>
    <Link href="/dashboard/inventory" className="tenant-metric tenant-metric-blue block"><span className="text-xs font-semibold text-slate-500">Inventory Count</span><div className="mt-2 text-[28px] font-bold tracking-tight text-slate-950 tabular-nums">{itemCount}</div><p className="mt-1 text-[11px] text-slate-500">Rental catalog items</p></Link>
    <HomeTasks/>
    <section className="tenant-panel"><SectionHeading title="Best Sellers" description="Last 60 days" href="/dashboard/reports" label="Report"/><div className="p-3">{best.length?<BestSellersChart data={best}/>:<p className="py-8 text-center text-xs text-slate-400">No booked-item history yet.</p>}</div></section>
    <HomeWeather weather={weather}/>
    <section className="tenant-panel">
     <SectionHeading title="Quick Business Snapshot" href="/dashboard/reports" label="Open report"/>
     <div className="grid grid-cols-2 gap-px bg-slate-100">
      <Link href="/dashboard/scheduling" className="bg-white p-3 hover:bg-slate-50"><span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Next 7 days</span><b className="mt-1 block text-xl text-slate-900">{weekCount}</b></Link>
      <Link href="/dashboard/orders?balance=unpaid" className="bg-white p-3 hover:bg-slate-50"><span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Balance due</span><b className="mt-1 block text-xl text-slate-900">{money(balance)}</b></Link>
      <Link href="/dashboard/orders?status=quote" className="bg-white p-3 hover:bg-slate-50"><span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Open quotes</span><b className="mt-1 block text-xl text-slate-900">{quoteCount}</b></Link>
      <Link href="/dashboard/orders?status=pending" className="bg-white p-3 hover:bg-slate-50"><span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Pending</span><b className="mt-1 block text-xl text-slate-900">{pendingCount}</b></Link>
     </div>
    </section>
    <Link href="/dashboard/reports" className="block rounded-lg border border-slate-200 bg-white px-4 py-3 text-xs font-semibold text-blue-700 shadow-sm">Month to Date → Go to report</Link>
    <section className="tenant-panel"><SectionHeading title="Recent Platform Updates"/><div className="space-y-1 px-4 py-3 text-[11px] leading-5 text-slate-600"><p>• Rental operations workspace</p><p>• Warehouse and return workflows</p><p>• Online booking and website tools</p></div></section>
   </aside>
  </div>

  <section className="tenant-panel mt-3">
   <SectionHeading title="Monthly Payments Received" description={`Recorded tenant payments less refunds · Last 13 months · 30-day net: ${money(netPayments)}`} href="/dashboard/reports?tab=payments" label="Open payments report"/>
   <div className="p-3"><MonthlyPaymentsChart data={monthlyPayments}/></div>
  </section>
 </div>;
}
