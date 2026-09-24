import {requireCurrentOrganization} from "@/lib/tenant";
import {redirect} from "next/navigation";
import {prisma} from "@/lib/prisma";
import {dashboardDates} from "@/lib/dashboardDates";
import {getOrganizationWeather} from "@/lib/weather";
import Link from "next/link";
import HomeCalendar from "./HomeCalendar";
import HomeTasks from "./HomeTasks";
import HomeWeather from "./HomeWeather";
import HomeScreen from "./HomeScreen";
import HomeMeetings from "./HomeMeetings";
import BestSellersChart from "./BestSellersChart";
import MonthlyPaymentsChart from "./MonthlyPaymentsChart";
import Icon from "./components/Icon";
import {SectionHeading,StatusBadge,money,eventDateLabel} from "./components/TenantUI";

export default async function DashboardHomePage({searchParams:searchParamsPromise}:{searchParams:Promise<{year?:string;month?:string}>}){
 const searchParams=await searchParamsPromise;
 let org;
 try{org=await requireCurrentOrganization();}
 catch(error){
  if(error instanceof Error&&error.message==="No tenant could be resolved for this request")redirect("/login");
  throw error;
 }

 const now=new Date(),dates=dashboardDates(now,org.timezone,searchParams),active={in:["active","confirmed"]};
 const historyStart=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth()-12,1));
 const [
  itemCount,monthOrders,todayOrders,upcoming,weekCount,quoteCount,pendingCount,
  paymentGroups,todayPaymentGroups,balances,recentItems,paymentHistory,weather
 ]=await Promise.all([
  prisma.item.count({where:{organizationId:org.id}}),
  prisma.order.findMany({where:{organizationId:org.id,eventDate:{gte:dates.monthStart,lt:dates.monthEnd}},select:{id:true,status:true,deliveryType:true,eventDate:true},orderBy:{eventDate:"asc"}}),
  prisma.order.findMany({where:{organizationId:org.id,status:active,eventDate:{gte:dates.today,lt:dates.tomorrow}},include:{customer:true,deliveryDriver:{select:{name:true}}},orderBy:{eventDate:"asc"},take:8}),
  prisma.order.findMany({where:{organizationId:org.id,status:active,eventDate:{gte:dates.tomorrow}},include:{customer:true},orderBy:{eventDate:"asc"},take:6}),
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
 const monthlyPayments=Array.from(monthBuckets,([key,total])=>{const[y,m]=key.split("-").map(Number);return{label:new Date(Date.UTC(y,m-1,1)).toLocaleDateString("en-US",{month:"short",year:"2-digit",timeZone:"UTC"}),total:Math.max(0,total)};});

 return <div className="phase2-dashboard">
  <header className="phase2-dashboard-head">
   <div>
    <p className="phase2-kicker">{dates.today.toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric",timeZone:"UTC"})}</p>
    <h1>Today at a glance</h1>
    <p>What needs attention, what is moving next, and where the money stands.</p>
   </div>
   <div className="phase2-head-actions">
    <Link href="/dashboard/workforce" className="tenant-button"><Icon name="users" className="h-4 w-4"/>Employee hub</Link>
    <Link href="/dashboard/orders/new" className="tenant-button tenant-button-primary"><Icon name="plus" className="h-4 w-4"/>New order</Link>
   </div>
  </header>

  {itemCount===0&&<div className="phase2-onboarding"><div><b>Finish setting up your catalog</b><span>Add inventory and pricing before publishing online booking.</span></div><Link href="/onboarding" className="tenant-button tenant-button-primary">Continue setup</Link></div>}

  <section className="phase2-metrics" aria-label="Business summary">
   <Link href="/dashboard/reports" className="phase2-metric"><span>Collected today</span><strong>{money(collectedToday)}</strong><small>Payments less refunds</small></Link>
   <Link href="/dashboard/orders?balance=unpaid" className="phase2-metric"><span>Balance to collect</span><strong>{money(balance)}</strong><small>Open eligible balances</small></Link>
   <Link href="/dashboard/scheduling" className="phase2-metric"><span>Next 7 days</span><strong>{weekCount}</strong><small>Confirmed & active events</small></Link>
   <Link href="/dashboard/inventory" className="phase2-metric"><span>Inventory</span><strong>{itemCount}</strong><small>Catalog items</small></Link>
  </section>

  <div className="phase2-main-grid">
   <section className="tenant-panel phase2-calendar-panel">
    <SectionHeading title="Booking calendar" description="A working month view of delivery and pickup activity" href="/dashboard/scheduling" label="Open scheduling"/>
    <HomeCalendar year={dates.year} month={dates.month} todayKey={dates.today.toISOString().slice(0,10)} orders={monthOrders.map(o=>({...o,eventDate:o.eventDate.toISOString()}))}/>
   </section>

   <aside className="phase2-right-rail">
    <section className="tenant-panel">
     <SectionHeading title="Action queue" description="Office work that can turn into revenue"/>
     <div className="phase2-action-list">
      <Link href="/dashboard/orders?status=quote"><span><Icon name="orders" className="h-4 w-4"/>Open quotes</span><b>{quoteCount}</b></Link>
      <Link href="/dashboard/orders?status=pending"><span><Icon name="clock" className="h-4 w-4"/>Pending orders</span><b>{pendingCount}</b></Link>
      <Link href="/dashboard/orders?balance=unpaid"><span><Icon name="wallet" className="h-4 w-4"/>Balance follow-up</span><b>{money(balance)}</b></Link>
     </div>
    </section>

    <section className="tenant-panel">
     <SectionHeading title="Today’s run" description="Confirmed activity scheduled for today" href="/dashboard/operations" label="Operations"/>
     {todayOrders.length?<div className="phase2-event-list">{todayOrders.map(order=><Link key={order.id} href={"/dashboard/orders/"+order.id} className="phase2-event-row"><span className="phase2-event-icon"><Icon name={order.deliveryType==="pickup"?"box":"truck"} className="h-4 w-4"/></span><span className="phase2-event-copy"><b>{order.customer.firstName} {order.customer.lastName}</b><small>{order.orderNumber} · {order.deliveryType==="pickup"?"Customer pickup":order.deliveryDriver?.name||"Driver unassigned"}</small></span><StatusBadge status={order.status}/></Link>)}</div>:<div className="phase2-empty-compact"><Icon name="calendar" className="h-5 w-5"/><span>No confirmed activity today.</span></div>}
    </section>

    <HomeTasks/>
    <HomeWeather weather={weather}/>
   </aside>
  </div>

  <div className="phase2-secondary-grid">
   <section className="tenant-panel">
    <SectionHeading title="Coming up" description="The next confirmed and active events" href="/dashboard/orders" label="View orders"/>
    {upcoming.length?<div className="phase2-upcoming-list">{upcoming.map(order=><Link key={order.id} href={"/dashboard/orders/"+order.id}><span className="phase2-date-tile"><b>{order.eventDate.getUTCDate()}</b><small>{order.eventDate.toLocaleDateString("en-US",{month:"short",timeZone:"UTC"})}</small></span><span className="phase2-event-copy"><b>{order.customer.firstName} {order.customer.lastName}</b><small>{order.deliveryType==="pickup"?"Pickup":"Delivery"} · {eventDateLabel(order.eventDate)}</small></span><strong>{money(order.totalAmount)}</strong></Link>)}</div>:<div className="phase2-empty-compact"><Icon name="orders" className="h-5 w-5"/><span>No upcoming confirmed events.</span></div>}
   </section>

   <section className="tenant-panel">
    <SectionHeading title="Most booked" description="Item quantities on recent active, confirmed and completed orders" href="/dashboard/reports" label="Reports"/>
    <div className="phase2-chart-pad">{best.length?<BestSellersChart data={best}/>:<div className="phase2-empty-compact"><Icon name="box" className="h-5 w-5"/><span>No booked-item history yet.</span></div>}</div>
   </section>
  </div>

  <section className="tenant-panel phase2-payments-panel">
   <SectionHeading title="Payment trend" description={`Recorded payments less refunds · Last 13 months · 30-day net ${money(netPayments)}`} href="/dashboard/reports?tab=payments" label="Payments report"/>
   <div className="phase2-chart-pad"><MonthlyPaymentsChart data={monthlyPayments}/></div>
  </section>

  <div className="phase2-office-grid">
   <HomeScreen/>
   <HomeMeetings contactEmail={org.contactEmail}/>
  </div>
 </div>;
}
