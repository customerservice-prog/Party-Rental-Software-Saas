"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import ViewAsTenantButton from "@/app/admin/ViewAsTenantButton";
import { PLANS, getPlan } from "@/lib/plans";

function toDateInputValue(value:string|null|undefined){return value?value.slice(0,10):""}
function money(n:number){return new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(n||0)}
function initials(name:string){return name.split(/\s+/).slice(0,2).map(x=>x[0]).join("").toUpperCase()||"PR"}

export default function AdminOrganizationDetailPage(){
  const params=useParams();
  const id=params.id as string;
  const[organization,setOrganization]=useState<any>(null);
  const[revenue,setRevenue]=useState<any>(null);
  const[status,setStatus]=useState("active");
  const[planTier,setPlanTier]=useState("starter");
  const[trialEndsAt,setTrialEndsAt]=useState("");
  const[subscriptionStatus,setSubscriptionStatus]=useState("trialing");
  const[subscriptionPlanTier,setSubscriptionPlanTier]=useState("starter");
  const[currentPeriodEnd,setCurrentPeriodEnd]=useState("");
  const[loading,setLoading]=useState(true);
  const[saving,setSaving]=useState(false);
  const[message,setMessage]=useState("");
  const[error,setError]=useState("");

  async function load(){
    setLoading(true);setError("");
    const res=await fetch("/api/admin/organizations/"+id,{cache:"no-store"});
    if(!res.ok){setError("Could not load this organization.");setLoading(false);return}
    const data=await res.json();
    setOrganization(data.organization);
    setRevenue(data.revenue);
    setStatus(data.organization.status);
    setPlanTier(data.organization.planTier);
    setTrialEndsAt(toDateInputValue(data.organization.trialEndsAt));
    setSubscriptionStatus(data.organization.subscription?.status||"trialing");
    setSubscriptionPlanTier(data.organization.subscription?.planTier||data.organization.planTier);
    setCurrentPeriodEnd(toDateInputValue(data.organization.subscription?.currentPeriodEnd));
    setLoading(false);
  }

  useEffect(()=>{load()},[id]);

  async function save(e:React.FormEvent){
    e.preventDefault();setSaving(true);setMessage("");setError("");
    const res=await fetch("/api/admin/organizations/"+id,{
      method:"PATCH",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({status,planTier,trialEndsAt:trialEndsAt||null,subscriptionStatus,subscriptionPlanTier,currentPeriodEnd:currentPeriodEnd||null}),
    });
    setSaving(false);
    if(!res.ok){const data=await res.json().catch(()=>({}));setError(data.error?"Could not save these changes.":"Something went wrong saving changes.");return}
    const data=await res.json();setOrganization(data.organization);setMessage("Organization settings saved.");
  }

  if(loading)return <div className="flex min-h-[60vh] items-center justify-center"><div className="text-sm font-bold text-slate-400">Loading organization…</div></div>;
  if(!organization)return <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm font-bold text-rose-700">{error||"Organization not found."}</div>;

  const sub=organization.subscription;
  const accountStatus=organization.status;
  const plan=getPlan(sub?.planTier||organization.planTier);

  return <form onSubmit={save} className="space-y-5">
    <section className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
      <div>
        <Link href="/admin/organizations" className="text-xs font-black text-blue-600 hover:text-blue-700">← All organizations</Link>
        <div className="mt-4 flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-800 to-slate-950 text-sm font-black text-white shadow-lg">{initials(organization.name)}</div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-3xl font-black tracking-[-.035em] text-slate-950">{organization.name}</h1>
              <span className={"rounded-full px-2.5 py-1 text-[9px] font-black uppercase "+(accountStatus==="active"?"bg-emerald-50 text-emerald-700":"bg-rose-50 text-rose-700")}>{accountStatus}</span>
            </div>
            <div className="mt-1 text-sm text-slate-500">{organization.slug}.partyrentalcrm.com · {organization.contactEmail||"No contact email"}</div>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <ViewAsTenantButton organizationId={organization.id}/>
        <Link href={"/admin/organizations/"+organization.id+"/support"} className="rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-black text-white shadow-sm">Support workspace</Link>
        <a href={"/t/"+organization.slug} target="_blank" rel="noreferrer" className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700 shadow-sm">Open storefront ↗</a>
        <button type="submit" disabled={saving} className="rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-black text-white shadow-sm disabled:opacity-50">{saving?"Saving…":"Save changes"}</button>
      </div>
    </section>

    {(message||error)&&<div className={"rounded-xl border px-4 py-3 text-sm font-bold "+(error?"border-rose-200 bg-rose-50 text-rose-700":"border-emerald-200 bg-emerald-50 text-emerald-700")}>{error||message}</div>}

    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {[
        ["Staff users",organization._count.users,"Tenant access"],
        ["Customers",organization._count.customers,"CRM records"],
        ["Orders",organization._count.orders,"Lifetime orders"],
        ["Collected",money(revenue?.amountPaid||0),"of "+money(revenue?.totalAmount||0)+" booked"],
      ].map(([label,value,sub])=><div key={String(label)} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,.04)]"><div className="text-[9px] font-black uppercase tracking-[.14em] text-slate-400">{label}</div><div className="mt-2 text-2xl font-black tracking-tight text-slate-950">{value}</div><div className="mt-1 text-[11px] text-slate-400">{sub}</div></div>)}
    </section>

    <section className="grid gap-5 xl:grid-cols-[1.05fr_.95fr]">
      <div className="space-y-5">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,.04)]">
          <div className="border-b border-slate-100 px-5 py-4"><h2 className="text-sm font-black text-slate-950">Account profile</h2><p className="mt-0.5 text-[11px] text-slate-400">Platform identity and lifecycle status.</p></div>
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <div className="rounded-xl bg-slate-50 p-4"><div className="text-[9px] font-black uppercase text-slate-400">Tenant slug</div><div className="mt-1 text-sm font-black text-slate-800">{organization.slug}</div></div>
            <div className="rounded-xl bg-slate-50 p-4"><div className="text-[9px] font-black uppercase text-slate-400">Joined</div><div className="mt-1 text-sm font-black text-slate-800">{new Date(organization.createdAt).toLocaleDateString()}</div></div>
            <label className="sm:col-span-2"><span className="mb-1.5 block text-[10px] font-black uppercase tracking-wide text-slate-500">Account status</span><select value={status} onChange={e=>setStatus(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-400"><option value="active">Active</option><option value="suspended">Suspended</option></select><span className="mt-1.5 block text-[11px] leading-5 text-slate-400">Suspending immediately blocks the tenant storefront, tenant login, and checkout.</span></label>
            <label className="sm:col-span-2"><span className="mb-1.5 block text-[10px] font-black uppercase tracking-wide text-slate-500">Display plan</span><select value={planTier} onChange={e=>setPlanTier(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-400">{PLANS.map(p=><option key={p.code} value={p.code}>{p.name}</option>)}{!PLANS.some(p=>p.code===planTier)&&<option value={planTier}>{planTier}</option>}</select></label>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,.04)]">
          <div className="border-b border-slate-100 px-5 py-4"><h2 className="text-sm font-black text-slate-950">Tenant payment rail</h2><p className="mt-0.5 text-[11px] text-slate-400">This is the tenant collecting money from its own customers, separate from Party Rental CRM subscription billing.</p></div>
          <div className="p-5"><div className="flex items-center justify-between rounded-xl bg-slate-50 p-4"><div><div className="text-xs font-black text-slate-800">Stripe Connect</div><div className="mt-1 text-[11px] text-slate-400">Customer payment processing</div></div><span className={"rounded-full px-2.5 py-1 text-[9px] font-black uppercase "+(organization.stripeAccountId?"bg-emerald-50 text-emerald-700":"bg-slate-200 text-slate-600")}>{organization.stripeAccountId?"Connected":"Not connected"}</span></div></div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,.04)]">
        <div className="border-b border-slate-100 px-5 py-4"><div className="flex items-center justify-between gap-3"><div><h2 className="text-sm font-black text-slate-950">Platform subscription</h2><p className="mt-0.5 text-[11px] text-slate-400">Party Rental CRM billing/access controls for this tenant.</p></div><span className="rounded-full bg-blue-50 px-2.5 py-1 text-[9px] font-black uppercase text-blue-700">{plan.name}</span></div></div>
        <div className="space-y-4 p-5">
          <label><span className="mb-1.5 block text-[10px] font-black uppercase tracking-wide text-slate-500">Subscription status</span><select value={subscriptionStatus} onChange={e=>setSubscriptionStatus(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-400"><option value="trialing">Trialing</option><option value="active">Active / Paid</option><option value="past_due">Past due</option><option value="trial_ended">Trial ended</option><option value="unpaid">Unpaid</option><option value="canceled">Canceled</option></select></label>
          <label><span className="mb-1.5 block text-[10px] font-black uppercase tracking-wide text-slate-500">Subscription plan</span><select value={subscriptionPlanTier} onChange={e=>setSubscriptionPlanTier(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-400">{PLANS.map(p=><option key={p.code} value={p.code}>{p.name}{p.monthlyPrice!==null?" · $"+p.monthlyPrice+"/mo":""}</option>)}{!PLANS.some(p=>p.code===subscriptionPlanTier)&&<option value={subscriptionPlanTier}>{subscriptionPlanTier}</option>}</select></label>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
            <label><span className="mb-1.5 block text-[10px] font-black uppercase tracking-wide text-slate-500">Trial ends</span><input type="date" value={trialEndsAt} onChange={e=>setTrialEndsAt(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 outline-none focus:border-blue-400"/></label>
            <label><span className="mb-1.5 block text-[10px] font-black uppercase tracking-wide text-slate-500">Period ends</span><input type="date" value={currentPeriodEnd} onChange={e=>setCurrentPeriodEnd(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 outline-none focus:border-blue-400"/></label>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-[11px] leading-5 text-amber-800"><b>Manual subscription controls.</b> These values control tenant access while platform subscription billing is managed manually.</div>
          {sub?.pastDueSince&&<div className="rounded-xl border border-rose-200 bg-rose-50 p-4"><div className="text-[9px] font-black uppercase text-rose-600">Past due since</div><div className="mt-1 text-sm font-black text-rose-800">{new Date(sub.pastDueSince).toLocaleDateString()}</div></div>}
          <button type="submit" disabled={saving} className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white shadow-sm disabled:opacity-50">{saving?"Saving changes…":"Save subscription & account"}</button>
        </div>
      </div>
    </section>
  </form>;
}
