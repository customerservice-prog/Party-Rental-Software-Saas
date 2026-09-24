"use client";
import { useEffect, useMemo, useState } from "react";

type Item={id:string;name:string;quantity:number;cost:number;status:string;picture:string|null};
type Component={id:string;packageItemId:string;componentItemId:string;quantity:number;item:Item|null};

export default function PackageBuilder({items,initialPackageIds}:{items:Item[];initialPackageIds:string[]}) {
  const [packageId,setPackageId]=useState(initialPackageIds[0]||items[0]?.id||"");
  const [componentId,setComponentId]=useState("");
  const [quantity,setQuantity]=useState(1);
  const [components,setComponents]=useState<Component[]>([]);
  const [packageIds,setPackageIds]=useState(new Set(initialPackageIds));
  const [loading,setLoading]=useState(false);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");

  const packageItem=items.find(i=>i.id===packageId);
  const componentOptions=useMemo(()=>items.filter(i=>i.id!==packageId && !packageIds.has(i.id)),[items,packageId,packageIds]);

  async function load(id=packageId){
    if(!id){setComponents([]);return}
    setLoading(true);setMessage("");
    const r=await fetch(`/api/package-components?packageItemId=${encodeURIComponent(id)}`,{cache:"no-store"});
    const d=await r.json().catch(()=>({}));
    if(r.ok){setComponents(d.components||[]);if((d.components||[]).length)setPackageIds(prev=>new Set([...prev,id]));}
    else setMessage(d.error||"Could not load package.");
    setLoading(false);
  }
  useEffect(()=>{load(packageId)},[packageId]);

  async function add(){
    if(!packageId||!componentId||quantity<1)return;
    setBusy(true);setMessage("");
    const r=await fetch("/api/package-components",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({packageItemId:packageId,componentItemId:componentId,quantity})});
    const d=await r.json().catch(()=>({}));
    if(r.ok){setPackageIds(prev=>new Set([...prev,packageId]));setComponentId("");setQuantity(1);setMessage("Package component saved.");await load(packageId);}
    else setMessage(d.error||"Could not save component.");
    setBusy(false);
  }

  async function remove(id:string){
    if(!confirm("Remove this component from the package?"))return;
    setBusy(true);setMessage("");
    const r=await fetch(`/api/package-components?id=${encodeURIComponent(id)}`,{method:"DELETE"});
    const d=await r.json().catch(()=>({}));
    if(r.ok){setMessage("Component removed.");await load(packageId);if(components.length===1)setPackageIds(prev=>{const next=new Set(prev);next.delete(packageId);return next})}
    else setMessage(d.error||"Could not remove component.");
    setBusy(false);
  }

  return <div className="grid gap-5 xl:grid-cols-[.85fr_1.15fr]">
    <section className="friendly-admin-card !mb-0">
      <h2 className="font-bold">Choose the package item</h2>
      <p className="mt-1 text-xs leading-5 text-slate-500">A package is still a normal inventory item with its own storefront price and quantity. Adding components makes its availability consume those physical items too.</p>
      <label className="mt-4 block text-xs font-black uppercase tracking-wide text-slate-500">Package</label>
      <select value={packageId} onChange={e=>setPackageId(e.target.value)} className="friendly-admin-field mt-2 w-full">
        {items.map(item=><option key={item.id} value={item.id}>{item.name}{packageIds.has(item.id)?" · Package":""}</option>)}
      </select>
      {packageItem&&<div className="mt-4 rounded-xl bg-slate-50 p-4">
        <div className="flex items-center gap-3">{packageItem.picture?<img src={packageItem.picture} alt="" className="h-12 w-12 rounded-lg object-cover"/>:<div className="h-12 w-12 rounded-lg bg-slate-200"/>}<div><b className="text-sm">{packageItem.name}</b><p className="text-xs text-slate-500">${packageItem.cost.toFixed(2)} · max {packageItem.quantity}</p></div></div>
      </div>}
      <div className="mt-5 border-t border-slate-100 pt-5">
        <h3 className="text-sm font-black">Add a physical component</h3>
        <select value={componentId} onChange={e=>setComponentId(e.target.value)} className="friendly-admin-field mt-3 w-full">
          <option value="">Select inventory item…</option>
          {componentOptions.map(item=><option key={item.id} value={item.id}>{item.name} · {item.quantity} owned</option>)}
        </select>
        <label className="mt-3 block text-xs font-bold text-slate-500">Quantity used per package</label>
        <input type="number" min={1} max={10000} value={quantity} onChange={e=>setQuantity(Math.max(1,Math.floor(Number(e.target.value)||1)))} className="friendly-admin-field mt-1 w-full"/>
        <button disabled={busy||!componentId} onClick={add} className="friendly-admin-primary mt-3 w-full disabled:opacity-40">{busy?"Saving…":"Add / update component"}</button>
      </div>
      {message&&<div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600">{message}</div>}
    </section>

    <section className="friendly-admin-card !mb-0 !p-0 overflow-hidden">
      <div className="border-b border-slate-100 px-5 py-4">
        <h2 className="font-bold">Package contents</h2>
        <p className="text-xs text-slate-500">{packageItem?packageItem.name:"Select a package"} · one-level bundles only</p>
      </div>
      {loading?<div className="p-8 text-sm text-slate-400">Loading components…</div>:components.length?<div className="divide-y divide-slate-100">{components.map(row=><div key={row.id} className="flex items-center justify-between gap-4 px-5 py-4"><div className="flex min-w-0 items-center gap-3">{row.item?.picture?<img src={row.item.picture} alt="" className="h-11 w-11 rounded-lg object-cover"/>:<div className="h-11 w-11 rounded-lg bg-slate-100"/>}<div className="min-w-0"><b className="block truncate text-sm">{row.item?.name||"Missing item"}</b><p className="text-xs text-slate-500">{row.quantity} used per package · {row.item?.quantity??0} owned · <span className="capitalize">{row.item?.status?.replaceAll("_"," ")}</span></p></div></div><button disabled={busy} onClick={()=>remove(row.id)} className="shrink-0 text-xs font-black text-rose-600">Remove</button></div>)}</div>:<div className="p-10 text-center"><b className="text-sm">No components yet</b><p className="mt-1 text-xs text-slate-400">Add the tents, tables, chairs, games or other physical items consumed by one package booking.</p></div>}
      {components.length>0&&<div className="border-t border-blue-100 bg-blue-50 px-5 py-4 text-xs leading-5 text-[#315d8e]"><b>Availability protection is active.</b> Direct rentals and package bookings now share the same component inventory, so a package cannot sell equipment already committed elsewhere.</div>}
    </section>
  </div>
}
