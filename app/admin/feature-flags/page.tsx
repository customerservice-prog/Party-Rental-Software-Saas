"use client";

import { useEffect, useState } from "react";

type Flag={id:string;key:string;label:string;description:string|null;enabledGlobally:boolean;planTiers:string[];organizationIds:string[]};
const empty={key:"",label:"",description:"",enabledGlobally:false,planTiers:[] as string[],organizationIds:""};

export default function FeatureFlagsPage(){
  const[flags,setFlags]=useState<Flag[]>([]);
  const[form,setForm]=useState(empty);
  const[saving,setSaving]=useState(false);
  const[error,setError]=useState("");

  async function load(){
    const r=await fetch("/api/admin/platform-control",{cache:"no-store"});
    const d=await r.json().catch(()=>({}));
    if(r.ok)setFlags(d.flags||[]); else setError(d.error||"Could not load feature flags.");
  }
  useEffect(()=>{load()},[]);

  async function save(){
    setSaving(true);setError("");
    const r=await fetch("/api/admin/platform-control",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
      action:"flag.upsert",
      ...form,
      organizationIds:form.organizationIds.split(",").map(x=>x.trim()).filter(Boolean),
    })});
    const d=await r.json().catch(()=>({}));
    if(!r.ok)setError(d.error||"Could not save feature flag.");else{setForm(empty);await load()}
    setSaving(false);
  }

  function edit(flag:Flag){
    setForm({key:flag.key,label:flag.label,description:flag.description||"",enabledGlobally:flag.enabledGlobally,planTiers:Array.isArray(flag.planTiers)?flag.planTiers:[],organizationIds:Array.isArray(flag.organizationIds)?flag.organizationIds.join(", "):""});
    window.scrollTo({top:0,behavior:"smooth"});
  }

  async function remove(key:string){
    if(!confirm("Delete this feature flag?"))return;
    await fetch("/api/admin/platform-control",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"flag.delete",key})});
    await load();
  }

  function togglePlan(code:string){
    setForm({...form,planTiers:form.planTiers.includes(code)?form.planTiers.filter(x=>x!==code):[...form.planTiers,code]});
  }

  return <div className="space-y-6">
    <section>
      <div className="text-[10px] font-black uppercase tracking-[.2em] text-blue-600">Release Control</div>
      <h1 className="mt-1 text-3xl font-black tracking-[-.035em]">Feature flags</h1>
      <p className="mt-2 text-sm text-slate-500">Control staged rollouts globally, by subscription plan, or for specific tenant organization IDs.</p>
    </section>

    {error&&<div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{error}</div>}

    <section className="grid gap-5 xl:grid-cols-[.8fr_1.2fr]">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-black">{form.key?"Edit feature flag":"New feature flag"}</h2>
        <div className="mt-5 space-y-4">
          <label className="block"><span className="mb-1.5 block text-[10px] font-black uppercase text-slate-500">Key</span><input value={form.key} onChange={e=>setForm({...form,key:e.target.value})} placeholder="advanced.routing" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-mono outline-none focus:border-blue-400"/></label>
          <label className="block"><span className="mb-1.5 block text-[10px] font-black uppercase text-slate-500">Label</span><input value={form.label} onChange={e=>setForm({...form,label:e.target.value})} placeholder="Advanced routing" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400"/></label>
          <label className="block"><span className="mb-1.5 block text-[10px] font-black uppercase text-slate-500">Description</span><textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} className="min-h-[90px] w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-blue-400"/></label>
          <label className="flex items-center gap-3 rounded-xl bg-slate-50 p-3"><input type="checkbox" checked={form.enabledGlobally} onChange={e=>setForm({...form,enabledGlobally:e.target.checked})}/><div><div className="text-xs font-black">Enable globally</div><div className="text-[10px] text-slate-400">Overrides plan and tenant targeting.</div></div></label>
          <div><div className="mb-2 text-[10px] font-black uppercase text-slate-500">Enable for plans</div><div className="grid grid-cols-2 gap-2">{["starter","growth","pro","enterprise"].map(code=><label key={code} className="flex items-center gap-2 rounded-xl border border-slate-200 p-3 text-xs font-bold"><input type="checkbox" checked={form.planTiers.includes(code)} onChange={()=>togglePlan(code)}/><span className="capitalize">{code}</span></label>)}</div></div>
          <label className="block"><span className="mb-1.5 block text-[10px] font-black uppercase text-slate-500">Specific organization IDs</span><input value={form.organizationIds} onChange={e=>setForm({...form,organizationIds:e.target.value})} placeholder="org_id_1, org_id_2" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400"/><span className="mt-1 block text-[10px] text-slate-400">Comma-separated tenant IDs for beta access.</span></label>
          <div className="flex gap-2"><button disabled={saving||!form.key||!form.label} onClick={save} className="flex-1 rounded-xl bg-blue-600 px-4 py-3 text-xs font-black text-white disabled:opacity-40">{saving?"Saving…":"Save flag"}</button>{form.key&&<button onClick={()=>setForm(empty)} className="rounded-xl border border-slate-200 px-4 py-3 text-xs font-black text-slate-600">Clear</button>}</div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4"><h2 className="text-sm font-black">Configured flags</h2><p className="mt-0.5 text-[11px] text-slate-400">These values are queryable by server-side product features.</p></div>
        <div className="divide-y divide-slate-100">{flags.length?flags.map(flag=><div key={flag.id} className="p-5">
          <div className="flex items-start justify-between gap-4"><div><div className="flex flex-wrap items-center gap-2"><b className="text-sm">{flag.label}</b><code className="rounded bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">{flag.key}</code>{flag.enabledGlobally&&<span className="rounded bg-emerald-50 px-2 py-0.5 text-[9px] font-black text-emerald-700">GLOBAL</span>}</div>{flag.description&&<p className="mt-2 text-xs leading-5 text-slate-500">{flag.description}</p>}<div className="mt-2 flex flex-wrap gap-1">{Array.isArray(flag.planTiers)&&flag.planTiers.map(code=><span key={code} className="rounded bg-blue-50 px-2 py-1 text-[9px] font-black uppercase text-blue-700">{code}</span>)}{Array.isArray(flag.organizationIds)&&flag.organizationIds.length>0&&<span className="rounded bg-violet-50 px-2 py-1 text-[9px] font-black text-violet-700">{flag.organizationIds.length} tenant target{flag.organizationIds.length===1?"":"s"}</span>}</div></div><div className="flex gap-2"><button onClick={()=>edit(flag)} className="text-[10px] font-black text-blue-600">Edit</button><button onClick={()=>remove(flag.key)} className="text-[10px] font-black text-rose-600">Delete</button></div></div>
        </div>):<div className="p-12 text-center text-sm text-slate-400">No feature flags configured yet.</div>}</div>
      </div>
    </section>
  </div>;
}
