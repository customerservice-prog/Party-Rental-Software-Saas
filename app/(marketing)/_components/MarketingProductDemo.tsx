"use client";

import { useEffect, useState } from "react";

const activity = [
  ["New booking", "Order #1048 · Johnson Wedding", "+$1,284"],
  ["Payment received", "Order #1039 · Balance paid", "+$642"],
  ["Delivery ready", "3 stops prepared for Friday", "Ready"],
  ["Inventory updated", "20×40 Frame Tent reserved", "Synced"],
];

export default function MarketingProductDemo() {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setActive((v) => (v + 1) % activity.length), 2600);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="overflow-hidden rounded-[26px] border border-slate-200 bg-white text-left shadow-[0_45px_110px_-45px_rgba(15,23,42,.55)]">
      <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:px-5">
        <div className="flex gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-slate-300"/><span className="h-2.5 w-2.5 rounded-full bg-slate-300"/><span className="h-2.5 w-2.5 rounded-full bg-slate-300"/></div>
        <div className="mx-auto rounded-lg bg-slate-100 px-4 py-1.5 text-[10px] font-bold text-slate-500">Party Rental CRM · Live product preview</div>
        <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600"><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500"/>LIVE</span>
      </div>
      <div className="grid min-h-[480px] grid-cols-1 bg-[#f6f8fc] md:grid-cols-[190px_1fr]">
        <aside className="hidden border-r border-slate-200 bg-[#0b1220] p-4 text-white md:block">
          <div className="mb-7 flex items-center gap-2 px-2"><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-xs font-black">PR</div><div><div className="text-xs font-black">PartyRentalCRM</div><div className="text-[9px] text-slate-400">Operations</div></div></div>
          {['Dashboard','Orders','Calendar','Inventory','Customers','Deliveries','Payments','Website'].map((x,i)=><div key={x} className={`mb-1 rounded-lg px-3 py-2.5 text-xs font-semibold ${i===0?'bg-blue-600 text-white':'text-slate-400'}`}>{x}</div>)}
        </aside>
        <div className="p-4 sm:p-6">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><div className="text-[11px] font-black uppercase tracking-[.15em] text-blue-600">Operations command center</div><h3 className="mt-1 text-xl font-black tracking-tight text-slate-950 sm:text-2xl">Good morning. Here’s what needs attention.</h3></div><button className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm">+ New order</button></div>
          <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[['Today’s events','8','2 deliveries'],['Open balance','$4,286','5 orders'],['Upcoming','17','next 7 days'],['Tasks','4','1 overdue']].map(([a,b,c],i)=><div key={a} className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm"><div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{a}</div><div className="mt-1 text-xl font-black text-slate-950">{b}</div><div className={`mt-1 text-[10px] font-semibold ${i===3?'text-amber-600':'text-slate-500'}`}>{c}</div></div>)}
          </div>
          <div className="mt-3 grid gap-3 lg:grid-cols-[1.35fr_.65fr]">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><div><div className="text-xs font-black text-slate-900">Upcoming fulfillment</div><div className="text-[10px] text-slate-400">Orders requiring action</div></div><span className="rounded-full bg-blue-50 px-2 py-1 text-[9px] font-bold text-blue-600">NEXT 7 DAYS</span></div><div className="mt-3 space-y-2">{[['#1048','Johnson Wedding','Fri · 9:00 AM','$1,284'],['#1049','Syracuse University','Fri · 1:00 PM','$860'],['#1052','Martinez Graduation','Sat · 8:00 AM','$1,540']].map((r,i)=><div key={r[0]} className="grid grid-cols-[48px_1fr_auto] items-center gap-2 rounded-lg border border-slate-100 p-2.5 text-[10px]"><span className="font-black text-blue-600">{r[0]}</span><div><div className="font-bold text-slate-800">{r[1]}</div><div className="text-slate-400">{r[2]}</div></div><div className="text-right"><div className="font-black text-slate-800">{r[3]}</div><div className={`mt-0.5 ${i===0?'text-emerald-600':'text-amber-600'}`}>{i===0?'Ready':'Prep'}</div></div></div>)}</div></div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="text-xs font-black text-slate-900">Live activity</div><div className="mt-3 space-y-2">{activity.map((row,i)=><div key={row[0]} className={`rounded-lg border p-2.5 transition-all duration-500 ${active===i?'scale-[1.02] border-blue-200 bg-blue-50 shadow-sm':'border-transparent bg-slate-50'}`}><div className="flex justify-between gap-2"><span className="text-[10px] font-bold text-slate-800">{row[0]}</span><span className="text-[9px] font-black text-blue-600">{row[2]}</span></div><div className="mt-1 text-[9px] text-slate-400">{row[1]}</div></div>)}</div></div>
          </div>
        </div>
      </div>
    </div>
  );
}