"use client";
import { useEffect, useState } from "react";

type ExceptionRow={id:string;itemId:string;orderId:string|null;type:string;quantity:number;notes:string|null;itemName:string;orderNumber:string|null;customerName:string|null;updatedAt:string};

export default function QuantityExceptions(){
  const[rows,setRows]=useState<ExceptionRow[]>([]),[loading,setLoading]=useState(true),[busy,setBusy]=useState<string|null>(null),[message,setMessage]=useState("");
  async function load(){setLoading(true);const r=await fetch("/api/inventory-quantity-exceptions?status=open",{cache:"no-store"});const d=await r.json().catch(()=>({}));if(r.ok)setRows(d.exceptions||[]);setLoading(false)}
  useEffect(()=>{load()},[]);
  async function resolve(row:ExceptionRow){
    const raw=prompt(`How many ${row.itemName} units are now back in service?`,String(row.quantity));
    if(raw===null)return;const qty=Math.floor(Number(raw));if(!Number.isInteger(qty)||qty<1||qty>row.quantity){alert(`Enter a whole number from 1 to ${row.quantity}.`);return}
    setBusy(row.id);setMessage("");
    const r=await fetch("/api/inventory-quantity-exceptions",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:row.id,resolveQuantity:qty})});
    const d=await r.json().catch(()=>({}));
    if(r.ok){setMessage(`${qty} ${row.itemName} unit${qty===1?"":"s"} restored to availability.`);await load()}else alert(d.error||"Could not resolve exception.");
    setBusy(null);
  }
  if(loading)return <div className="rounded-xl bg-white p-5 text-xs text-slate-400">Loading quantity exceptions…</div>;
  return <div>
    {message&&<div className="mb-3 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">{message}</div>}
    {!rows.length?<div className="rounded-xl bg-emerald-50 p-4 text-xs font-bold text-emerald-700">✓ No quantity-level damage or missing holds</div>:<div className="space-y-2">{rows.map(row=><div key={row.id} className="rounded-xl border border-slate-200 bg-white p-3"><div className="flex items-start justify-between gap-3"><div><b className="text-xs">{row.quantity}× {row.itemName}</b><p className="mt-1 text-[10px] text-slate-500"><span className={row.type==="missing"?"font-black text-rose-600":"font-black text-amber-700"}>{row.type.toUpperCase()}</span>{row.orderNumber?` · Order #${row.orderNumber}`:""}{row.customerName?` · ${row.customerName}`:""}</p>{row.notes&&<p className="mt-1 text-[10px] text-slate-500">{row.notes}</p>}</div><button disabled={busy===row.id} onClick={()=>resolve(row)} className="shrink-0 rounded-lg bg-emerald-700 px-3 py-2 text-[10px] font-black text-white disabled:opacity-50">{busy===row.id?"Saving…":"Resolve / repair"}</button></div></div>)}</div>}
  </div>;
}