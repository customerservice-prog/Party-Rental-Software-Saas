"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PLANS, TRIAL_DAYS } from "@/lib/plans";

export default function NewTenantPage(){
  const router=useRouter();
  const[businessName,setBusinessName]=useState("");
  const[slug,setSlug]=useState("");
  const[contactEmail,setContactEmail]=useState("");
  const[ownerName,setOwnerName]=useState("");
  const[username,setUsername]=useState("");
  const[password,setPassword]=useState("");
  const[planTier,setPlanTier]=useState("starter");
  const[trialDays,setTrialDays]=useState(TRIAL_DAYS);
  const[busy,setBusy]=useState(false);
  const[error,setError]=useState("");

  function slugify(v:string){return v.toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"")}

  async function submit(e:React.FormEvent){
    e.preventDefault();setBusy(true);setError("");
    const r=await fetch("/api/admin/organizations",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({businessName,slug,contactEmail,ownerName,username,password,planTier,trialDays})});
    const d=await r.json().catch(()=>({}));
    if(!r.ok){setError(d.error||"Could not create tenant.");setBusy(false);return}
    router.push("/admin/organizations/"+d.organizationId);router.refresh();
  }

  return <div className="mx-auto max-w-3xl space-y-6">
    <section>
      <div className="text-[10px] font-black uppercase tracking-[.2em] text-blue-600">Tenant Provisioning</div>
      <h1 className="mt-1 text-3xl font-black tracking-[-.035em]">Create organization</h1>
      <p className="mt-2 text-sm text-slate-500">Provision a rental company, owner login, default roles, trial, and platform subscription in one transaction.</p>
    </section>
    {error&&<div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{error}</div>}
    <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="sm:col-span-2"><span className="mb-1.5 block text-[10px] font-black uppercase text-slate-500">Business name</span><input value={businessName} onChange={e=>{setBusinessName(e.target.value);if(!slug)setSlug(slugify(e.target.value))}} required className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"/></label>
        <label><span className="mb-1.5 block text-[10px] font-black uppercase text-slate-500">Subdomain</span><input value={slug} onChange={e=>setSlug(slugify(e.target.value))} required className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"/><span className="mt-1 block text-[10px] text-slate-400">{slug||"tenant"}.partyrentalcrm.com</span></label>
        <label><span className="mb-1.5 block text-[10px] font-black uppercase text-slate-500">Contact email</span><input type="email" value={contactEmail} onChange={e=>setContactEmail(e.target.value)} required className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"/></label>
        <label><span className="mb-1.5 block text-[10px] font-black uppercase text-slate-500">Owner name</span><input value={ownerName} onChange={e=>setOwnerName(e.target.value)} required className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"/></label>
        <label><span className="mb-1.5 block text-[10px] font-black uppercase text-slate-500">Owner username</span><input value={username} onChange={e=>setUsername(e.target.value)} required className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"/></label>
        <label className="sm:col-span-2"><span className="mb-1.5 block text-[10px] font-black uppercase text-slate-500">Temporary password</span><input type="password" value={password} onChange={e=>setPassword(e.target.value)} required minLength={12} className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"/><span className="mt-1 block text-[10px] text-slate-400">12+ characters. The owner is flagged to change it after first login.</span></label>
        <label><span className="mb-1.5 block text-[10px] font-black uppercase text-slate-500">Plan</span><select value={planTier} onChange={e=>setPlanTier(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm">{PLANS.map(p=><option key={p.code} value={p.code}>{p.name}</option>)}</select></label>
        <label><span className="mb-1.5 block text-[10px] font-black uppercase text-slate-500">Trial days</span><input type="number" min={0} max={365} value={trialDays} onChange={e=>setTrialDays(Math.max(0,Math.min(365,Number(e.target.value)||0)))} className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"/></label>
      </div>
      <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50 p-4 text-xs leading-5 text-blue-800"><b>Provisioning creates:</b> tenant organization, owner account, subscription/trial record, Manager/Front Desk/Driver role presets, and a clean empty business workspace.</div>
      <button disabled={busy||password.length<12} className="mt-5 w-full rounded-xl bg-blue-600 px-4 py-3.5 text-sm font-black text-white disabled:opacity-40">{busy?"Creating tenant…":"Create tenant organization"}</button>
    </form>
  </div>;
}
