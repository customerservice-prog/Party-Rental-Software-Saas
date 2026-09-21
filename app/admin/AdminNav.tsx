"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
const groups=[
  {name:"Business",links:[["/admin","Overview"],["/admin/organizations","Organizations"],["/admin/users","Tenant users"],["/admin/billing","Billing & revenue"],["/admin/onboarding","Onboarding"],["/admin/analytics","Analytics"]]},
  {name:"Operations",links:[["/admin/health","System health"],["/admin/integrations","Integrations"],["/admin/alerts","Support alerts"],["/admin/communications","Communications"],["/admin/catalog-templates","Global catalog"]]},
  {name:"Platform controls",links:[["/admin/feature-flags","Feature flags"],["/admin/security","Security"],["/admin/data","Data administration"],["/admin/settings","Settings & plans"],["/admin/audit-log","Audit log"]]},
];
export default function AdminNav({adminName}:{adminName:string}) {
  const pathname=usePathname();
  const active=(href:string)=>href==="/admin"?pathname===href:pathname===href||pathname.startsWith(href+"/");
  const current=groups.flatMap(g=>g.links).find(([href])=>active(href))?.[1]||"Platform console";
  const brand=<Link href="/admin" className="flex items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-sm font-black text-white">PR</span><span><span className="block text-sm font-black">Party Rental CRM</span><span className="mt-0.5 block text-[10px] font-bold uppercase tracking-wider text-blue-400">Platform console</span></span></Link>;
  return <>
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[270px] flex-col border-r border-slate-800 bg-slate-950 text-white lg:flex">
      <div className="border-b border-white/10 p-5">{brand}</div>
      <nav aria-label="Platform navigation" className="flex-1 space-y-5 overflow-y-auto p-4">{groups.map(g=><section key={g.name}><h2 className="px-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">{g.name}</h2><div className="mt-2 space-y-1">{g.links.map(([href,label])=><Link key={href} href={href} aria-current={active(href)?"page":undefined} className={`flex min-h-11 items-center rounded-xl px-3 text-sm font-semibold focus-visible:outline focus-visible:outline-blue-400 ${active(href)?"bg-blue-600 text-white":"text-slate-300 hover:bg-white/10"}`}>{label}</Link>)}</div></section>)}</nav>
      <div className="border-t border-white/10 p-4"><p className="truncate text-sm font-bold">{adminName}</p><p className="mt-1 text-xs leading-5 text-slate-400">Platform-wide access. Tenant actions affect live data.</p><div className="mt-3 grid grid-cols-2 gap-2"><Link href="/" target="_blank" rel="noopener noreferrer" className="rounded-lg border border-white/20 p-3 text-center text-xs font-bold">Public site</Link><button onClick={()=>signOut({callbackUrl:"/platform-login"})} className="rounded-lg border border-white/20 p-3 text-xs font-bold">Sign out</button></div></div>
    </aside>
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white lg:hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-3">{brand}<button onClick={()=>signOut({callbackUrl:"/platform-login"})} className="min-h-11 rounded-lg border px-3 text-xs font-bold">Sign out</button></div>
      <details key={pathname} className="border-t border-slate-100"><summary className="cursor-pointer px-5 py-3 text-sm font-bold">{current} <span className="ml-2 font-normal text-slate-500">· Open menu</span></summary><nav aria-label="Mobile platform navigation" className="max-h-[65vh] space-y-4 overflow-y-auto overscroll-contain border-t border-slate-200 p-4">{groups.map(g=><section key={g.name}><h2 className="mb-2 text-xs font-bold uppercase text-slate-500">{g.name}</h2><div className="grid grid-cols-2 gap-2">{g.links.map(([href,label])=><Link href={href} key={href} aria-current={active(href)?"page":undefined} className={`flex min-h-12 items-center rounded-lg px-3 py-3 text-sm font-semibold ${active(href)?"bg-slate-950 text-white":"bg-slate-100 text-slate-700"}`}>{label}</Link>)}</div></section>)}</nav></details>
    </header>
  </>;
}
