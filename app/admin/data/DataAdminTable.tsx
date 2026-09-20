"use client";

import { useState } from "react";

type Org={id:string;name:string;slug:string;status:string;createdAt:string|Date;_count:{users:number;customers:number;orders:number;items:number}};

export default function DataAdminTable({organizations}:{organizations:Org[]}){
  const[rows,setRows]=useState(organizations);
  const[busy,setBusy]=useState<string|null>(null);
  const[message,setMessage]=useState("");
  const[error,setError]=useState("");

  async function archive(org:Org){
    const typed=prompt('Type the tenant slug "'+org.slug+'" to archive this account. This suspends tenant login/storefront access but does not delete data.');
    if(typed===null)return;
    setBusy(org.id);setMessage("");setError("");
    const r=await fetch("/api/admin/organizations/"+org.id+"/support",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"tenant.archive",confirmSlug:typed})});
    const d=await r.json().catch(()=>({}));
    if(!r.ok)setError(d.error||"Could not archive tenant.");
    else{setRows(prev=>prev.map(x=>x.id===org.id?{...x,status:"suspended"}:x));setMessage(org.name+" archived. Data remains intact.")}
    setBusy(null);
  }

  return <div className="space-y-4">
    {(message||error)&&<div className={"rounded-xl border px-4 py-3 text-sm font-bold "+(error?"border-rose-200 bg-rose-50 text-rose-700":"border-emerald-200 bg-emerald-50 text-emerald-700")}>{error||message}</div>}
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-4"><h2 className="text-sm font-black">Tenant data controls</h2><p className="mt-0.5 text-[11px] text-slate-400">Hard deletion is intentionally not exposed here; archive preserves recovery and auditability.</p></div>
      <div className="overflow-x-auto"><table className="min-w-[900px] w-full">
        <thead className="bg-slate-50/80"><tr className="text-left text-[9px] font-black uppercase tracking-wide text-slate-400"><th className="px-5 py-3">Tenant</th><th className="px-5 py-3">Records</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Created</th><th className="px-5 py-3">Export</th><th className="px-5 py-3">Archive</th></tr></thead>
        <tbody className="divide-y divide-slate-100">{rows.map(org=><tr key={org.id}>
          <td className="px-5 py-4"><div className="text-sm font-black">{org.name}</div><div className="text-[10px] text-slate-400">{org.slug}</div></td>
          <td className="px-5 py-4 text-xs text-slate-500">{org._count.items} items · {org._count.customers} customers · {org._count.orders} orders · {org._count.users} users</td>
          <td className="px-5 py-4"><span className={"rounded-full px-2.5 py-1 text-[9px] font-black uppercase "+(org.status==="suspended"?"bg-rose-50 text-rose-700":"bg-emerald-50 text-emerald-700")}>{org.status}</span></td>
          <td className="px-5 py-4 text-xs text-slate-500">{new Date(org.createdAt).toLocaleDateString()}</td>
          <td className="px-5 py-4"><a href={"/api/admin/organizations/"+org.id+"/export"} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] font-black text-blue-600">Download JSON</a></td>
          <td className="px-5 py-4"><button disabled={busy===org.id||org.status==="suspended"} onClick={()=>archive(org)} className="rounded-lg bg-rose-50 px-3 py-2 text-[10px] font-black text-rose-700 disabled:opacity-40">{org.status==="suspended"?"Archived":"Archive tenant"}</button></td>
        </tr>)}</tbody>
      </table></div>
    </section>
  </div>;
}
