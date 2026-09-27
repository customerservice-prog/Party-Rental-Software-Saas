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
import {SectionHeading,money} from "./components/TenantUI";

export default async function DashboardHomePage({searchParams:searchParamsPromise}:{searchParams:Promise<{year?:string;month?:string}>}){
 const searchParams=await searchParamsPromise;
 let org;
 try{org=await requireCurrentOrganization();}
 catch(error){
  if(error instanceof Error&&error.message==="No tenant could be resolved for this request")redirect("/login");
  throw error;
 }

 const now=new Date(),dates=dashboardDates(now,org.timezone,searchParams);
 const historyStart=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth()-12,1));
 const [
  itemCount,monthOrders,quoteCount,incompleteCount,todayPaymentGroups,balances,recentItems,paymentHistory,weather
 ]=await Promise.all([
  prisma.item.count({where:{organizationId:org.id}}),
  prisma.order.findMany({where:{organizationId:org.id,eventDate:{gte:dates.monthStart,lt:dates.monthEnd}},select:{id:true,orderNumber:true,status:true,deliveryType:true,eventDate:true,eventEndDate:true,totalAmount:true,amountPaid:true,deliveryAddress:true,customer:{select:{firstName:true,lastName:true,email:true,phone:true}},items:{select:{id:true,quantity:true,price:true,item:{select:{name:true}}}}},orderBy:{eventDate:"asc"}}),
  prisma.order.count({where:{organizationId:org.id,status:"quote"}}),
  prisma.order.count({where:{organizationId:org.id,status:{in:["incomplete","pending"]}}}),
  prisma.payment.groupBy({by:["type"],where:{organizationId:org.id,createdAt:{gte:dates.today,lt:dates.tomorrow}},_sum:{amount:true}}),
  prisma.order.aggregate({where:{organizationId:org.id,status:{in:["active","confirmed","completed"]},amountPaid:{lt:prisma.order.fields.totalAmount}},_sum:{totalAmount:true,amountPaid:true}}),
  prisma.orderItem.findMany({where:{order:{organizationId:org.id,status:{in:["active","confirmed","completed"]},createdAt:{gte:new Date(+now-60*86400000)}}},select:{quantity:true,item:{select:{name:true}}}}),
  prisma.payment.findMany({where:{organizationId:org.id,createdAt:{gte:historyStart,lte:now}},select:{amount:true,type:true,createdAt:true},orderBy:{createdAt:"asc"}}),
  getOrganizationWeather(org).catch(()=>null),
 ]);

 const collectedToday=todayPaymentGroups.reduce((sum,p)=>sum+(p.type==="refund"?-1:p.type==="payment"?1:0)*(p._sum.amount||0),0);
 const balance=(balances._sum.totalAmount||0)-(balances._sum.amountPaid||0);
 const popularity=new Map<string,number>();
 for(const line of recentItems){const name=line.item?.name||"Unnamed item";popularity.set(name,(popularity.get(name)||0)+line.quantity);}
 const best=Array.from(popularity,([name,qty])=>({name,qty})).sort((a,b)=>b.qty-a.qty).slice(0,6);
 const monthBuckets=new Map<string,number>();
 for(let i=12;i>=0;i--){const d=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth()-i,1));monthBuckets.set(`${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,"0")}`,0);}
 for(const p of paymentHistory){const key=`${p.createdAt.getUTCFullYear()}-${String(p.createdAt.getUTCMonth()+1).padStart(2,"0")}`;if(monthBuckets.has(key)){const signed=p.type==="refund"?-p.amount:p.type==="payment"?p.amount:0;monthBuckets.set(key,(monthBuckets.get(key)||0)+signed);}}
 const monthlyPayments=Array.from(monthBuckets,([key,total])=>{const[y,m]=key.split("-").map(Number);return{label:new Date(Date.UTC(y,m-1,1)).toLocaleDateString("en-US",{month:"short",year:"2-digit",timeZone:"UTC"}),total:Math.max(0,total)};});

 return <div className="phase3-dashboard">
  <div className="phase3-toolbar">
   <Link href="/dashboard/workforce" className="tenant-button"><Icon name="users" className="h-4 w-4"/>Open Employee Hub</Link>
  </div>

  <details className="mb-3 rounded-lg border border-slate-200 bg-white shadow-sm">
   <summary className="cursor-pointer px-4 py-3 text-sm font-extrabold text-green-800">All tools</summary>
   <div className="grid gap-2 border-t border-slate-100 px-4 py-4 sm:grid-cols-2 lg:grid-cols-4">
    {[
      ["/dashboard/orders/new","New Order","Create a quote or booking"],
      ["/dashboard/orders","Orders","Quotes, active, incomplete & completed"],
      ["/dashboard/customers","Customers","Customer records and balances"],
      ["/dashboard/inventory","Items","Inventory, pricing and condition"],
      ["/dashboard/categories","Categories","Website groups and category images"],
      ["/dashboard/deliveries","Delivery","Calendar, drivers and print tools"],
      ["/dashboard/scheduling","Scheduling","Event calendar and schedule"],
      ["/dashboard/dispatch","Dispatch","Assign drivers and routes"],
      ["/dashboard/warehouse","Warehouse","Fulfillment and scanning"],
      ["/dashboard/returns","Returns & Damage","Returns, damage and exceptions"],
      ["/dashboard/do-not-rent","Do Not Rent","Customer and address restrictions"],
      ["/dashboard/tasks","Tasks","Office and crew tasks"],
      ["/dashboard/messages","Messages","Customer email and SMS"],
      ["/dashboard/automations","Automations","Booking follow-ups"],
      ["/dashboard/reports","Reports","Operational and financial reports"],
      ["/dashboard/settings","Admin Settings","Company, pricing and integrations"],
    ].map(([href,title,description])=><Link key={href} href={href} className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 hover:border-green-300 hover:bg-green-50"><b className="block text-xs text-slate-800">{title}</b><span className="mt-1 block text-[10px] leading-4 text-slate-500">{description}</span></Link>)}
   </div>
  </details>

  {itemCount===0&&<div className="phase3-onboarding"><div><b>Finish setting up your catalog</b><span>Add inventory and pricing before publishing online booking.</span></div><Link href="/onboarding" className="tenant-button tenant-button-primary">Continue setup</Link></div>}

  <div className="phase3-main">
   <div className="phase3-primary-column">
    <section className="tenant-panel phase3-calendar">
     <HomeCalendar year={dates.year} month={dates.month} todayKey={dates.today.toISOString().slice(0,10)} orders={monthOrders.map(o=>({id:o.id,orderNumber:o.orderNumber,status:o.status,deliveryType:o.deliveryType,eventDate:o.eventDate.toISOString(),eventEndDate:o.eventEndDate?.toISOString()||null,totalAmount:o.totalAmount,amountPaid:o.amountPaid,deliveryAddress:o.deliveryAddress,customerName:(o.customer.firstName+" "+o.customer.lastName).trim(),customerEmail:o.customer.email,customerPhone:o.customer.phone,items:o.items.map(line=>({id:line.id,name:line.item.name,quantity:line.quantity,price:line.price}))}))}/>
    </section>

    <HomeScreen/>
    <HomeMeetings contactEmail={org.contactEmail}/>
   </div>

   <aside className="phase3-rail">
    <Link href="/dashboard/reports" className="phase3-kpi phase3-kpi-green">
     <span>Collected Today</span><strong>{money(collectedToday)}</strong><small>Payments less refunds</small>
    </Link>

    <Link href="/dashboard/inventory" className="phase3-kpi phase3-kpi-blue">
     <span>Inventory Count</span><strong>{itemCount}</strong><small>Rental catalog items</small>
    </Link>

    <HomeTasks/>

    <section className="tenant-panel">
     <SectionHeading title="Best Sellers" description="Last 60 days" href="/dashboard/reports" label="Report"/>
     <div className="phase3-best">{best.length?<BestSellersChart data={best}/>:<p className="phase3-empty">No booked-item history yet.</p>}</div>
    </section>

    <HomeWeather weather={weather}/>

    <section className="tenant-panel phase3-followups">
     <SectionHeading title="Office Follow-ups" href="/dashboard/orders" label="Orders"/>
     <div>
      <Link href="/dashboard/orders?status=quote"><span>Open quotes</span><b>{quoteCount}</b></Link>
      <Link href="/dashboard/orders?status=incomplete"><span>Incomplete orders</span><b>{incompleteCount}</b></Link>
      <Link href="/dashboard/orders?balance=unpaid"><span>Balance to collect</span><b>{money(balance)}</b></Link>
     </div>
    </section>

    <Link href="/dashboard/reports" className="phase3-report-link">Month to Date → Go to report</Link>
   </aside>
  </div>

  <section className="tenant-panel phase3-payments">
   <SectionHeading title="Monthly Payments Received" description="Recorded payments less refunds over the last 13 months" href="/dashboard/reports/overview?tab=payments" label="Open payments report"/>
   <div className="phase3-payments-chart"><MonthlyPaymentsChart data={monthlyPayments}/></div>
  </section>
 </div>;
}
