"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type AppRow = {
  code: string;
  name: string;
  vendor: string;
  category: string;
  tagline: string;
  description: string;
  planName: string;
  demoUrl: string;
  storefrontPath: string;
  logoText: string;
  features: string[];
  priceCents: number;
  installation: null | {
    status: string;
    priceCents: number;
    externalTenantSlug?: string | null;
    errorMessage?: string | null;
  };
  recurringAfterInstallCents: number | null;
};

function money(cents: number | null) {
  return cents == null ? "Not available" : new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(cents/100);
}

export default function MarketplaceClient({
  apps,
  canManage,
  interval,
  linkedBilling,
  currentRecurringCents,
  renewalDate,
}: {
  apps: AppRow[];
  canManage: boolean;
  interval: "monthly" | "annual";
  linkedBilling: boolean;
  currentRecurringCents: number | null;
  renewalDate: string | null;
}) {
  const router = useRouter();
  const [busy,setBusy]=useState("");
  const [error,setError]=useState("");
  const [preview,setPreview]=useState<AppRow|null>(null);

  async function install(app:AppRow){
    setBusy(app.code);setError("");
    try{
      const response=await fetch("/api/apps",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({appCode:app.code})});
      const data=await response.json();
      if(!response.ok&&response.status!==202)throw new Error(data.error||"Could not install app.");
      router.refresh();
    }catch(err){setError(err instanceof Error?err.message:"Could not install app.");}
    finally{setBusy("");}
  }

  async function cancel(app:AppRow){
    if(!confirm("Remove "+app.name+" from this business?"))return;
    setBusy(app.code);setError("");
    try{
      const response=await fetch("/api/apps?appCode="+encodeURIComponent(app.code),{method:"DELETE"});
      const data=await response.json();
      if(!response.ok)throw new Error(data.error||"Could not remove app.");
      router.refresh();
    }catch(err){setError(err instanceof Error?err.message:"Could not remove app.");}
    finally{setBusy("");}
  }

  return <div className="space-y-6">
    <section className="friendly-admin-card accent-blue">
      <div className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
        <div>
          <div className="text-xs font-bold uppercase tracking-[.16em] text-[#1a6fd4]">Your app marketplace</div>
          <h2 className="mt-2 text-xl font-bold text-slate-950">Add tools without rebuilding your website</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Install supported add-ons once. Party Rental CRM handles the tenant connection, website integration and recurring billing relationship.</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Current recurring CRM bill</div>
          <div className="mt-1 text-2xl font-black text-slate-950">{money(currentRecurringCents)}<span className="ml-1 text-xs font-semibold text-slate-400">/{interval==="annual"?"year":"month"}</span></div>
          <p className="mt-2 text-xs leading-5 text-slate-500">{renewalDate?"Next renewal: "+new Date(renewalDate).toLocaleDateString():"Renewal date not available yet."} {linkedBilling?"Paid apps are designed to join this same billing relationship.":"Connect a paid CRM subscription before installing paid apps."}</p>
        </div>
      </div>
    </section>

    {error&&<div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}

    <div className="grid gap-5 xl:grid-cols-2">
      {apps.map(app=>{
        const status=app.installation?.status||"not_installed";
        const active=status==="active";
        const pending=["provisioning","billing_pending"].includes(status);
        return <article key={app.code} className="friendly-admin-card !p-0 overflow-hidden">
          <div className="border-b border-slate-100 bg-gradient-to-br from-slate-950 to-slate-800 p-5 text-white">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-lg font-black">{app.logoText}</div><div><div className="text-[10px] font-bold uppercase tracking-[.15em] text-white/60">{app.category}</div><h2 className="text-xl font-black">{app.name}</h2></div></div>
              <span className={"rounded-full px-2.5 py-1 text-[10px] font-bold uppercase "+(active?"bg-emerald-400/20 text-emerald-200":pending?"bg-amber-400/20 text-amber-100":"bg-white/10 text-white/70")}>{active?"Installed":pending?"Setup pending":"Available"}</span>
            </div>
            <p className="mt-4 text-sm font-semibold text-white/90">{app.tagline}</p>
          </div>
          <div className="p-5">
            <p className="text-sm leading-6 text-slate-600">{app.description}</p>
            <ul className="mt-4 grid gap-2 text-xs text-slate-700 sm:grid-cols-2">{app.features.map(feature=><li key={feature} className="flex gap-2"><span className="font-black text-emerald-600">✓</span><span>{feature}</span></li>)}</ul>
            <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div><div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{app.planName}</div><div className="mt-1 text-2xl font-black text-slate-950">{money(app.priceCents)}<span className="ml-1 text-xs text-slate-400">/{interval==="annual"?"year":"month"}</span></div></div>
                <div className="text-right"><div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Recurring total after install</div><div className="mt-1 text-base font-black text-slate-900">{money(app.recurringAfterInstallCents)}<span className="ml-1 text-[10px] text-slate-400">/{interval==="annual"?"year":"month"}</span></div></div>
              </div>
              <p className="mt-2 text-[11px] leading-5 text-slate-500">No separate RentSketch bill. The add-on is attached to the Party Rental CRM subscription and follows the same renewal date once activation completes.</p>
            </div>
            {app.installation?.errorMessage&&<p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{app.installation.errorMessage}</p>}
            <div className="mt-5 flex flex-wrap gap-2">
              <button type="button" onClick={()=>setPreview(app)} className="friendly-admin-secondary">Preview live demo</button>
              {active&&<a href={app.storefrontPath} target="_blank" rel="noopener noreferrer" className="friendly-admin-secondary">Open on my website</a>}
              {!active&&<button type="button" disabled={!canManage||!linkedBilling||busy===app.code} onClick={()=>install(app)} className="friendly-admin-primary disabled:cursor-not-allowed disabled:opacity-40">{busy===app.code?"Setting up…":pending?"Finish activation":"Add to my business"}</button>}
              {app.installation&&!active&&status!=="canceled"&&<button type="button" disabled={!canManage||busy===app.code} onClick={()=>cancel(app)} className="friendly-admin-secondary disabled:opacity-40">Cancel setup</button>}
            </div>
            {!canManage&&<p className="mt-2 text-[11px] text-slate-500">Only the business owner can approve a paid app.</p>}
          </div>
        </article>;
      })}
    </div>

    {preview&&<div className="fixed inset-0 z-[100] bg-black/60 p-3 sm:p-6" role="dialog" aria-modal="true" aria-label={preview.name+" demo"}>
      <div className="mx-auto flex h-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3"><div><b>{preview.name} live demo</b><p className="text-xs text-slate-500">Generic demo data only — your business is not being changed.</p></div><button type="button" onClick={()=>setPreview(null)} className="friendly-admin-secondary">Close</button></div>
        <iframe src={preview.demoUrl} title={preview.name+" live demo"} className="min-h-0 flex-1 border-0" allow="fullscreen"/>
      </div>
    </div>}
  </div>;
}
