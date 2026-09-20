"use client";

import { useEffect, useState } from "react";

type Announcement={id:string;title:string;body:string;tone:string;audienceType:string;audienceValue:string|null;status:string;startsAt:string|null;endsAt:string|null;createdAt:string};

const empty={id:"",title:"",body:"",tone:"info",audienceType:"all",audienceValue:"",status:"draft",startsAt:"",endsAt:""};

export default function PlatformCommunicationsPage(){
  const[announcements,setAnnouncements]=useState<Announcement[]>([]);
  const[form,setForm]=useState(empty);
  const[loading,setLoading]=useState(true);
  const[saving,setSaving]=useState(false);
  const[message,setMessage]=useState("");
  const[error,setError]=useState("");

  async function load(){
    setLoading(true);setError("");
    const r=await fetch("/api/admin/platform-control",{cache:"no-store"});
    const d=await r.json().catch(()=>({}));
    if(r.ok)setAnnouncements(d.announcements||[]);else setError(d.error||"Could not load announcements.");
    setLoading(false);
  }
  useEffect(()=>{load()},[]);

  async function save(status?:string){
    setSaving(true);setError("");setMessage("");
    const payload={action:"announcement.upsert",...form,status:status||form.status};
    const r=await fetch("/api/admin/platform-control",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
    const d=await r.json().catch(()=>({}));
    if(!r.ok)setError(d.error||"Could not save announcement.");
    else{setMessage(status==="published"?"Announcement published.":"Announcement saved.");setForm(empty);await load()}
    setSaving(false);
  }

  function edit(a:Announcement){
    setForm({
      id:a.id,title:a.title,body:a.body,tone:a.tone,audienceType:a.audienceType,audienceValue:a.audienceValue||"",status:a.status,
      startsAt:a.startsAt?a.startsAt.slice(0,16):"",endsAt:a.endsAt?a.endsAt.slice(0,16):"",
    });
    window.scrollTo({top:0,behavior:"smooth"});
  }

  async function remove(id:string){
    if(!confirm("Delete this platform announcement?"))return;
    await fetch("/api/admin/platform-control",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"announcement.delete",id})});
    await load();
  }

  return <div className="space-y-6">
    <section>
      <div className="text-[10px] font-black uppercase tracking-[.2em] text-blue-600">Tenant Communications</div>
      <h1 className="mt-1 text-3xl font-black tracking-[-.035em]">Announcements</h1>
      <p className="mt-2 text-sm text-slate-500">Publish maintenance notices, product updates, billing notices, and targeted messages directly into tenant dashboards.</p>
    </section>

    {(message||error)&&<div className={"rounded-xl border px-4 py-3 text-sm font-bold "+(error?"border-rose-200 bg-rose-50 text-rose-700":"border-emerald-200 bg-emerald-50 text-emerald-700")}>{error||message}</div>}

    <section className="grid gap-5 xl:grid-cols-[.85fr_1.15fr]">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between"><div><h2 className="text-sm font-black">{form.id?"Edit announcement":"New announcement"}</h2><p className="mt-0.5 text-[11px] text-slate-400">Published messages appear at the top of matching tenant dashboards.</p></div>{form.id&&<button onClick={()=>setForm(empty)} className="text-xs font-black text-slate-500">Cancel edit</button>}</div>
        <div className="mt-5 space-y-4">
          <label className="block"><span className="mb-1.5 block text-[10px] font-black uppercase text-slate-500">Title</span><input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400"/></label>
          <label className="block"><span className="mb-1.5 block text-[10px] font-black uppercase text-slate-500">Message</span><textarea value={form.body} onChange={e=>setForm({...form,body:e.target.value})} className="min-h-[120px] w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-blue-400"/></label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label><span className="mb-1.5 block text-[10px] font-black uppercase text-slate-500">Tone</span><select value={form.tone} onChange={e=>setForm({...form,tone:e.target.value})} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"><option value="info">Info / blue</option><option value="success">Success / green</option><option value="warning">Warning / amber</option><option value="danger">Critical / red</option></select></label>
            <label><span className="mb-1.5 block text-[10px] font-black uppercase text-slate-500">Audience</span><select value={form.audienceType} onChange={e=>setForm({...form,audienceType:e.target.value,audienceValue:""})} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"><option value="all">All tenants</option><option value="plan">Plan tier</option><option value="organization">One organization ID</option></select></label>
          </div>
          {form.audienceType!=="all"&&<label className="block"><span className="mb-1.5 block text-[10px] font-black uppercase text-slate-500">{form.audienceType==="plan"?"Plan code":"Organization ID"}</span><input value={form.audienceValue} onChange={e=>setForm({...form,audienceValue:e.target.value})} placeholder={form.audienceType==="plan"?"starter, growth, pro, enterprise":"Tenant organization ID"} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"/></label>}
          <div className="grid gap-3 sm:grid-cols-2"><label><span className="mb-1.5 block text-[10px] font-black uppercase text-slate-500">Starts</span><input type="datetime-local" value={form.startsAt} onChange={e=>setForm({...form,startsAt:e.target.value})} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"/></label><label><span className="mb-1.5 block text-[10px] font-black uppercase text-slate-500">Ends</span><input type="datetime-local" value={form.endsAt} onChange={e=>setForm({...form,endsAt:e.target.value})} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"/></label></div>
          <div className="flex gap-2"><button disabled={saving||!form.title||!form.body} onClick={()=>save("draft")} className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-black text-slate-700 disabled:opacity-40">Save draft</button><button disabled={saving||!form.title||!form.body} onClick={()=>save("published")} className="flex-1 rounded-xl bg-blue-600 px-4 py-3 text-xs font-black text-white disabled:opacity-40">Publish</button></div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4"><h2 className="text-sm font-black">Announcement history</h2><p className="mt-0.5 text-[11px] text-slate-400">Draft, scheduled, live, and archived messages.</p></div>
        {loading?<div className="p-10 text-center text-sm text-slate-400">Loading announcements…</div>:<div className="divide-y divide-slate-100">{announcements.length?announcements.map(a=><div key={a.id} className="p-5">
          <div className="flex items-start justify-between gap-4"><div><div className="flex flex-wrap items-center gap-2"><b className="text-sm">{a.title}</b><span className={"rounded-full px-2 py-0.5 text-[9px] font-black uppercase "+(a.status==="published"?"bg-emerald-50 text-emerald-700":a.status==="draft"?"bg-amber-50 text-amber-700":"bg-slate-100 text-slate-600")}>{a.status}</span></div><p className="mt-2 text-xs leading-5 text-slate-500">{a.body}</p><div className="mt-2 text-[10px] text-slate-400">{a.audienceType==="all"?"All tenants":a.audienceType+" · "+(a.audienceValue||"")} · created {new Date(a.createdAt).toLocaleString()}</div></div><div className="flex shrink-0 gap-2"><button onClick={()=>edit(a)} className="text-[10px] font-black text-blue-600">Edit</button><button onClick={()=>remove(a.id)} className="text-[10px] font-black text-rose-600">Delete</button></div></div>
        </div>):<div className="p-10 text-center text-sm text-slate-400">No platform announcements yet.</div>}</div>}
      </div>
    </section>
  </div>;
}
