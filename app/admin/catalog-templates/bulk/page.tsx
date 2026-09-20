"use client";

import { useState } from "react";
import Link from "next/link";

export default function CatalogBulkToolsPage(){
  const[busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
  const[duplicates,setDuplicates]=useState<any[][]>([]);

  async function importFile(file?:File){
    if(!file)return;
    setBusy(true);setError("");setNotice("");
    try{
      const text=await file.text();
      const parsed=JSON.parse(text);
      const templates=Array.isArray(parsed)?parsed:parsed.templates;
      const r=await fetch("/api/admin/catalog-templates/bulk",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"import",templates})});
      const d=await r.json();
      if(!r.ok)throw new Error(d.error||"Import failed.");
      setNotice(`Import complete: ${d.created} created, ${d.updated} updated, ${d.skipped} skipped.`);
    }catch(e){setError(e instanceof Error?e.message:"Could not import catalog.")}
    setBusy(false);
  }

  async function scanDuplicates(){
    setBusy(true);setError("");setNotice("");
    const r=await fetch("/api/admin/catalog-templates/bulk",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"duplicates"})});
    const d=await r.json().catch(()=>({}));
    if(!r.ok)setError(d.error||"Duplicate scan failed.");else{setDuplicates(d.duplicates||[]);setNotice((d.duplicates||[]).length+" possible duplicate group(s) found.")}
    setBusy(false);
  }

  return <div className="space-y-6">
    <section>
      <Link href="/admin/catalog-templates" className="text-xs font-black text-blue-600">← Global catalog</Link>
      <div className="mt-3 text-[10px] font-black uppercase tracking-[.2em] text-blue-600">Catalog Operations</div>
      <h1 className="mt-1 text-3xl font-black tracking-[-.035em]">Import, export & quality tools</h1>
      <p className="mt-2 text-sm text-slate-500">Back up the platform catalog, bulk import templates, and detect likely duplicate inventory templates.</p>
    </section>
    {(error||notice)&&<div className={"rounded-xl border px-4 py-3 text-sm font-bold "+(error?"border-rose-200 bg-rose-50 text-rose-700":"border-emerald-200 bg-emerald-50 text-emerald-700")}>{error||notice}</div>}
    <section className="grid gap-5 lg:grid-cols-3">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="text-[10px] font-black uppercase text-slate-400">Backup</div><h2 className="mt-2 text-lg font-black">Export catalog</h2><p className="mt-2 text-xs leading-5 text-slate-500">Download every global template, including images, suggested pricing, keywords, attributes and status.</p><a href="/api/admin/catalog-templates/bulk" className="mt-5 block rounded-xl bg-slate-950 px-4 py-3 text-center text-xs font-black text-white">Download JSON export</a></div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="text-[10px] font-black uppercase text-slate-400">Bulk import</div><h2 className="mt-2 text-lg font-black">Import catalog</h2><p className="mt-2 text-xs leading-5 text-slate-500">Import the same JSON format. Existing slugs are updated; new slugs are created. Invalid rows are skipped.</p><label className="mt-5 block cursor-pointer rounded-xl bg-blue-600 px-4 py-3 text-center text-xs font-black text-white">{busy?"Working…":"Choose JSON file"}<input type="file" accept=".json,application/json" disabled={busy} className="hidden" onChange={e=>importFile(e.target.files?.[0])}/></label></div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="text-[10px] font-black uppercase text-slate-400">Catalog QA</div><h2 className="mt-2 text-lg font-black">Duplicate detector</h2><p className="mt-2 text-xs leading-5 text-slate-500">Find same-category template names after punctuation and spacing are normalized.</p><button disabled={busy} onClick={scanDuplicates} className="mt-5 w-full rounded-xl bg-violet-600 px-4 py-3 text-xs font-black text-white disabled:opacity-50">Scan duplicates</button></div>
    </section>
    {duplicates.length>0&&<section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 px-5 py-4"><h2 className="text-sm font-black">Possible duplicate groups</h2></div><div className="divide-y divide-slate-100">{duplicates.map((group,i)=><div key={i} className="p-5"><div className="text-[10px] font-black uppercase text-slate-400">Group {i+1}</div><div className="mt-2 flex flex-wrap gap-2">{group.map((t:any)=><span key={t.id} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs"><b>{t.name}</b> <span className="text-slate-400">· {t.categoryKey} · {t.slug}</span></span>)}</div></div>)}</div></section>}
  </div>;
}
