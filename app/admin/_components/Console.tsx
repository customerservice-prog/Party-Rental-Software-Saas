import Link from "next/link";
import type {ReactNode} from "react";
import Icon,{type IconName} from "@/app/dashboard/components/Icon";
export function ConsoleHeader({eyebrow,title,children}:{eyebrow:string;title:string;children:ReactNode}){return <header className="console-page-header"><p className="console-eyebrow">{eyebrow}</p><h1>{title}</h1><div className="console-page-description">{children}</div></header>;}
export function Metric({label,value,detail,icon}:{label:string;value:ReactNode;detail:string;icon?:IconName}){return <div className="console-metric"><div className="console-metric-head"><p>{label}</p>{icon&&<span className="console-metric-icon"><Icon name={icon}/></span>}</div><p className="console-metric-value">{value}</p><p className="console-metric-detail">{detail}</p></div>;}
export function Notice({children}:{children:ReactNode}){return <div className="console-notice"><Icon name="shield"/><div className="min-w-0">{children}</div></div>;}
export function Empty({children}:{children:ReactNode}){return <div className="console-empty"><span><Icon name="orders"/></span><p>{children}</p></div>;}
export function Pager({base,page,total,pageSize,q="",status=""}:{base:string;page:number;total:number;pageSize:number;q?:string;status?:string}){
  const pages=Math.max(1,Math.ceil(total/pageSize));const href=(p:number)=>`${base}?${new URLSearchParams({page:String(p),q,status})}`;
  return <nav aria-label="Pagination" className="console-pager"><span>{total.toLocaleString()} matching records · page {page} of {pages}</span><div>{page>1&&<Link href={href(page-1)}>← Previous</Link>}{page<pages&&<Link href={href(page+1)}>Next →</Link>}</div></nav>;
}
export function SearchForm({q,status,options=[]}:{q:string;status?:string;options?:Array<[string,string]>}){
  return <form className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4"><label className="min-w-0 flex-1 text-xs font-semibold text-slate-600">Search tenants or users<input name="q" defaultValue={q} maxLength={100} placeholder="Name or username" className="mt-2 block w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"/></label>{options.length>0&&<label className="text-xs font-semibold text-slate-600">Status<select name="status" defaultValue={status||""} className="mt-2 block rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"><option value="">All statuses</option>{options.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>}<button className="rounded-lg bg-slate-950 px-5 py-2.5 text-sm font-bold text-white">Apply filters</button></form>;
}
