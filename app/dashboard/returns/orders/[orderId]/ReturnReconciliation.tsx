"use client";
import { useCallback, useEffect, useMemo, useState } from "react";

type Resource={id:string;itemId:string;expectedQty:number;loadedQty:number;returnedQty:number;damagedQty:number;missingQty:number;notes:string|null;item:{id:string;name:string;picture:string|null;status:string}|null};
type Asset={id:string;itemId:string;status:string;loadedAt:string|null;identifier:string;itemName:string};
type State={fulfillment:{id:string;status:string}|null;resources:Resource[];assets:Asset[]};
type Draft={loadedQty:number;returnedQty:number;damagedQty:number;missingQty:number;notes:string};

export default function ReturnReconciliation({orderId,orderNumber}:{orderId:string;orderNumber:string}){
  const[state,setState]=useState<State|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(""),[notice,setNotice]=useState(""),[saving,setSaving]=useState<string|null>(null),[drafts,setDrafts]=useState<Record<string,Draft>>({});
  const load=useCallback(async()=>{
    setLoading(true);setError("");
    try{
      let r=await fetch(`/api/fulfillment/scan?orderId=${encodeURIComponent(orderId)}`,{cache:"no-store"});
      let d=await r.json();
      if(!r.ok)throw new Error(d.error||"Could not load this return.");
      if(!d.fulfillment){
        r=await fetch("/api/fulfillment/scan",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({orderId,action:"initialize"})});
        d=await r.json();
        if(!r.ok)throw new Error(d.error||"Could not initialize return reconciliation.");
      }
      setState(d);
      const next:Record<string,Draft>={};
      for(const row of d.resources||[])next[row.itemId]={loadedQty:row.loadedQty,returnedQty:row.returnedQty,damagedQty:row.damagedQty,missingQty:row.missingQty,notes:row.notes||""};
      setDrafts(next);
    }catch(e){setError(e instanceof Error?e.message:"Could not load return reconciliation.")}
    finally{setLoading(false)}
  },[orderId]);
  useEffect(()=>{load()},[load]);

  const scannedMinimum=useMemo(()=>{
    const map=new Map<string,{loaded:number;returned:number;damaged:number;missing:number}>();
    for(const a of state?.assets||[]){
      const m=map.get(a.itemId)||{loaded:0,returned:0,damaged:0,missing:0};
      if(a.loadedAt)m.loaded++;
      if(a.status==="returned")m.returned++;
      if(a.status==="damaged")m.damaged++;
      if(a.status==="missing")m.missing++;
      map.set(a.itemId,m);
    }
    return map;
  },[state]);

  const totals=useMemo(()=>state?.resources.reduce((a,r)=>({expected:a.expected+r.expectedQty,returned:a.returned+r.returnedQty,damaged:a.damaged+r.damagedQty,missing:a.missing+r.missingQty}),{expected:0,returned:0,damaged:0,missing:0})||{expected:0,returned:0,damaged:0,missing:0},[state]);
  const reconciled=totals.returned+totals.damaged+totals.missing;

  function setField(itemId:string,key:keyof Draft,value:number|string){setDrafts(prev=>({...prev,[itemId]:{...prev[itemId],[key]:value}}))}

  async function save(row:Resource,override?:Partial<Draft>){
    const draft={...(drafts[row.itemId]||{loadedQty:0,returnedQty:0,damagedQty:0,missingQty:0,notes:""}),...(override||{})};
    setSaving(row.itemId);setError("");setNotice("");
    try{
      const r=await fetch("/api/fulfillment/scan",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({orderId,action:"reconcileResource",itemId:row.itemId,...draft})});
      const d=await r.json();
      if(!r.ok)throw new Error(d.error||"Could not save return counts.");
      setState(d);
      const next:Record<string,Draft>={};for(const x of d.resources||[])next[x.itemId]={loadedQty:x.loadedQty,returnedQty:x.returnedQty,damagedQty:x.damagedQty,missingQty:x.missingQty,notes:x.notes||""};setDrafts(next);
      setNotice(`${row.item?.name||"Item"} reconciled.`);
    }catch(e){setError(e instanceof Error?e.message:"Could not save return counts.")}
    finally{setSaving(null)}
  }

  if(loading)return <div className="friendly-admin-card p-8 text-sm text-slate-400">Loading return reconciliation…</div>;
  if(!state)return <div className="friendly-admin-card !border-rose-200 !bg-rose-50 p-6 text-sm font-bold text-rose-700">{error||"Return could not be loaded."}</div>;
  return <div className="space-y-5">
    <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {[["Expected",totals.expected,"text-slate-700"],["Returned OK",totals.returned,"text-emerald-700"],["Damaged",totals.damaged,"text-amber-700"],["Missing",totals.missing,"text-rose-700"]].map(([label,value,cls])=><div key={String(label)} className="friendly-admin-kpi"><div className="text-[9px] font-black uppercase text-slate-400">{label}</div><div className={`mt-1 text-3xl font-black ${cls}`}>{value}</div></div>)}
    </section>
    <section className="friendly-admin-card !mb-0">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-black">Return progress</h2><p className="text-xs text-slate-500">Order #{orderNumber} · serialized scans and manual quantity counts stay synchronized.</p></div><b className={reconciled>=totals.expected&&totals.expected>0?"text-emerald-700":"text-slate-600"}>{reconciled}/{totals.expected}</b></div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-emerald-500" style={{width:`${totals.expected?Math.min(100,reconciled/totals.expected*100):0}%`}}/></div>
      {notice&&<div className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">{notice}</div>}{error&&<div className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">{error}</div>}
    </section>
    <section className="friendly-admin-card !mb-0 !p-0 overflow-hidden">
      <div className="border-b border-slate-100 px-5 py-4"><h2 className="font-black">Physical equipment</h2><p className="text-xs text-slate-500">Packages are already expanded into actual warehouse items. Damaged or missing quantity-only units are held out of future availability until resolved.</p></div>
      <div className="divide-y divide-slate-100">{state.resources.map(row=>{
        const draft=drafts[row.itemId]||{loadedQty:row.loadedQty,returnedQty:row.returnedQty,damagedQty:row.damagedQty,missingQty:row.missingQty,notes:row.notes||""};
        const minimum=scannedMinimum.get(row.itemId)||{loaded:0,returned:0,damaged:0,missing:0};
        const manualPossible=row.expectedQty-(minimum.returned+minimum.damaged+minimum.missing);
        const allOk={returnedQty:Math.max(minimum.returned,manualPossible+minimum.returned),damagedQty:minimum.damaged,missingQty:minimum.missing};
        return <div key={row.itemId} className="p-5">
          <div className="flex items-start justify-between gap-4"><div className="flex min-w-0 gap-3">{row.item?.picture?<img src={row.item.picture} alt="" className="h-12 w-12 rounded-lg object-cover"/>:<div className="h-12 w-12 rounded-lg bg-slate-100"/>}<div><b className="text-sm">{row.item?.name||"Inventory item"}</b><p className="mt-1 text-[10px] text-slate-400">{row.expectedQty} expected{minimum.loaded||minimum.returned||minimum.damaged||minimum.missing?` · serialized scans: ${minimum.loaded} out / ${minimum.returned} OK / ${minimum.damaged} damaged / ${minimum.missing} missing`:" · quantity tracking"}</p></div></div><button disabled={!!saving} onClick={()=>save(row,allOk)} className="shrink-0 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[10px] font-black text-emerald-700">All remaining OK</button></div>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">{[["Loaded / Out","loadedQty",minimum.loaded],["Returned OK","returnedQty",minimum.returned],["Damaged","damagedQty",minimum.damaged],["Missing","missingQty",minimum.missing]].map(([label,key,min])=><label key={String(key)} className="text-[10px] font-black uppercase text-slate-400">{label}<input type="number" min={Number(min)} max={row.expectedQty} value={Number(draft[key as keyof Draft])||0} onChange={e=>setField(row.itemId,key as keyof Draft,Math.max(Number(min),Math.floor(Number(e.target.value)||0)))} className="friendly-admin-field mt-1 w-full !font-bold"/></label>)}</div>
          <textarea value={draft.notes} onChange={e=>setField(row.itemId,"notes",e.target.value)} placeholder="Damage details, missing pieces, repair notes…" className="friendly-admin-field mt-3 min-h-[62px] w-full !p-3 !text-xs"/>
          <div className="mt-3 flex items-center justify-between gap-3"><span className="text-[10px] text-slate-400">Returned + damaged + missing cannot exceed {row.expectedQty}.</span><button disabled={saving===row.itemId} onClick={()=>save(row)} className="friendly-admin-primary !min-h-0 !px-4 !py-2.5 disabled:opacity-50">{saving===row.itemId?"Saving…":"Save counts"}</button></div>
        </div>;
      })}</div>
    </section>
  </div>;
}