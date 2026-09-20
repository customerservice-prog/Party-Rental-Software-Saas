"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type TenantUser={id:string;name:string;username:string;role:string;isActive:boolean;lastLoginAt:string|null;createdAt:string;forcePasswordReset:boolean;tenantRole:{name:string}|null};
type SupportNote={id:string;body:string;createdBy:string;createdAt:string};
type Organization={id:string;name:string;slug:string;status:string;contactEmail:string|null;contactPhone:string|null;customDomain:string|null;stripeAccountId:string|null;emailConfigured:boolean;smsConfigured:boolean;createdAt:string;website:{publishedAt:string|null}|null;users:TenantUser[];_count:{items:number;customers:number;orders:number;pages:number;drivers:number;sentMessages:number}};

export default function SupportWorkspace({organizationId}:{organizationId:string}){
  const router=useRouter();
  const[organization,setOrganization]=useState<Organization|null>(null);
  const[notes,setNotes]=useState<SupportNote[]>([]);
  const[health,setHealth]=useState<{failedMessages:number;blockedAttempts:number}>({failedMessages:0,blockedAttempts:0});
  const[note,setNote]=useState("");
  const[busy,setBusy]=useState(false);
  const[error,setError]=useState("");
  const[notice,setNotice]=useState("");

  async function load(){
    const r=await fetch("/api/admin/organizations/"+organizationId+"/support",{cache:"no-store"});
    const d=await r.json().catch(()=>({}));
    if(!r.ok){setError(d.error||"Could not load tenant support data.");return}
    setOrganization(d.organization);setNotes(d.notes||[]);setHealth(d.health||{failedMessages:0,blockedAttempts:0});
  }
  useEffect(()=>{load()},[organizationId]);

  const setup=useMemo(()=>{
    if(!organization)return [];
    return [
      ["Inventory",organization._count.items>0],
      ["Storefront",!!organization.website?.publishedAt],
      ["First order",organization._count.orders>0],
      ["Stripe",!!organization.stripeAccountId],
      ["Email",organization.emailConfigured],
      ["SMS",organization.smsConfigured],
      ["Custom domain",!!organization.customDomain],
    ] as [string,boolean][];
  },[organization]);

  async function action(payload:any){
    setBusy(true);setError("");setNotice("");
    const r=await fetch("/api/admin/organizations/"+organizationId+"/support",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
    const d=await r.json().catch(()=>({}));
    if(!r.ok)setError(d.error||"Support action failed.");else{setNotice("Support action completed.");await load()}
    setBusy(false);
    return r.ok;
  }

  async function addNote(){
    if(!note.trim())return;
    if(await action({action:"note.create",body:note})){setNote("")}
  }

  async function resetPassword(user:TenantUser){
    const password=prompt("Enter a temporary password (12+ characters) for "+user.username+". The user will be flagged to change it.");
    if(!password)return;
    await action({action:"user.reset_password",userId:user.id,password});
  }

  async function startSupport(){
    setBusy(true);setError("");
    const r=await fetch("/api/admin/organizations/"+organizationId+"/support-session",{method:"POST"});
    const d=await r.json().catch(()=>({}));
    setBusy(false);
    if(!r.ok){setError(d.error||"Could not start support session.");return}
    router.push("/dashboard");router.refresh();
  }

  if(!organization)return <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-400">{error||"Loading tenant support workspace…"}</div>;

  const done=setup.filter(x=>x[1]).length;
  const pct=Math.round(done/setup.length*100);

  return <div className="space-y-6">
    <section className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
      <div>
        <Link href={"/admin/organizations/"+organization.id} className="text-xs font-black text-blue-600">← Tenant account</Link>
        <div className="mt-3 text-[10px] font-black uppercase tracking-[.2em] text-violet-600">Support Workspace</div>
        <h1 className="mt-1 text-3xl font-black tracking-[-.035em]">{organization.name}</h1>
        <p className="mt-2 text-sm text-slate-500">{organization.slug}.partyrentalcrm.com · support notes, users, onboarding and safe tenant access.</p>
      </div>
      <button disabled={busy} onClick={startSupport} className="rounded-xl bg-violet-600 px-4 py-3 text-xs font-black text-white shadow-sm disabled:opacity-50">Open 20-minute tenant support session →</button>
    </section>

    {(error||notice)&&<div className={"rounded-xl border px-4 py-3 text-sm font-bold "+(error?"border-rose-200 bg-rose-50 text-rose-700":"border-emerald-200 bg-emerald-50 text-emerald-700")}>{error||notice}</div>}

    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {[
        ["Setup",pct+"%",done+" of "+setup.length+" milestones"],
        ["Users",String(organization.users.length),organization.users.filter(u=>u.isActive).length+" active"],
        ["Message failures",String(health.failedMessages),"tenant communication failures"],
        ["Blocked bookings",String(health.blockedAttempts),"Do Not Rent matches"],
      ].map(([a,b,c])=><div key={a} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="text-[9px] font-black uppercase tracking-wide text-slate-400">{a}</div><div className="mt-2 text-3xl font-black">{b}</div><div className="mt-1 text-[11px] text-slate-400">{c}</div></div>)}
    </section>

    <section className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4"><h2 className="text-sm font-black">Tenant users</h2><p className="mt-0.5 text-[11px] text-slate-400">Enable/disable access, reset credentials, or transfer account ownership.</p></div>
        <div className="divide-y divide-slate-100">{organization.users.map(user=><div key={user.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div><div className="flex flex-wrap items-center gap-2"><b className="text-sm">{user.name}</b><span className="rounded bg-slate-100 px-2 py-0.5 text-[9px] font-black uppercase text-slate-600">{user.role}</span><span className={"rounded px-2 py-0.5 text-[9px] font-black uppercase "+(user.isActive?"bg-emerald-50 text-emerald-700":"bg-rose-50 text-rose-700")}>{user.isActive?"active":"disabled"}</span>{user.forcePasswordReset&&<span className="rounded bg-amber-50 px-2 py-0.5 text-[9px] font-black text-amber-700">RESET REQUIRED</span>}</div><div className="mt-1 text-[11px] text-slate-400">@{user.username} · {user.tenantRole?.name||"No custom role"} · last login {user.lastLoginAt?new Date(user.lastLoginAt).toLocaleString():"never"}</div></div>
          <div className="flex flex-wrap gap-2"><button disabled={busy} onClick={()=>resetPassword(user)} className="rounded-lg border border-slate-200 px-3 py-2 text-[10px] font-black text-slate-600">Reset password</button><button disabled={busy} onClick={()=>confirm("Sign "+user.name+" out of all current sessions?")&&action({action:"user.revoke_sessions",userId:user.id})} className="rounded-lg border border-slate-200 px-3 py-2 text-[10px] font-black text-slate-600">Revoke sessions</button><button disabled={busy} onClick={()=>action({action:user.isActive?"user.disable":"user.enable",userId:user.id})} className="rounded-lg bg-slate-100 px-3 py-2 text-[10px] font-black text-slate-700">{user.isActive?"Disable":"Enable"}</button>{user.role!=="owner"&&<button disabled={busy} onClick={()=>confirm("Transfer ownership to "+user.name+"? Existing owner accounts will become staff.")&&action({action:"user.transfer_owner",userId:user.id})} className="rounded-lg bg-violet-50 px-3 py-2 text-[10px] font-black text-violet-700">Make owner</button>}</div>
        </div>)}</div>
      </div>

      <div className="space-y-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-black">Onboarding snapshot</h2>
          <div className="mt-4 space-y-2">{setup.map(([label,done])=><div key={label} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs"><span className="font-bold">{label}</span><span className={done?"text-emerald-600":"text-slate-300"}>{done?"● Ready":"○ Missing"}</span></div>)}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-black">Support notes</h2>
          <textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Internal note about this tenant…" className="mt-3 min-h-[90px] w-full rounded-xl border border-slate-200 p-3 text-sm"/>
          <button disabled={busy||!note.trim()} onClick={addNote} className="mt-2 w-full rounded-xl bg-slate-950 px-3 py-2.5 text-xs font-black text-white disabled:opacity-40">Add internal note</button>
          <div className="mt-4 max-h-72 space-y-2 overflow-y-auto">{notes.length?notes.map(n=><div key={n.id} className="rounded-xl bg-slate-50 p-3"><p className="text-xs leading-5 text-slate-600">{n.body}</p><div className="mt-2 text-[9px] text-slate-400">{new Date(n.createdAt).toLocaleString()} · {n.createdBy}</div></div>):<div className="text-xs text-slate-400">No support notes yet.</div>}</div>
        </div>
      </div>
    </section>
  </div>;
}
