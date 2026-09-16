"use client";

import { useEffect, useState } from "react";

type Props = { src: string; alt: string; label: string; mode?: "dashboard" | "orders" | "inventory" };

const scenes = {
  dashboard: [
    { eyebrow: "LIVE OPERATIONS", title: "3 deliveries today", detail: "Route and crew status synced", badge: "On track" },
    { eyebrow: "NEW BOOKING", title: "Order #1048 confirmed", detail: "$1,284.00 · Jun 21", badge: "Paid" },
    { eyebrow: "INVENTORY", title: "Availability updated", detail: "Reservations reflected instantly", badge: "Live" },
  ],
  orders: [
    { eyebrow: "ORDER ACTIVITY", title: "Deposit received", detail: "Order balance updated", badge: "+$642" },
    { eyebrow: "CUSTOMER", title: "Event details saved", detail: "Everything stays on the order", badge: "Synced" },
    { eyebrow: "FULFILLMENT", title: "Ready for delivery", detail: "Crew can see the full job", badge: "Ready" },
  ],
  inventory: [
    { eyebrow: "AVAILABILITY", title: "20×40 Pole Tent", detail: "2 available for selected date", badge: "2 free" },
    { eyebrow: "RESERVATION", title: "60 chairs allocated", detail: "Quantity held for event", badge: "Reserved" },
    { eyebrow: "CONFLICT CHECK", title: "No overbooking found", detail: "Inventory checked automatically", badge: "Clear" },
  ],
};

export default function AnimatedProductWindow({ src, alt, label, mode = "dashboard" }: Props) {
  const [index, setIndex] = useState(0);
  const data = scenes[mode];
  useEffect(() => {
    const timer = window.setInterval(() => setIndex((value) => (value + 1) % data.length), 3200);
    return () => window.clearInterval(timer);
  }, [data.length]);
  const scene = data[index];

  return (
    <div className="group relative">
      <div className="absolute -inset-5 -z-10 rounded-[2.5rem] bg-blue-500/10 blur-3xl transition duration-700 group-hover:bg-blue-500/20" />
      <div className="relative overflow-hidden rounded-[24px] border border-slate-200/90 bg-white shadow-[0_35px_100px_-40px_rgba(15,23,42,.55)] transition duration-500 group-hover:-translate-y-1 group-hover:shadow-[0_45px_110px_-35px_rgba(15,23,42,.6)]">
        <div className="flex h-12 items-center border-b border-slate-200 bg-slate-50/90 px-4">
          <div className="flex gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-slate-300"/><span className="h-2.5 w-2.5 rounded-full bg-slate-300"/><span className="h-2.5 w-2.5 rounded-full bg-slate-300"/></div>
          <div className="mx-auto flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-1.5 text-[10px] font-semibold text-slate-500 shadow-sm"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500"/>{label}</div>
          <div className="w-12" />
        </div>
        <div className="relative overflow-hidden bg-slate-100">
          <img src={src} alt={alt} className="block h-auto w-full transition duration-700 group-hover:scale-[1.012]" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/10 via-transparent to-white/5" />
          <div className="absolute bottom-4 right-4 w-[min(310px,72%)] rounded-2xl border border-white/70 bg-white/95 p-4 shadow-2xl backdrop-blur transition-all duration-500 sm:bottom-6 sm:right-6 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div><p className="text-[9px] font-black tracking-[.18em] text-blue-600 sm:text-[10px]">{scene.eyebrow}</p><p className="mt-1 text-xs font-black text-slate-950 sm:text-sm">{scene.title}</p><p className="mt-1 hidden text-xs text-slate-500 sm:block">{scene.detail}</p></div>
              <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-[9px] font-black text-emerald-700 sm:text-[10px]">{scene.badge}</span>
            </div>
            <div className="mt-3 h-1 overflow-hidden rounded-full bg-slate-100"><div key={index} className="h-full origin-left animate-[grow_3.2s_linear] rounded-full bg-blue-600" style={{ animationName: "productProgress" }} /></div>
          </div>
        </div>
      </div>
      <style jsx>{`@keyframes productProgress { from { transform: scaleX(0); } to { transform: scaleX(1); } }`}</style>
    </div>
  );
}
