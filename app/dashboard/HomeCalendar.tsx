"use client";

import Link from "next/link";
import {useMemo,useState} from "react";
import {useRouter} from "next/navigation";

type CalendarItem={id:string;name:string;quantity:number;price:number};
type CalendarOrder={
  id:string;
  orderNumber:string;
  status:string;
  deliveryType:string;
  eventDate:string;
  eventEndDate:string|null;
  totalAmount:number;
  amountPaid:number;
  deliveryAddress:string|null;
  customerName:string;
  customerEmail:string;
  customerPhone:string|null;
  items:CalendarItem[];
};

const filters=[
  ["active","Active"],
  ["active_delivery","Active · Delivery"],
  ["active_pickup","Active · Pickup"],
  ["incomplete","Incomplete"],
  ["quote","Sent Quotes"],
  ["completed","Completed"],
  ["cancelled","Cancelled"],
  ["all","All Orders"],
] as const;
type Filter=typeof filters[number][0];

const months=["January","February","March","April","May","June","July","August","September","October","November","December"];

function matches(order:CalendarOrder,filter:Filter){
  const status=order.status.toLowerCase();
  if(filter==="all")return true;
  if(filter==="active")return ["confirmed","active"].includes(status);
  if(filter==="active_delivery")return ["confirmed","active"].includes(status)&&order.deliveryType!=="pickup";
  if(filter==="active_pickup")return ["confirmed","active"].includes(status)&&order.deliveryType==="pickup";
  if(filter==="incomplete")return status==="pending"||status==="incomplete";
  if(filter==="quote")return status==="quote";
  if(filter==="completed")return status==="completed";
  return status==="cancelled"||status==="canceled";
}
function money(value:number){return new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(value);}
function statusLabel(status:string){return status==="pending"?"Incomplete":status==="canceled"?"Cancelled":status.replaceAll("_"," ").replace(/\b\w/g,c=>c.toUpperCase());}

export default function HomeCalendar({year,month,orders,todayKey}:{year:number;month:number;orders:CalendarOrder[];todayKey?:string}){
  const router=useRouter();
  const[filter,setFilter]=useState<Filter>("active");
  const[selectedKey,setSelectedKey]=useState<string|null>(null);
  const filtered=useMemo(()=>orders.filter(order=>matches(order,filter)),[orders,filter]);
  const info=useMemo(()=>{
    const map=new Map<string,{delivery:number;pickup:number}>();
    filtered.forEach(order=>{
      const key=order.eventDate.slice(0,10),value=map.get(key)||{delivery:0,pickup:0};
      order.deliveryType==="pickup"?value.pickup++:value.delivery++;
      map.set(key,value);
    });
    return map;
  },[filtered]);
  const dayOrders=useMemo(()=>selectedKey?filtered.filter(order=>order.eventDate.slice(0,10)===selectedKey):[],[filtered,selectedKey]);
  const first=new Date(year,month,1),start=first.getDay(),days=new Date(year,month+1,0).getDate(),count=Math.ceil((start+days)/7)*7;
  const localToday=new Date();
  const today=todayKey||localToday.getFullYear()+"-"+String(localToday.getMonth()+1).padStart(2,"0")+"-"+String(localToday.getDate()).padStart(2,"0");
  const cells=Array.from({length:count},(_,index)=>{
    const day=index-start+1,inMonth=day>=1&&day<=days,key=year+"-"+String(month+1).padStart(2,"0")+"-"+String(day).padStart(2,"0");
    return{day,inMonth,key,isToday:key===today,info:info.get(key)};
  });
  function go(nextYear:number,nextMonth:number){
    if(nextMonth<0){nextMonth=11;nextYear--;}
    if(nextMonth>11){nextMonth=0;nextYear++;}
    router.push("/dashboard?year="+nextYear+"&month="+nextMonth);
  }
  const selectedDate=selectedKey?new Date(selectedKey+"T12:00:00"):null;

  return <div className="bg-white">
    <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-3 py-3 sm:px-4">
      <button onClick={()=>go(year,month-1)} className="flex h-9 w-9 items-center justify-center rounded border border-slate-200 text-xl text-slate-500 hover:bg-slate-50" aria-label="Previous month">‹</button>
      <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
        <select aria-label="Calendar month" value={month} onChange={e=>go(year,+e.target.value)} className="rounded border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-800">{months.map((label,index)=><option key={label} value={index}>{label}</option>)}</select>
        <select aria-label="Calendar year" value={year} onChange={e=>go(+e.target.value,month)} className="rounded border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-800">{Array.from({length:9},(_,index)=>year-4+index).map(value=><option key={value}>{value}</option>)}</select>
      </div>
      <button onClick={()=>go(year,month+1)} className="flex h-9 w-9 items-center justify-center rounded border border-slate-200 text-xl text-slate-500 hover:bg-slate-50" aria-label="Next month">›</button>
    </div>

    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/70 px-3 py-2.5 sm:px-4">
      <select aria-label="Calendar order status" value={filter} onChange={e=>setFilter(e.target.value as Filter)} className="min-w-[190px] rounded border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700">{filters.map(([key,label])=><option key={key} value={key}>{label}</option>)}</select>
      <div className="flex items-center gap-3 text-[11px] font-bold text-slate-500">
        <span>{filtered.length} order{filtered.length===1?"":"s"}</span>
        <span className="flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-full bg-emerald-500"/>Delivery</span>
        <span className="flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-full bg-rose-500"/>Pickup</span>
      </div>
    </div>

    <div className="grid grid-cols-7 border-b border-slate-200 bg-white text-center text-[10px] font-black uppercase tracking-wide text-slate-400">{["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(day=><div key={day} className="py-2.5">{day}</div>)}</div>
    <div className="grid grid-cols-7">{cells.map(cell=><button type="button" key={cell.key} disabled={!cell.inMonth} onClick={()=>cell.inMonth&&setSelectedKey(cell.key)} aria-label={cell.inMonth?"Open orders for "+cell.key:undefined} className={"relative min-h-[82px] border-b border-r border-slate-100 p-2 text-left transition hover:bg-green-50/50 disabled:cursor-default sm:min-h-[100px] "+(!cell.inMonth?"bg-slate-50/60 ":"")+(cell.isToday?"bg-green-50/70 ring-1 ring-inset ring-green-300":"")}>
      <div className={"flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-black "+(cell.isToday?"bg-green-700 text-white":cell.inMonth?"text-slate-700":"text-slate-300")}>{cell.inMonth?cell.day:""}</div>
      {cell.inMonth&&cell.info&&<div className="mt-2 space-y-1">
        {cell.info.delivery>0&&<div className="flex w-fit items-center gap-1 rounded bg-emerald-50 px-1.5 py-1 text-[9px] font-black text-emerald-700"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500"/>{cell.info.delivery}<span className="hidden sm:inline"> {cell.info.delivery===1?"delivery":"deliveries"}</span></div>}
        {cell.info.pickup>0&&<div className="flex w-fit items-center gap-1 rounded bg-rose-50 px-1.5 py-1 text-[9px] font-black text-rose-700"><span className="h-1.5 w-1.5 rounded-full bg-rose-500"/>{cell.info.pickup}<span className="hidden sm:inline"> pickup{cell.info.pickup===1?"":"s"}</span></div>}
      </div>}
    </button>)}</div>

    {selectedKey&&<div className="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto bg-black/50 p-4" onClick={()=>setSelectedKey(null)}>
      <div className="my-8 w-full max-w-5xl overflow-hidden rounded-lg bg-slate-50 shadow-2xl" onClick={event=>event.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
          <div><h2 className="text-lg font-bold text-slate-900">Orders for {selectedDate?.toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"})}</h2><p className="mt-1 text-xs text-slate-500">{dayOrders.length} matching {dayOrders.length===1?"order":"orders"} · {filters.find(([key])=>key===filter)?.[1]}</p></div>
          <button onClick={()=>setSelectedKey(null)} className="px-2 text-2xl font-bold text-slate-400 hover:text-slate-700" aria-label="Close day orders">×</button>
        </div>
        <div className="p-4">
          {!dayOrders.length?<div className="rounded border border-slate-200 bg-white p-8 text-center text-sm text-slate-400">No orders match this date and filter.</div>:<div className="grid gap-4 lg:grid-cols-2">{dayOrders.map(order=>{
            const due=Math.max(0,order.totalAmount-order.amountPaid),paid=due<=0.01;
            return <article key={order.id} className={"overflow-hidden rounded-lg border-2 border-l-[6px] bg-white shadow-sm "+(order.deliveryType==="pickup"?"border-rose-300":"border-emerald-400")}>
              <div className={"flex items-center justify-between gap-3 px-4 py-2 "+(order.deliveryType==="pickup"?"bg-rose-50 text-rose-900":"bg-emerald-50 text-emerald-900")}>
                <Link href={"/dashboard/orders/"+order.id} className="font-bold hover:underline">Order #{order.orderNumber}</Link>
                <span className="rounded bg-white/70 px-2 py-1 text-[10px] font-bold uppercase">{order.deliveryType==="pickup"?"Customer Pickup":"Delivery"}</span>
              </div>
              <div className="p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div><Link href={"/dashboard/orders/"+order.id} className="font-semibold text-[#1a6fd4] hover:underline">{order.customerName}</Link><div className="mt-1 text-[10px] font-bold uppercase text-slate-400">{statusLabel(order.status)}</div></div>
                  <span className={"rounded px-2 py-1 text-xs font-bold "+(paid?"bg-green-100 text-green-700":"bg-amber-100 text-amber-800")}>{paid?"Paid in full":"Paid "+money(order.amountPaid)+" / "+money(order.totalAmount)}</span>
                </div>
                {order.items.length>0&&<ul className="mb-3 space-y-1 text-sm text-slate-700">{order.items.slice(0,6).map(item=><li key={item.id}>{item.name} × {item.quantity}{item.price>0&&<span className="text-slate-400"> · {money(item.price*item.quantity)}</span>}</li>)}{order.items.length>6&&<li className="text-xs text-slate-400">+ {order.items.length-6} more line items</li>}</ul>}
                <div className="space-y-1 text-xs text-slate-500">
                  {order.deliveryAddress&&<div>{order.deliveryAddress}</div>}
                  {order.customerPhone&&<div><a href={"tel:"+order.customerPhone} className="hover:underline">{order.customerPhone}</a></div>}
                  {order.customerEmail&&<div><a href={"mailto:"+order.customerEmail} className="hover:underline">{order.customerEmail}</a></div>}
                </div>
                {due>0.01&&<p className="mt-3 text-sm font-bold text-red-600">Due: {money(due)}</p>}
                <div className="mt-4 flex flex-wrap gap-2"><Link href={"/dashboard/orders/"+order.id} className="friendly-admin-primary">Open Order</Link><Link href={"/dashboard/orders/"+order.id+"/fulfillment"} className="friendly-admin-secondary">Fulfillment</Link></div>
              </div>
            </article>;
          })}</div>}
          <div className="pt-4"><Link href={"/dashboard/scheduling?year="+year+"&month="+month+"&date="+selectedKey} className="text-sm font-semibold text-[#1a6fd4] hover:underline">Open full Scheduling page →</Link></div>
        </div>
      </div>
    </div>}
  </div>;
}
