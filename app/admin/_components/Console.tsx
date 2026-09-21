import Link from "next/link";
import type { ReactNode } from "react";
export function ConsoleHeader({eyebrow,title,children}:{eyebrow:string;title:string;children:ReactNode}) {
  return <header><p className="text-xs font-bold uppercase tracking-[.18em] text-blue-600">{eyebrow}</p><h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">{title}</h1><div className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">{children}</div></header>;
}
export function Metric({label,value,detail}:{label:string;value:ReactNode;detail:string}) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-semibold text-slate-500">{label}</p><p className="mt-2 break-words text-3xl font-black tracking-tight">{value}</p><p className="mt-2 text-xs leading-5 text-slate-500">{detail}</p></div>;
}
export function Notice({children}:{children:ReactNode}) {
  return <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">{children}</div>;
}
export function Empty({children}:{children:ReactNode}) { return <p className="p-8 text-center text-sm leading-6 text-slate-500">{children}</p>; }
export function Pager({base,page,total,pageSize,q="",status=""}:{base:string;page:number;total:number;pageSize:number;q?:string;status?:string}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const href = (p:number) => `${base}?${new URLSearchParams({page:String(p),q,status})}`;
  return <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 p-4 text-sm"><span>{total.toLocaleString()} matching records · page {page} of {pages}</span><div className="flex gap-2">{page > 1 && <Link className="rounded-lg border bg-white px-4 py-2" href={href(page-1)}>Previous</Link>}{page < pages && <Link className="rounded-lg border bg-white px-4 py-2" href={href(page+1)}>Next</Link>}</div></nav>;
}
export function SearchForm({q,status,options=[]}:{q:string;status?:string;options?:Array<[string,string]>}) {
  return <form className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4"><label className="min-w-0 flex-1 text-xs font-semibold text-slate-600">Search tenants or users<input name="q" defaultValue={q} maxLength={100} placeholder="Name or username" className="mt-2 block w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"/></label>{options.length>0 && <label className="text-xs font-semibold text-slate-600">Status<select name="status" defaultValue={status || ""} className="mt-2 block rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"><option value="">All statuses</option>{options.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>}<button className="rounded-lg bg-slate-950 px-5 py-2.5 text-sm font-bold text-white">Apply filters</button></form>;
}
