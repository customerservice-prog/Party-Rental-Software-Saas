"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

type IconProps={className?:string};
function GridIcon({className=""}:IconProps){return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></svg>}
function BuildingIcon({className=""}:IconProps){return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}><path d="M4 21V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v15"/><path d="M16 10h2a2 2 0 0 1 2 2v9M8 8h4M8 12h4M8 16h4M3 21h18"/></svg>}
function BoxIcon({className=""}:IconProps){return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}><path d="m21 8-9 5-9-5 9-5 9 5Z"/><path d="m3 8 9 5v9l-9-5V8ZM21 8l-9 5v9l9-5V8Z"/></svg>}
function ShieldIcon({className=""}:IconProps){return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></svg>}
function ExternalIcon({className=""}:IconProps){return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}><path d="M14 3h7v7M10 14 21 3"/><path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"/></svg>}
function LogoutIcon({className=""}:IconProps){return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}><path d="M10 17l5-5-5-5M15 12H3"/><path d="M21 19V5a2 2 0 0 0-2-2h-6"/></svg>}

const nav=[
  {href:"/admin",label:"Overview",icon:GridIcon,exact:true},
  {href:"/admin/organizations",label:"Organizations",icon:BuildingIcon},
  {href:"/admin/billing",label:"Billing & Revenue",icon:GridIcon},
  {href:"/admin/onboarding",label:"Onboarding",icon:BuildingIcon},
  {href:"/admin/analytics",label:"Analytics",icon:GridIcon},
  {href:"/admin/health",label:"System Health",icon:ShieldIcon},
  {href:"/admin/communications",label:"Communications",icon:GridIcon},
  {href:"/admin/feature-flags",label:"Feature Flags",icon:ShieldIcon},
  {href:"/admin/catalog-templates",label:"Global Catalog",icon:BoxIcon},
  {href:"/admin/security",label:"Security",icon:ShieldIcon},
  {href:"/admin/data",label:"Data Admin",icon:BoxIcon},
  {href:"/admin/settings",label:"Settings & Plans",icon:GridIcon},
  {href:"/admin/audit-log",label:"Audit Log",icon:ShieldIcon},
];

export default function AdminNav({adminName}:{adminName:string}){
  const pathname=usePathname();
  return <>
    <aside className="hidden lg:flex lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:w-[270px] lg:flex-col lg:border-r lg:border-slate-800 lg:bg-[#0b1019]">
      <div className="flex h-[74px] items-center border-b border-white/[.07] px-6">
        <Link href="/admin" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-xs font-black text-white shadow-lg shadow-blue-950/40">PR</div>
          <div>
            <div className="text-sm font-black tracking-tight text-white">Party Rental CRM</div>
            <div className="mt-0.5 text-[9px] font-black uppercase tracking-[.18em] text-blue-300">Platform Console</div>
          </div>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5">
        <div className="mb-2 px-3 text-[9px] font-black uppercase tracking-[.18em] text-slate-600">Platform</div>
        <nav className="space-y-1">
          {nav.map(item=>{
            const active=item.exact?pathname===item.href:pathname.startsWith(item.href);
            const Icon=item.icon;
            return <Link key={item.href} href={item.href} className={"group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition "+(active?"bg-blue-500/12 text-white ring-1 ring-inset ring-blue-400/15":"text-slate-400 hover:bg-white/[.05] hover:text-slate-100")}>
              <Icon className={"h-[18px] w-[18px] "+(active?"text-blue-400":"text-slate-500 group-hover:text-slate-300")}/>
              <span>{item.label}</span>
              {active&&<span className="ml-auto h-1.5 w-1.5 rounded-full bg-blue-400"/>}
            </Link>
          })}
        </nav>
      </div>

      <div className="mx-4 mt-2 rounded-2xl border border-amber-400/10 bg-amber-400/[.05] p-4">
        <div className="text-[9px] font-black uppercase tracking-[.16em] text-amber-300">Platform Scope</div>
        <p className="mt-1.5 text-[11px] leading-5 text-slate-400">Changes here can affect every tenant. Tenant business operations live in their own dashboards.</p>
      </div>

      <div className="mt-auto border-t border-white/[.07] p-4">
        <div className="mb-3 flex items-center gap-3 rounded-xl bg-white/[.035] p-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-[11px] font-black text-slate-200">{adminName.slice(0,1).toUpperCase()}</div>
          <div className="min-w-0">
            <div className="truncate text-xs font-bold text-slate-200">{adminName}</div>
            <div className="text-[10px] text-slate-600">Platform administrator</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Link href="/" target="_blank" className="flex items-center justify-center gap-1.5 rounded-lg border border-white/[.08] px-2 py-2 text-[10px] font-bold text-slate-400 hover:bg-white/[.04] hover:text-white"><ExternalIcon className="h-3.5 w-3.5"/>Site</Link>
          <button onClick={()=>signOut({callbackUrl:"/platform-login"})} className="flex items-center justify-center gap-1.5 rounded-lg border border-white/[.08] px-2 py-2 text-[10px] font-bold text-slate-400 hover:bg-white/[.04] hover:text-white"><LogoutIcon className="h-3.5 w-3.5"/>Sign out</button>
        </div>
      </div>
    </aside>

    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
      <div className="flex items-center justify-between gap-3">
        <Link href="/admin" className="flex items-center gap-2"><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-950 text-[10px] font-black text-white">PR</div><div><div className="text-xs font-black">Party Rental CRM</div><div className="text-[8px] font-black uppercase tracking-[.14em] text-blue-600">Platform Admin</div></div></Link>
        <button onClick={()=>signOut({callbackUrl:"/platform-login"})} className="rounded-lg border border-slate-200 px-3 py-2 text-[10px] font-bold text-slate-600">Sign out</button>
      </div>
      <nav className="mt-3 flex gap-1 overflow-x-auto pb-0.5">
        {nav.map(item=>{
          const active=item.exact?pathname===item.href:pathname.startsWith(item.href);
          return <Link key={item.href} href={item.href} className={"whitespace-nowrap rounded-lg px-3 py-2 text-[11px] font-bold "+(active?"bg-slate-950 text-white":"bg-slate-100 text-slate-600")}>{item.label}</Link>
        })}
      </nav>
    </header>
  </>;
}
