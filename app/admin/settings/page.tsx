"use client";

import { useEffect, useMemo, useState } from "react";
import { PLANS, TRIAL_DAYS } from "@/lib/plans";

type Setting={key:string;value:unknown};
type PlanOverride={planCode:string;monthlyPrice:number|null;annualMonthlyPrice:number|null;trialDays:number|null;officeUsers:number|null;crewUsers:number|null;locations:number|null;isEnabled:boolean};

export default function PlatformSettingsPage(){
  const[settings,setSettings]=useState<Setting[]>([]);
  const[plans,setPlans]=useState<PlanOverride[]>([]);
  const[supportEmail,setSupportEmail]=useState("");
  const[defaultTrialDays,setDefaultTrialDays]=useState(String(TRIAL_DAYS));
  const[maintenanceMessage,setMaintenanceMessage]=useState("");
  const[maintenanceEnabled,setMaintenanceEnabled]=useState(false);
  const[saving,setSaving]=useState(false);
  const[notice,setNotice]=useState("");
  const[error,setError]=useState("");

  async function load(){
    const r=await fetch("/api/admin/platform-control",{cache:"no-store"});
    const d=await r.json().catch(()=>({}));
    if(!r.ok){setError(d.error||"Could not load platform settings.");return}
    setSettings(d.settings||[]);setPlans(d.plans||[]);
    const map=new Map((d.settings||[]).map((s:Setting)=>[s.key,s.value]));
    setSupportEmail(String(map.get("support_email")||""));
    setDefaultTrialDays(String(map.get("default_trial_days")??TRIAL_DAYS));
    setMaintenanceMessage(String(map.get("maintenance_message")||""));
    setMaintenanceEnabled(Boolean(map.get("maintenance_enabled")||false));
  }
  useEffect(()=>{load()},[]);

  const overrideMap=useMemo(()=>new Map(plans.map(p=>[p.planCode,p])),[plans]);

  async function setSetting(key:string,value:unknown){
    const r=await fetch("/api/admin/platform-control",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"setting.set",key,value})});
    if(!r.ok)throw new Error((await r.json().catch(()=>({}))).error||"Could not save setting.");
  }

  async function savePlatform(){
    setSaving(true);setError("");setNotice("");
    try{
      await setSetting("support_email",supportEmail.trim());
      await setSetting("default_trial_days",Math.max(0,Math.min(365,Number(defaultTrialDays)||0)));
      await setSetting("maintenance_enabled",maintenanceEnabled);
      await setSetting("maintenance_message",maintenanceMessage.trim());
      setNotice("Platform settings saved.");
      await load();
    }catch(e){setError(e instanceof Error?e.message:"Could not save settings.")}
    setSaving(false);
  }

  async function savePlan(code:string,patch:PlanOverride){
    setSaving(true);setError("");setNotice("");
    const r=await fetch("/api/admin/platform-control",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"plan.upsert",...patch,planCode:code})});
    const d=await r.json().catch(()=>({}));
    if(!r.ok)setError(d.error||"Could not save plan override.");else{setNotice(code+" plan override saved.");await load()}
    setSaving(false);
  }

  return <div className="space-y-6">
    <section>
      <div className="text-[10px] font-black uppercase tracking-[.2em] text-blue-600">Platform Configuration</div>
      <h1 className="mt-1 text-3xl font-black tracking-[-.035em]">Settings & plans</h1>
      <p className="mt-2 text-sm text-slate-500">Platform-wide support, maintenance, trial defaults, and commercial plan overrides.</p>
    </section>

    {(notice||error)&&<div className={"rounded-xl border px-4 py-3 text-sm font-bold "+(error?"border-rose-200 bg-rose-50 text-rose-700":"border-emerald-200 bg-emerald-50 text-emerald-700")}>{error||notice}</div>}

    <section className="grid gap-5 xl:grid-cols-[.8fr_1.2fr]">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-black">Platform defaults</h2>
        <div className="mt-5 space-y-4">
          <label className="block"><span className="mb-1.5 block text-[10px] font-black uppercase text-slate-500">Support email</span><input type="email" value={supportEmail} onChange={e=>setSupportEmail(e.target.value)} placeholder="support@partyrentalcrm.com" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400"/></label>
          <label className="block"><span className="mb-1.5 block text-[10px] font-black uppercase text-slate-500">Default trial days</span><input type="number" min={0} max={365} value={defaultTrialDays} onChange={e=>setDefaultTrialDays(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400"/></label>
          <label className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4"><input type="checkbox" checked={maintenanceEnabled} onChange={e=>setMaintenanceEnabled(e.target.checked)}/><div><div className="text-xs font-black text-amber-900">Maintenance notice enabled</div><div className="text-[10px] text-amber-700">Stored centrally for platform maintenance workflows.</div></div></label>
          <label className="block"><span className="mb-1.5 block text-[10px] font-black uppercase text-slate-500">Maintenance message</span><textarea value={maintenanceMessage} onChange={e=>setMaintenanceMessage(e.target.value)} className="min-h-[100px] w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-blue-400"/></label>
          <button disabled={saving} onClick={savePlatform} className="w-full rounded-xl bg-slate-950 px-4 py-3 text-xs font-black text-white disabled:opacity-50">{saving?"Saving…":"Save platform defaults"}</button>
        </div>
      </div>

      <div className="space-y-4">
        {PLANS.map(plan=>{
          const override=overrideMap.get(plan.code);
          const model:PlanOverride=override||{
            planCode:plan.code,monthlyPrice:plan.monthlyPrice,annualMonthlyPrice:plan.annualMonthlyPrice,trialDays:TRIAL_DAYS,
            officeUsers:plan.limits.officeUsers,crewUsers:plan.limits.crewUsers,locations:plan.limits.locations,isEnabled:true,
          };
          return <PlanCard key={plan.code} initial={model} name={plan.name} saving={saving} onSave={v=>savePlan(plan.code,v)}/>;
        })}
      </div>
    </section>
  </div>;
}

function PlanCard({initial,name,saving,onSave}:{initial:PlanOverride;name:string;saving:boolean;onSave:(v:PlanOverride)=>void}){
  const[v,setV]=useState(initial);
  useEffect(()=>setV(initial),[initial]);
  const n=(key:keyof PlanOverride,value:string)=>setV(prev=>({...prev,[key]:value===""?null:Number(value)}));
  return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex items-center justify-between gap-3"><div><div className="text-sm font-black">{name}</div><div className="mt-0.5 text-[10px] font-mono text-slate-400">{v.planCode}</div></div><label className="flex items-center gap-2 text-xs font-bold text-slate-600"><input type="checkbox" checked={v.isEnabled} onChange={e=>setV({...v,isEnabled:e.target.checked})}/>Enabled</label></div>
    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <Field label="Monthly $" value={v.monthlyPrice} onChange={x=>n("monthlyPrice",x)}/>
      <Field label="Annual / mo $" value={v.annualMonthlyPrice} onChange={x=>n("annualMonthlyPrice",x)}/>
      <Field label="Trial days" value={v.trialDays} onChange={x=>n("trialDays",x)}/>
      <Field label="Office users" value={v.officeUsers} onChange={x=>n("officeUsers",x)}/>
      <Field label="Crew users" value={v.crewUsers} onChange={x=>n("crewUsers",x)}/>
      <Field label="Locations" value={v.locations} onChange={x=>n("locations",x)}/>
    </div>
    <div className="mt-4 flex justify-end"><button disabled={saving} onClick={()=>onSave(v)} className="rounded-xl bg-blue-600 px-4 py-2.5 text-[10px] font-black text-white disabled:opacity-50">Save {name}</button></div>
  </div>;
}

function Field({label,value,onChange}:{label:string;value:number|null;onChange:(v:string)=>void}){
  return <label><span className="mb-1.5 block text-[9px] font-black uppercase text-slate-400">{label}</span><input type="number" value={value??""} onChange={e=>onChange(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400"/></label>;
}
