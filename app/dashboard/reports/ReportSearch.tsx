"use client";

import Link from "next/link";
import {useMemo,useState} from "react";
import type {TenantReportLink} from "./ReportLibrary";

export default function ReportSearch({reports}:{reports:TenantReportLink[]}){
  const[query,setQuery]=useState("");
  const results=useMemo(()=>{
    const q=query.trim().toLowerCase();
    if(!q)return [];
    return reports.filter(report=>
      report.title.toLowerCase().includes(q)||
      report.description.toLowerCase().includes(q)||
      report.category.toLowerCase().includes(q)
    ).slice(0,8);
  },[query,reports]);

  return <div className="relative mb-8 max-w-[600px]">
    <span className="pointer-events-none absolute left-4 top-[22px] -translate-y-1/2 text-slate-400">⌕</span>
    <input
      type="search"
      value={query}
      onChange={event=>setQuery(event.target.value)}
      placeholder="Search reports by name, task, or keyword..."
      className="friendly-admin-field h-11 w-full !pl-11 !pr-10"
      aria-label="Search reports"
    />
    {query&&<button type="button" aria-label="Clear search" onClick={()=>setQuery("")} className="absolute right-3 top-[22px] -translate-y-1/2 text-slate-400 hover:text-slate-700">×</button>}
    {query&&<div className="absolute z-30 mt-2 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
      {results.length?results.map(report=><Link key={report.title} href={report.href} className="flex items-center justify-between gap-4 border-b border-slate-100 px-4 py-3 last:border-0 hover:bg-slate-50">
        <div className="min-w-0"><div className="text-sm font-semibold text-slate-900">{report.title}</div><div className="truncate text-xs text-slate-500">{report.description}</div></div>
        <span className="shrink-0 text-xs text-slate-400">{report.category}</span>
      </Link>):<div className="px-4 py-4 text-sm text-slate-500">No reports match “{query}”.</div>}
    </div>}
  </div>;
}
