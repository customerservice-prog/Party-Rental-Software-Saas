"use client";

import Link from "next/link";
import {useMemo,useState} from "react";

export type TenantReportLink={title:string;description:string;category:string;href:string;icon?:string};

export default function ReportLibrary({reports,showSearch=true}:{reports:TenantReportLink[];showSearch?:boolean}){
  const[query,setQuery]=useState("");
  const[category,setCategory]=useState("All Reports");
  const categories=useMemo(()=>Array.from(new Set(reports.map(report=>report.category))),[reports]);
  const visible=useMemo(()=>{
    const q=query.trim().toLowerCase();
    return reports.filter(report=>(category==="All Reports"||report.category===category)&&(!q||report.title.toLowerCase().includes(q)||report.description.toLowerCase().includes(q)||report.category.toLowerCase().includes(q)));
  },[reports,query,category]);

  return <>
    {showSearch&&<div className="mb-6 max-w-[620px]">
      <div className="relative">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">⌕</span>
        <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search reports by name, task, or keyword..." className="friendly-admin-field h-11 w-full !pl-11 !pr-10"/>
        {query&&<button type="button" onClick={()=>setQuery("")} aria-label="Clear search" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">×</button>}
      </div>
    </div>}

    <div className="grid gap-6 md:grid-cols-[220px_minmax(0,1fr)]">
      <aside>
        <select className="friendly-admin-field w-full md:hidden" value={category} onChange={e=>setCategory(e.target.value)}>
          <option>All Reports</option>{categories.map(value=><option key={value}>{value}</option>)}
        </select>
        <div className="hidden space-y-1 md:block">
          {["All Reports",...categories].map(value=><button key={value} type="button" onClick={()=>setCategory(value)} className={"flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-xs font-semibold "+(category===value?"bg-green-50 text-green-900":"text-slate-600 hover:bg-slate-50")}>
            <span>{value}</span><span className="text-[10px] text-slate-400">{value==="All Reports"?reports.length:reports.filter(r=>r.category===value).length}</span>
          </button>)}
        </div>
      </aside>

      <section className="friendly-admin-card !mb-0 !p-0 overflow-hidden">
        <div className="friendly-admin-subhead"><div><h2>{category}</h2><p>{visible.length} available report{visible.length===1?"":"s"}</p></div></div>
        {visible.length?<div className="divide-y divide-slate-100">{visible.map(report=><Link key={report.title} href={report.href} className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-slate-50">
          <div className="flex min-w-0 items-start gap-3"><span className="mt-0.5 text-lg">{report.icon||"📄"}</span><div className="min-w-0"><div className="text-sm font-semibold text-slate-900">{report.title}</div><div className="mt-0.5 text-xs text-slate-500">{report.description}</div></div></div><span className="shrink-0 text-slate-300">→</span>
        </Link>)}</div>:<div className="friendly-admin-empty">No reports match your search.</div>}
      </section>
    </div>
  </>;
}
