"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Item = { id: string; name: string; cost: number; picture: string | null };
type Addon = { id: string; name: string; price: number; isRequired: boolean };
type Bootstrap = {
  item: Item;
  addons: Addon[];
  depositRule: { type: string; amount: number; isActive: boolean } | null;
  checkout: { flatDeliveryFee: number; taxRate: number; contractTerms: string | null; businessName: string; primaryColor: string };
};

const FALLBACK_TERMS = "By signing below, you agree to the rental company's rental terms and accept financial responsibility for the rented equipment during the rental period.";
const inputClass = "mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-[16px] text-slate-950 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100";

function CheckoutForm() {
  const router = useRouter();
  const params = useSearchParams();
  const itemId = params.get("itemId");
  const [data, setData] = useState<Bootstrap | null>(null);
  const [pageError, setPageError] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [eventDate, setEventDate] = useState("");
  const [eventEndDate, setEventEndDate] = useState("");
  const [availability, setAvailability] = useState<{ available: number; ok: boolean } | null>(null);
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<{ code: string; discountType: string; discountAmount: number } | null>(null);
  const [couponError, setCouponError] = useState("");
  const [couponBusy, setCouponBusy] = useState(false);
  const [signatureName, setSignatureName] = useState("");
  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!itemId) { setPageError("Choose a rental before checking out."); return; }
    fetch(`/api/storefront/checkout-data?itemId=${encodeURIComponent(itemId)}`)
      .then(async r => { const body = await r.json(); if (!r.ok) throw new Error(body.error || "Unable to load checkout"); return body; })
      .then((body: Bootstrap) => { setData(body); setSelectedAddons(body.addons.filter(a => a.isRequired).map(a => a.id)); })
      .catch(err => setPageError(err instanceof Error ? err.message : "Unable to load checkout"));
  }, [itemId]);

  useEffect(() => {
    if (!itemId || !eventDate) { setAvailability(null); return; }
    const p = new URLSearchParams({ itemId, start: eventDate, quantity: String(quantity) });
    if (eventEndDate) p.set("end", eventEndDate);
    const timer = setTimeout(() => fetch(`/api/availability?${p}`).then(r => r.ok ? r.json() : null).then(setAvailability).catch(() => setAvailability(null)), 200);
    return () => clearTimeout(timer);
  }, [itemId, eventDate, eventEndDate, quantity]);

  const totals = useMemo(() => {
    if (!data) return { subtotal: 0, addons: 0, discount: 0, tax: 0, total: 0, due: 0, balance: 0 };
    const subtotal = data.item.cost * quantity;
    const addons = data.addons.filter(a => selectedAddons.includes(a.id)).reduce((s, a) => s + a.price, 0);
    const pre = subtotal + addons + data.checkout.flatDeliveryFee;
    const discount = coupon ? coupon.discountType === "fixed" ? Math.min(coupon.discountAmount, pre) : Math.round(pre * coupon.discountAmount) / 100 : 0;
    const taxable = Math.max(0, subtotal + addons - discount);
    const tax = Math.round(taxable * data.checkout.taxRate) / 100;
    const total = Math.max(0, pre - discount + tax);
    const due = data.depositRule?.isActive ? data.depositRule.type === "flat" ? Math.min(data.depositRule.amount, total) : Math.round(total * data.depositRule.amount) / 100 : total;
    return { subtotal, addons, discount, tax, total, due, balance: total - due };
  }, [data, quantity, selectedAddons, coupon]);

  async function applyCoupon() {
    setCouponError("");
    if (!couponInput.trim()) return;
    setCouponBusy(true);
    try {
      const r = await fetch("/api/coupons/validate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: couponInput }) });
      const body = await r.json();
      if (!r.ok) throw new Error(body.error || "Coupon is not valid");
      setCoupon(body);
    } catch (e) { setCoupon(null); setCouponError(e instanceof Error ? e.message : "Coupon is not valid"); }
    finally { setCouponBusy(false); }
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setPageError("");
    if (!eventDate) return setPageError("Select your event date.");
    if (eventEndDate && eventEndDate < eventDate) return setPageError("The end date cannot be before the event date.");
    if (availability && !availability.ok) return setPageError("The requested quantity is not available for those dates.");
    if (!signatureName.trim() || !agree) return setPageError("Please sign and accept the rental agreement to continue.");
    setSubmitting(true);
    const f = new FormData(e.currentTarget);
    try {
      const r = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        itemId, quantity, addonIds: selectedAddons, firstName: f.get("firstName"), lastName: f.get("lastName"), email: f.get("email"), phone: f.get("phone"), eventDate, eventEndDate: eventEndDate || null, deliveryAddress: f.get("deliveryAddress"), signatureName, couponCode: coupon?.code,
      }) });
      const body = await r.json();
      if (!r.ok) throw new Error(body.error || "We couldn't complete your booking.");
      if (body.url) window.location.assign(body.url); else router.push(`/checkout/success${body.orderId ? `?orderId=${body.orderId}` : ""}`);
    } catch (e) { setPageError(e instanceof Error ? e.message : "Something went wrong. Please try again."); setSubmitting(false); }
  }

  if (pageError && !data) return <main className="mx-auto max-w-xl px-5 py-20"><div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800"><h1 className="font-bold">We couldn't open checkout</h1><p className="mt-2 text-sm">{pageError}</p><button onClick={() => router.back()} className="mt-5 font-bold text-red-900 underline">Go back</button></div></main>;
  if (!data) return <main className="mx-auto max-w-xl px-5 py-20 text-center text-slate-500">Loading your booking…</main>;

  const accent = data.checkout.primaryColor || "#2563eb";
  return <main className="min-h-screen bg-slate-50 pb-16">
    <header className="border-b border-slate-200 bg-white"><div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4"><button onClick={() => router.back()} className="text-sm font-semibold text-slate-600 hover:text-slate-950">← Back to rentals</button><div className="text-sm font-bold text-slate-900">{data.checkout.businessName}</div><div className="text-xs font-semibold text-slate-400">Secure checkout</div></div></header>
    <div className="mx-auto max-w-6xl px-5 py-8 sm:py-12">
      <div className="mb-8"><p className="text-sm font-bold" style={{color:accent}}>Complete your reservation</p><h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Your event details</h1><p className="mt-2 text-slate-600">Review your rental, tell us where and when, then continue to payment.</p></div>
      <form onSubmit={submit} className="grid gap-8 lg:grid-cols-[1fr_380px] lg:items-start">
        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="mb-5 flex items-center gap-4">{data.item.picture && <img src={data.item.picture} alt="" className="h-20 w-20 rounded-xl object-cover"/>}<div className="min-w-0 flex-1"><div className="text-xs font-bold uppercase tracking-wider text-slate-400">Your rental</div><h2 className="mt-1 text-xl font-black text-slate-950">{data.item.name}</h2><p className="mt-1 text-sm text-slate-500">${data.item.cost.toFixed(2)} each</p></div><div><label className="text-xs font-bold text-slate-500">Quantity</label><input type="number" min={1} value={quantity} onChange={e=>setQuantity(Math.max(1,Number(e.target.value)||1))} className="mt-1 block w-20 rounded-xl border border-slate-300 px-3 py-2 text-center text-base font-bold"/></div></div>
            <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-semibold text-slate-700">Event date<input type="date" required value={eventDate} onChange={e=>setEventDate(e.target.value)} className={inputClass}/></label><label className="text-sm font-semibold text-slate-700">End date <span className="font-normal text-slate-400">(optional)</span><input type="date" min={eventDate || undefined} value={eventEndDate} onChange={e=>setEventEndDate(e.target.value)} className={inputClass}/></label></div>
            {availability && <div className={`mt-4 rounded-xl px-4 py-3 text-sm font-semibold ${availability.ok ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}>{availability.ok ? `Available for your date${eventEndDate ? "s" : ""}.` : `Only ${availability.available} available for those dates. Reduce the quantity or choose another date.`}</div>}
          </section>

          {data.addons.length > 0 && <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><h2 className="text-lg font-black">Add-ons</h2><p className="mt-1 text-sm text-slate-500">Choose any extras for this rental.</p><div className="mt-4 divide-y divide-slate-100">{data.addons.map(a=><label key={a.id} className="flex cursor-pointer items-center gap-3 py-3"><input type="checkbox" checked={selectedAddons.includes(a.id)} disabled={a.isRequired} onChange={()=>setSelectedAddons(p=>p.includes(a.id)?p.filter(x=>x!==a.id):[...p,a.id])} className="h-4 w-4"/><span className="flex-1 text-sm font-semibold text-slate-800">{a.name}{a.isRequired && <span className="ml-1 font-normal text-slate-400">Required</span>}</span><span className="text-sm font-bold">${a.price.toFixed(2)}</span></label>)}</div></section>}

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><h2 className="text-lg font-black">Contact & delivery</h2><div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="text-sm font-semibold text-slate-700">First name<input name="firstName" autoComplete="given-name" required className={inputClass}/></label><label className="text-sm font-semibold text-slate-700">Last name<input name="lastName" autoComplete="family-name" required className={inputClass}/></label><label className="text-sm font-semibold text-slate-700">Email<input name="email" type="email" autoComplete="email" required className={inputClass}/></label><label className="text-sm font-semibold text-slate-700">Phone<input name="phone" type="tel" autoComplete="tel" className={inputClass}/></label><label className="text-sm font-semibold text-slate-700 sm:col-span-2">Event / delivery address<input name="deliveryAddress" autoComplete="street-address" required placeholder="Street address, city, state, ZIP" className={inputClass}/></label></div></section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><h2 className="text-lg font-black">Rental agreement</h2><div className="mt-3 max-h-40 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs leading-5 text-slate-600 whitespace-pre-wrap">{data.checkout.contractTerms || FALLBACK_TERMS}</div><label className="mt-4 block text-sm font-semibold text-slate-700">Type your full legal name to sign<input value={signatureName} onChange={e=>setSignatureName(e.target.value)} placeholder="Full legal name" className={inputClass}/></label><label className="mt-4 flex items-start gap-3 text-sm leading-6 text-slate-700"><input type="checkbox" checked={agree} onChange={e=>setAgree(e.target.checked)} className="mt-1 h-4 w-4"/><span>I have read and agree to the rental agreement and authorize this typed signature.</span></label></section>
          {pageError && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">{pageError}</div>}
        </div>

        <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-6 sm:p-6"><h2 className="text-lg font-black">Order summary</h2><div className="mt-4 space-y-3 text-sm"><div className="flex justify-between gap-4"><span className="text-slate-600">{data.item.name} × {quantity}</span><span className="font-semibold">${totals.subtotal.toFixed(2)}</span></div>{totals.addons>0&&<div className="flex justify-between"><span className="text-slate-600">Add-ons</span><span>${totals.addons.toFixed(2)}</span></div>}<div className="flex justify-between"><span className="text-slate-600">Delivery</span><span>{data.checkout.flatDeliveryFee ? `$${data.checkout.flatDeliveryFee.toFixed(2)}` : "Included"}</span></div>{totals.discount>0&&<div className="flex justify-between text-emerald-700"><span>Discount</span><span>−${totals.discount.toFixed(2)}</span></div>}{totals.tax>0&&<div className="flex justify-between"><span className="text-slate-600">Tax</span><span>${totals.tax.toFixed(2)}</span></div>}<div className="border-t border-slate-200 pt-3"><div className="flex justify-between text-base font-black"><span>Total</span><span>${totals.total.toFixed(2)}</span></div><div className="mt-3 flex justify-between rounded-xl bg-blue-50 px-3 py-3 font-black text-blue-800"><span>Due today</span><span>${totals.due.toFixed(2)}</span></div>{totals.balance>0&&<div className="mt-2 flex justify-between px-3 text-xs text-slate-500"><span>Remaining balance</span><span>${totals.balance.toFixed(2)}</span></div>}</div></div>
          <div className="mt-5"><div className="flex gap-2"><input value={couponInput} onChange={e=>setCouponInput(e.target.value)} placeholder="Coupon code" className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2.5 text-sm uppercase outline-none focus:border-blue-500"/><button type="button" disabled={couponBusy} onClick={applyCoupon} className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold hover:bg-slate-50">{couponBusy?"…":"Apply"}</button></div>{couponError&&<p className="mt-2 text-xs font-semibold text-red-600">{couponError}</p>}{coupon&&<p className="mt-2 text-xs font-semibold text-emerald-700">{coupon.code} applied</p>}</div>
          <button type="submit" disabled={submitting || Boolean(availability && !availability.ok)} className="mt-6 w-full rounded-xl px-5 py-4 text-base font-black text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-50" style={{backgroundColor:accent}}>{submitting ? "Securing your booking…" : `Continue to payment • $${totals.due.toFixed(2)}`}</button><p className="mt-3 text-center text-xs leading-5 text-slate-400">Availability and totals are verified again before your booking is created.</p>
        </aside>
      </form>
    </div>
  </main>;
}

export default function CheckoutPage(){ return <Suspense fallback={<div className="p-10 text-center">Loading checkout…</div>}><CheckoutForm/></Suspense>; }
