import Link from "next/link";
import {requireCurrentOrganization} from "@/lib/tenant";
import {prisma} from "@/lib/prisma";
import AssignDriverSelect from "./assign-driver-select";

const MONTHS=["January","February","March","April","May","June","July","August","September","October","November","December"];
const WEEKDAYS=["S","M","T","W","T","F","S"];

function dayKey(date:Date,timeZone:string){
  const parts=new Intl.DateTimeFormat("en-US",{timeZone,year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(date);
  const map=Object.fromEntries(parts.map(part=>[part.type,part.value]));
  return map.year+"-"+map.month+"-"+map.day;
}
function pad(n:number){return String(n).padStart(2,"0");}
function money(n:number){return new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(n);}
function queryHref(month:number,year:number,date?:string,type="all",status="active"){
  const params=new URLSearchParams({month:String(month),year:String(year),type,status});
  if(date)params.set("date",date);
  return "/dashboard/deliveries?"+params.toString();
}

export default async function DeliveriesPage({searchParams:searchParamsPromise}:{searchParams:Promise<{month?:string;year?:string;date?:string;type?:string;status?:string}>}){
  const searchParams=await searchParamsPromise;
  const organization=await requireCurrentOrganization();
  const now=new Date();
  const parsedMonth=Number(searchParams.month);
  const parsedYear=Number(searchParams.year);
  const month=Number.isInteger(parsedMonth)&&parsedMonth>=0&&parsedMonth<=11?parsedMonth:now.getMonth();
  const year=Number.isInteger(parsedYear)&&parsedYear>=2020&&parsedYear<=2100?parsedYear:now.getFullYear();
  const type=["all","delivery","pickup"].includes(searchParams.type||"")?String(searchParams.type):"all";
  const status=["active","all","cancelled"].includes(searchParams.status||"")?String(searchParams.status):"active";
  const selectedDate=/^\d{4}-\d{2}-\d{2}$/.test(searchParams.date||"")?String(searchParams.date):undefined;

  const monthStart=new Date(year,month,1);
  const monthEnd=new Date(year,month+1,1);
  const [monthOrders,drivers,closedDates]=await Promise.all([
    prisma.order.findMany({
      where:{organizationId:organization.id,eventDate:{gte:monthStart,lt:monthEnd}},
      orderBy:{eventDate:"asc"},
      include:{customer:true,deliveryDriver:true,pickupDriver:true,driverRunStops:{include:{driverRun:{include:{driver:true}}},orderBy:{stopOrder:"asc"}}},
    }),
    prisma.driver.findMany({where:{organizationId:organization.id,isActive:true},orderBy:{name:"asc"}}),
    prisma.closedDate.findMany({where:{organizationId:organization.id,date:{gte:monthStart,lt:monthEnd}},orderBy:{date:"asc"}}),
  ]);

  const normalized=monthOrders.map(order=>({...order,dateKey:dayKey(order.eventDate,organization.timezone||"America/New_York")}));
  const activeOrders=normalized.filter(order=>order.status!=="cancelled"&&order.status!=="canceled");
  const visibleByStatus=normalized.filter(order=>{
    const canceled=order.status==="cancelled"||order.status==="canceled";
    if(status==="all")return true;
    if(status==="cancelled")return canceled;
    return !canceled;
  });
  const visibleOrders=visibleByStatus.filter(order=>type==="all"||order.deliveryType===type);
  const selectedOrders=selectedDate?visibleOrders.filter(order=>order.dateKey===selectedDate):[];

  const calByDate=new Map<string,{delivery:number;pickup:number;total:number}>();
  for(const order of visibleOrders){
    const current=calByDate.get(order.dateKey)||{delivery:0,pickup:0,total:0};
    current.total++;
    if(order.deliveryType==="pickup")current.pickup++;else current.delivery++;
    calByDate.set(order.dateKey,current);
  }
  const closedSet=new Set(closedDates.map(row=>dayKey(row.date,organization.timezone||"America/New_York")));

  const firstWeekday=new Date(year,month,1).getDay();
  const daysInMonth=new Date(year,month+1,0).getDate();
  const cells:Array<{day:number;dateKey:string}|null>=[];
  for(let i=0;i<firstWeekday;i++)cells.push(null);
  for(let day=1;day<=daysInMonth;day++)cells.push({day,dateKey:year+"-"+pad(month+1)+"-"+pad(day)});

  const prevMonth=month===0?11:month-1,prevYear=month===0?year-1:year;
  const nextMonth=month===11?0:month+1,nextYear=month===11?year+1:year;
  const deliveryCount=activeOrders.filter(order=>order.deliveryType!=="pickup").length;
  const pickupCount=activeOrders.filter(order=>order.deliveryType==="pickup").length;

  return <div className="friendly-admin-page is-wide">
    <div className="friendly-admin-head">
      <div><h1>Delivery Schedule</h1><p>Click a day to view and manage its deliveries and pickups.</p></div>
      <div className="friendly-admin-actions">
        <Link href="/driver" target="_blank" className="friendly-admin-secondary">Open Driver App</Link>
        <Link href="/dashboard/drivers" className="friendly-admin-secondary">Manage Drivers</Link>
      </div>
    </div>

    <section className="friendly-admin-card accent-green">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><h2 className="text-sm font-extrabold text-slate-900">Driver App</h2><p className="mt-1 text-xs text-slate-500">Drivers use their PIN at the Driver App to see assigned stops, customer details, proof, and fulfillment actions.</p></div>
        <div className="flex flex-wrap gap-2"><Link href="/driver" target="_blank" className="friendly-admin-secondary">Open Driver App →</Link><Link href="/dashboard/drivers" className="friendly-admin-secondary">Driver names & PINs →</Link></div>
      </div>
    </section>

    <div className="mb-4 flex flex-wrap gap-2">
      <Link href="/dashboard/dispatch" className="friendly-admin-secondary">Assign Drivers</Link>
      <Link href="/dashboard/dispatch" className="friendly-admin-secondary">Truck / Route Tracker</Link>
      <Link href="/dashboard/deliveries/print-contracts" target="_blank" className="friendly-admin-secondary">Print Contracts</Link>
      <Link href="/dashboard/deliveries/print-invoices" target="_blank" className="friendly-admin-secondary">Print Invoices</Link>
      <Link href="/dashboard/deliveries/packing-list" target="_blank" className="friendly-admin-secondary">Packing List</Link>
      <Link href="/dashboard/deliveries/product-status-report" className="friendly-admin-secondary">Product Status Report</Link>
      <Link href="/dashboard/deliveries/product-attention-report" className="friendly-admin-secondary">Product Attention Report</Link>
    </div>

    <section className="friendly-admin-card !p-0 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <form action="/dashboard/orders" method="get" className="flex items-center gap-2">
            <input name="q" aria-label="Search orders or customers" placeholder="Name, phone, email, or order #" className="friendly-admin-field w-[220px] max-w-full"/>
            <button type="submit" className="friendly-admin-secondary !min-h-0 !px-3 !py-1">Search &gt;&gt;</button>
          </form>
          <Link href={queryHref(prevMonth,prevYear,undefined,type,status)} className="friendly-admin-secondary !min-h-0 !px-3 !py-1">Prev</Link>
          <strong className="min-w-[150px] text-center text-sm">{MONTHS[month]} {year}</strong>
          <Link href={queryHref(nextMonth,nextYear,undefined,type,status)} className="friendly-admin-secondary !min-h-0 !px-3 !py-1">Next</Link>
          <Link href={queryHref(now.getMonth(),now.getFullYear(),undefined,type,status)} className="friendly-admin-secondary !min-h-0 !px-3 !py-1">This Month</Link>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded bg-blue-50 px-2 py-1 font-semibold text-blue-700">{deliveryCount} deliveries</span>
          <span className="rounded bg-amber-50 px-2 py-1 font-semibold text-amber-700">{pickupCount} pickups</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-slate-200 px-4 py-3">
        {["all","delivery","pickup"].map(value=><Link key={value} href={queryHref(month,year,selectedDate,value,status)} className={"friendly-admin-secondary !min-h-0 !px-3 !py-1 "+(type===value?"!border-green-700 !bg-green-50 !text-green-800":"")}>{value==="all"?"All":value==="delivery"?"Deliveries":"Pickups"}</Link>)}
        <span className="mx-1 h-8 w-px bg-slate-200"/>
        {["active","all","cancelled"].map(value=><Link key={value} href={queryHref(month,year,selectedDate,type,value)} className={"friendly-admin-secondary !min-h-0 !px-3 !py-1 "+(status===value?"!border-green-700 !bg-green-50 !text-green-800":"")}>{value==="active"?"Active":value==="all"?"All statuses":"Canceled"}</Link>)}
      </div>

      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">{WEEKDAYS.map((label,index)=><div key={index} className="py-2 text-center text-[10px] font-extrabold text-slate-500">{label}</div>)}</div>
      <div className="grid grid-cols-7">
        {cells.map((cell,index)=>{
          if(!cell)return <div key={"blank-"+index} className="min-h-[88px] border-b border-r border-slate-100 bg-slate-50/40"/>;
          const summary=calByDate.get(cell.dateKey),closed=closedSet.has(cell.dateKey),selected=selectedDate===cell.dateKey,today=cell.dateKey===dayKey(now,organization.timezone||"America/New_York");
          return <Link key={cell.dateKey} href={queryHref(month,year,cell.dateKey,type,status)} className={"min-h-[88px] border-b border-r border-slate-100 p-2 transition hover:bg-blue-50/40 "+(selected?"bg-green-50 ring-1 ring-inset ring-green-700":"")}>
            <div className="flex items-center justify-between"><span className={"text-xs font-bold "+(today?"flex h-6 w-6 items-center justify-center rounded-full bg-green-700 text-white":"text-slate-700")}>{cell.day}</span>{closed&&<span className="text-[8px] font-bold uppercase text-red-600">Closed</span>}</div>
            {summary&&<div className="mt-2 space-y-1">{summary.delivery>0&&<div className="rounded bg-blue-100 px-1.5 py-1 text-[9px] font-bold text-blue-800">{summary.delivery} delivery{summary.delivery===1?"":"s"}</div>}{summary.pickup>0&&<div className="rounded bg-amber-100 px-1.5 py-1 text-[9px] font-bold text-amber-800">{summary.pickup} pickup{summary.pickup===1?"":"s"}</div>}</div>}
          </Link>;
        })}
      </div>
    </section>

    {selectedDate?<section className="friendly-admin-card !p-0 overflow-hidden">
      <div className="friendly-admin-subhead"><div><h2>{new Date(selectedDate+"T12:00:00").toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"})}</h2><p>{selectedOrders.length} scheduled order{selectedOrders.length===1?"":"s"}</p></div><Link href={"/dashboard/dispatch?date="+selectedDate} className="friendly-admin-secondary !min-h-0 !px-3 !py-1">Work Route / Dispatch →</Link></div>
      {selectedOrders.length?<div className="divide-y divide-slate-100">{selectedOrders.map(order=>{
        const due=Math.max(0,order.totalAmount-order.amountPaid),canceled=order.status==="cancelled"||order.status==="canceled";
        const dispatchStop=order.driverRunStops.find(stop=>dayKey(stop.driverRun.runDate,organization.timezone||"America/New_York")===selectedDate)||order.driverRunStops[0]||null;
        const dispatchStatus=dispatchStop?.status?dispatchStop.status.replaceAll("_"," "):"not started";
        return <div key={order.id} className={"p-4 "+(canceled?"opacity-60":"")}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2"><span className={"friendly-admin-badge "+(order.deliveryType==="pickup"?"yellow":"blue")}>{order.deliveryType==="pickup"?"Customer Pickup":"Delivery"}</span>{canceled&&<span className="friendly-admin-badge gray">Canceled</span>}<Link href={"/dashboard/orders/"+order.id} className="font-bold text-[#1a6fd4] hover:underline">#{order.orderNumber}</Link><span className="font-semibold">{order.customer.firstName} {order.customer.lastName}</span></div>
              <p className="mt-2 text-xs text-slate-500">{order.deliveryAddress||order.customer.address||"No delivery address on file"}</p>
              <div className="mt-2 flex flex-wrap gap-3 text-[10px] text-slate-500">
                <span>Status: <b className="capitalize text-slate-700">{order.status}</b></span>
                <span>Driver: <b className="text-slate-700">{dispatchStop?.driverRun.driver.name||order.deliveryDriver?.name||order.pickupDriver?.name||"Unassigned"}</b></span>
                <span>Route: <b className="text-slate-700">{dispatchStop?"Stop "+dispatchStop.stopOrder:"Not assigned"}</b></span>
                <span>Route status: <b className="capitalize text-slate-700">{dispatchStatus}</b></span>
                {dispatchStop?.attentionStatus&&<span>Attention: <b className="capitalize text-amber-700">{dispatchStop.attentionStatus.replaceAll("_"," ")}</b></span>}
              </div>
            </div>
            <div className="text-right"><div className="text-sm font-extrabold">{money(order.totalAmount)}</div><div className={"text-[10px] font-bold "+(due>0?"text-red-600":"text-green-700")}>{due>0?money(due)+" due":"Paid in full"}</div><Link href={"/dashboard/orders/"+order.id} className="mt-2 inline-flex text-xs font-semibold text-[#1a6fd4] hover:underline">Open order →</Link></div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3"><label className="text-[10px] font-bold text-slate-500">Delivery driver</label><AssignDriverSelect orderId={order.id} drivers={drivers} currentDriverId={order.deliveryDriverId}/><Link href={"/dashboard/dispatch?date="+selectedDate} className="text-[10px] font-bold text-[#1a6fd4] hover:underline">Route order & live status →</Link></div>
        </div>;
      })}</div>:<div className="friendly-admin-empty">No orders match this day and filter.</div>}
    </section>:<div className="friendly-admin-info">Choose a date on the calendar to open that day&apos;s delivery and pickup schedule.</div>}
  </div>;
}
