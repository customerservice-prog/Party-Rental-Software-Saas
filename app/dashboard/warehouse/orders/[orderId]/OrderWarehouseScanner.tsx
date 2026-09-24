"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Resource={id:string;itemId:string;expectedQty:number;loadedQty:number;returnedQty:number;damagedQty:number;missingQty:number;notes:string|null;item:{id:string;name:string;quantity:number;status:string;picture:string|null}|null};
type Asset={id:string;itemUnitId:string;itemId:string;identifier:string;itemName:string;status:string;loadedAt:string|null;returnedAt:string|null;notes:string|null;updatedAt:string};
type State={order:{id:string;orderNumber:string;eventDate:string;deliveryType:string;customer:{firstName:string;lastName:string}};fulfillment:{id:string;status:string}|null;resources:Resource[];assets:Asset[]};
const ACTIONS=[
  {value:"loaded",label:"Load / Out",help:"Equipment leaving the warehouse"},
  {value:"returned",label:"Returned OK",help:"Back and ready to rent"},
  {value:"damaged",label:"Damaged",help:"Quarantine for inspection / repair"},
  {value:"missing",label:"Missing",help:"Expected back but not returned"},
] as const;

export default function OrderWarehouseScanner({orderId,orderNumber}:{orderId:string;orderNumber:string}){
  const[state,setState]=useState<State|null>(null),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(""),[message,setMessage]=useState("");
  const[action,setAction]=useState<(typeof ACTIONS)[number]["value"]>("loaded"),[identifier,setIdentifier]=useState(""),[notes,setNotes]=useState("");
  const inputRef=useRef<HTMLInputElement>(null);

  const load=useCallback(async()=>{
    setLoading(true);setError("");
    try{
      const r=await fetch(`/api/fulfillment/scan?orderId=${encodeURIComponent(orderId)}`,{cache:"no-store"});
      const d=await r.json();
      if(!r.ok)throw new Error(d.error||"Could not load warehouse fulfillment.");
      setState(d);
      if(!d.fulfillment){
        const init=await fetch("/api/fulfillment/scan",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({orderId,action:"initialize"})});
        const id=await init.json();
        if(!init.ok)throw new Error(id.error||"Could not initialize fulfillment.");
        setState(id);
      }
    }catch(e){setError(e instanceof Error?e.message:"Could not load warehouse fulfillment.")}
    finally{setLoading(false);setTimeout(()=>inputRef.current?.focus(),50)}
  },[orderId]);

  useEffect(()=>{load()},[load]);

  const totals=useMemo(()=>state?.resources.reduce((a,r)=>({
    expected:a.expected+r.expectedQty,
    loaded:a.loaded+r.loadedQty,
    returned:a.returned+r.returnedQty,
    damaged:a.damaged+r.damagedQty,
    missing:a.missing+r.missingQty,
  }),{expected:0,loaded:0,returned:0,damaged:0,missing:0})||{expected:0,loaded:0,returned:0,damaged:0,missing:0},[state]);
  const reconciled=totals.returned+totals.damaged+totals.missing;

  async function scan(){
    const tag=identifier.trim();
    if(!tag||busy)return;
    setBusy(true);setError("");setMessage("");
    try{
      const r=await fetch("/api/fulfillment/scan",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({orderId,action:"scan",scanAction:action,identifier:tag,notes})});
      const d=await r.json();
      if(!r.ok)throw new Error(d.error||"Could not process asset.");
      setState(d);
      setMessage(`${tag} → ${ACTIONS.find(a=>a.value===action)?.label||action}`);
      setIdentifier("");setNotes("");
    }catch(e){setError(e instanceof Error?e.message:"Could not process asset.")}
    finally{setBusy(false);setTimeout(()=>inputRef.current?.focus(),40)}
  }

  if(loading)return <div className="friendly-admin-card p-8 text-sm text-slate-400">Preparing order scanner…</div>;
  if(error&&!state)return <div className="friendly-admin-card !border-rose-200 !bg-rose-50 p-6 text-sm font-bold text-rose-700">{error}</div>;
  if(!state)return null;

  return <div className="space-y-5">
    <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      {[
        ["Expected",totals.expected,"bg-slate-100 text-slate-700"],
        ["Loaded / Out",totals.loaded,"bg-blue-50 text-blue-700"],
        ["Returned OK",totals.returned,"bg-emerald-50 text-emerald-700"],
        ["Damaged",totals.damaged,"bg-amber-50 text-amber-700"],
        ["Missing",totals.missing,"bg-rose-50 text-rose-700"],
      ].map(([label,value,cls])=><div key={String(label)} className="friendly-admin-kpi"><div className={`inline-flex rounded-lg px-2 py-1 text-[9px] font-black uppercase ${cls}`}>{label}</div><div className="mt-2 text-3xl font-black">{value}</div></div>)}
    </section>

    <section className="grid gap-5 xl:grid-cols-[.7fr_1.3fr]">
      <div className="space-y-4">
        <div className="friendly-admin-card !mb-0">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-[#1a6fd4]">Order #{orderNumber}</div>
          <h2 className="mt-1 text-lg font-bold">Scan serialized equipment</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">Choose what is happening, then scan the asset tag. Packages are expanded into their physical components automatically.</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {ACTIONS.map(a=><button key={a.value} onClick={()=>{setAction(a.value);setTimeout(()=>inputRef.current?.focus(),20)}} className={`rounded-lg border p-3 text-left transition ${action===a.value?"border-[#2d6a2d] bg-[#2d6a2d] text-white":"border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}><b className="block text-xs">{a.label}</b><span className={`mt-1 block text-[10px] ${action===a.value?"text-blue-100":"text-slate-400"}`}>{a.help}</span></button>)}
          </div>
          <label className="mt-4 block text-[10px] font-black uppercase tracking-wide text-slate-500">Asset tag / barcode</label>
          <input ref={inputRef} autoFocus value={identifier} onChange={e=>setIdentifier(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();scan()}}} placeholder="Scan tag and press Enter…" className="friendly-admin-field mt-2 w-full !px-4 !py-3 !text-base !font-bold"/>
          <input value={notes} onChange={e=>setNotes(e.target.value)} placeholder={action==="damaged"||action==="missing"?"Condition / exception note…":"Optional scan note…"} className="friendly-admin-field mt-2 w-full"/>
          <button disabled={busy||!identifier.trim()} onClick={scan} className="friendly-admin-primary mt-3 w-full disabled:opacity-40">{busy?"Saving scan…":`${ACTIONS.find(a=>a.value===action)?.label} scanned asset`}</button>
          {message&&<div className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">{message}</div>}
          {error&&<div className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">{error}</div>}
        </div>

        <div className="friendly-admin-card !mb-0">
          <h3 className="font-black">Order reconciliation</h3>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-emerald-500 transition-all" style={{width:`${totals.expected?Math.min(100,(reconciled/totals.expected)*100):0}%`}}/></div>
          <div className="mt-2 flex justify-between text-xs text-slate-500"><span>{reconciled} reconciled</span><span>{Math.max(0,totals.expected-reconciled)} still expected back</span></div>
          <p className="mt-3 text-[11px] leading-5 text-slate-500">Only serialized units need scanning here. Quantity-only equipment can still be reconciled from the order fulfillment screen.</p>
        </div>
      </div>

      <div className="space-y-4">
        <section className="friendly-admin-card !mb-0 !p-0 overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-4"><h2 className="font-black">Physical load plan</h2><p className="text-xs text-slate-500">Actual equipment required after package expansion.</p></div>
          <div className="divide-y divide-slate-100">
            {state.resources.map(r=>{const terminal=r.returnedQty+r.damagedQty+r.missingQty;return <div key={r.itemId} className="p-4"><div className="flex items-start justify-between gap-4"><div className="flex min-w-0 gap-3">{r.item?.picture?<img src={r.item.picture} alt="" className="h-12 w-12 rounded-lg object-cover"/>:<div className="h-12 w-12 rounded-lg bg-slate-100"/>}<div className="min-w-0"><b className="block truncate text-sm">{r.item?.name||"Inventory item"}</b><p className="text-[10px] uppercase text-slate-400">{r.item?.status?.replaceAll("_"," ")||"unknown status"}</p></div></div><div className="text-right"><b className="text-lg">{r.expectedQty}</b><p className="text-[9px] font-black uppercase text-slate-400">Expected</p></div></div><div className="mt-3 grid grid-cols-4 gap-2 text-center">{[["Out",r.loadedQty,"text-blue-700"],["OK",r.returnedQty,"text-emerald-700"],["Damaged",r.damagedQty,"text-amber-700"],["Missing",r.missingQty,"text-rose-700"]].map(([a,b,c])=><div key={String(a)} className="rounded-lg bg-slate-50 px-2 py-2"><b className={`block text-sm ${c}`}>{b}</b><span className="text-[9px] text-slate-400">{a}</span></div>)}</div>{terminal>r.expectedQty&&<p className="mt-2 text-xs font-bold text-rose-600">Reconciliation exceeds expected quantity — review this item.</p>}</div>})}
          </div>
        </section>

        <section className="friendly-admin-card !mb-0 !p-0 overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><h2 className="font-black">Scanned assets</h2><p className="text-xs text-slate-500">Order-specific serialized asset history</p></div><span className="text-xs font-black text-slate-400">{state.assets.length}</span></div>
          {state.assets.length?<div className="max-h-[500px] divide-y divide-slate-100 overflow-auto">{state.assets.map(a=><div key={a.id} className="px-5 py-4"><div className="flex items-start justify-between gap-3"><div><b className="text-sm">{a.identifier}</b><p className="text-xs text-slate-500">{a.itemName}</p>{a.notes&&<p className="mt-1 text-[10px] text-slate-500">{a.notes}</p>}</div><span className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase ${a.status==="returned"?"bg-emerald-50 text-emerald-700":a.status==="damaged"?"bg-amber-50 text-amber-700":a.status==="missing"?"bg-rose-50 text-rose-700":"bg-blue-50 text-blue-700"}`}>{a.status.replaceAll("_"," ")}</span></div></div>)}</div>:<div className="p-8 text-center text-sm text-slate-400">No serialized assets scanned for this order yet.</div>}
        </section>
      </div>
    </section>
  </div>;
}
