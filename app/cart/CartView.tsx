"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getStorefrontCart, removeStorefrontCartLine, subscribeStorefrontCart, updateStorefrontCartQuantity, type StorefrontCartLine } from "@/lib/storefrontCart";

export default function CartView({ organizationId, accent }: { organizationId: string; accent: string }) {
  const [lines, setLines] = useState<StorefrontCartLine[]>([]);
  useEffect(() => {
    const sync = () => setLines(getStorefrontCart(organizationId));
    sync();
    return subscribeStorefrontCart(sync);
  }, [organizationId]);

  const estimatedSubtotal = useMemo(() => lines.reduce((sum, line) => sum + (Number(line.price) || 0) * line.quantity, 0), [lines]);

  if (!lines.length) return <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm"><div className="text-4xl">🛒</div><h2 className="mt-4 text-xl font-black">Your cart is empty</h2><p className="mx-auto mt-2 max-w-lg text-sm text-slate-500">Browse rentals and add everything needed for the event before checking out.</p><Link href="/book" className="mt-5 inline-flex rounded-xl px-5 py-3 text-sm font-black text-white" style={{ backgroundColor: accent }}>Browse rentals</Link></div>;

  return <div className="grid gap-6 lg:grid-cols-[1fr_320px] lg:items-start">
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-4"><h2 className="font-black">Items</h2><p className="text-xs text-slate-500">Final price and date availability are rechecked at checkout.</p></div>
      <div className="divide-y divide-slate-100">{lines.map(line => <div key={line.itemId} className="flex gap-4 p-4 sm:p-5">{line.picture ? <img src={line.picture} alt="" className="h-20 w-20 rounded-xl object-cover"/> : <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-slate-100 text-xs text-slate-400">No photo</div>}<div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><div><h3 className="font-black text-slate-900">{line.name || "Rental item"}</h3>{typeof line.price === "number" && <p className="mt-1 text-sm font-bold" style={{ color: accent }}>${line.price.toFixed(2)} each</p>}</div><button onClick={() => removeStorefrontCartLine(organizationId, line.itemId)} className="text-xs font-bold text-slate-400 hover:text-rose-600">Remove</button></div><div className="mt-3 flex items-center gap-2"><span className="text-xs font-bold text-slate-500">Quantity</span><button onClick={() => updateStorefrontCartQuantity(organizationId, line.itemId, Math.max(1, line.quantity - 1))} className="h-8 w-8 rounded-lg border border-slate-200 font-black">−</button><input value={line.quantity} onChange={e => updateStorefrontCartQuantity(organizationId, line.itemId, Number(e.target.value) || 1)} type="number" min={1} max={10000} className="h-8 w-20 rounded-lg border border-slate-200 text-center text-sm font-black"/><button onClick={() => updateStorefrontCartQuantity(organizationId, line.itemId, line.quantity + 1)} className="h-8 w-8 rounded-lg border border-slate-200 font-black">+</button></div></div></div>)}</div>
    </section>
    <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-24"><h2 className="font-black">Reservation summary</h2><div className="mt-4 flex justify-between text-sm"><span className="text-slate-500">Rental items</span><span className="font-bold">{lines.reduce((s,l)=>s+l.quantity,0)}</span></div><div className="mt-2 flex justify-between text-sm"><span className="text-slate-500">Estimated item subtotal</span><span className="font-black">${estimatedSubtotal.toFixed(2)}</span></div><p className="mt-3 text-[11px] leading-5 text-slate-400">Delivery, add-ons, discounts, taxes, deposit requirements and live availability are calculated during checkout.</p><Link href="/checkout?cart=1" className="mt-5 flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-black text-white" style={{ backgroundColor: accent }}>Choose dates & checkout</Link><Link href="/book" className="mt-2 flex w-full items-center justify-center rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700">Continue shopping</Link></aside>
  </div>;
}
