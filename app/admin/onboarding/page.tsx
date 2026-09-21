import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/admin";
import { directoryParams, setupProgress } from "@/lib/adminReadiness";
import { ConsoleHeader, SearchForm, Pager, Empty, Notice, Metric } from "../_components/Console";
export const dynamic="force-dynamic";
export default async function OnboardingMonitorPage({searchParams: searchParamsPromise}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) {
  const searchParams = await searchParamsPromise;

  await requirePlatformAdmin('support');
  const {q,page:requested,pageSize}=directoryParams(searchParams);
  const orgs=await prisma.organization.findMany({where:{slug:{not:"_platform_internal"}},orderBy:[{createdAt:"desc"},{id:"asc"}],select:{id:true,name:true,slug:true,status:true,createdAt:true,website:{select:{publishedAt:true}},_count:{select:{items:true,orders:true}}}});
  const rows=orgs.map(o=>({o,...setupProgress(o)}));
  const activated=rows.filter(r=>r.o._count.items>0&&r.o._count.orders>0).length;
  const outreach=rows.filter(r=>["active","trial"].includes(r.o.status)&&r.percent<75&&Date.now()-r.o.createdAt.getTime()>3*86400000).length;
  const matches=rows.filter(r=>!q||`${r.o.name} ${r.o.slug}`.toLowerCase().includes(q.toLowerCase()));
  const page=Math.min(requested,Math.max(1,Math.ceil(matches.length/pageSize)));
  return <div className="space-y-6">
    <ConsoleHeader eyebrow="Customer success" title="Onboarding monitor">See the next unfinished core step for each rental business. A first order is a usage milestone, not proof of a payment.</ConsoleHeader>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Tenant accounts" value={rows.length} detail="All tenant records; internal platform account excluded"/><Metric label="Inventory + first order" value={activated} detail="Current activation milestone, not a historical conversion rate"/><Metric label="Published storefront record" value={rows.filter(r=>r.o.website?.publishedAt).length} detail="Publication saved; public reachability is not checked"/><Metric label="Suggested outreach" value={outreach} detail="Active/trial accounts below 75% after three days"/></div>
    <Notice>Core progress uses account creation, inventory, storefront publication and a first order. Optional SMS and a custom domain do not reduce this score. <Link href="/admin/integrations" className="font-bold underline">Inspect payments and messaging separately.</Link></Notice>
    <SearchForm q={q}/>
    <div className="grid gap-4 xl:grid-cols-2">{matches.slice((page-1)*pageSize,page*pageSize).map(r=><article key={r.o.id} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex justify-between gap-3"><div><h2 className="text-lg font-black">{r.o.name}</h2><p className="mt-1 text-xs text-slate-500">{r.o.status} · {r.o.createdAt.toISOString().slice(0,10)}</p></div><strong className="text-xl">{r.percent}%</strong></div><div className="my-4 h-2 rounded-full bg-slate-100" role="progressbar" aria-label={`${r.o.name} core setup`} aria-valuenow={r.percent} aria-valuemin={0} aria-valuemax={100}><div className="h-2 rounded-full bg-blue-600" style={{width:`${r.percent}%`}}/></div><ul className="grid gap-2 text-sm sm:grid-cols-2">{r.steps.map(s=><li key={s.label}><span className={s.done?"font-bold text-emerald-700":"text-slate-500"}>{s.done?"Complete":"Pending"}</span> · {s.label}</li>)}</ul><p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm"><b>Next:</b> {r.next}</p><Link href={`/admin/organizations/${r.o.id}/support`} className="mt-4 inline-block rounded-lg border px-3 py-2 text-sm font-bold">Open tenant support</Link></article>)}{!matches.length&&<Empty>No tenants match this search.</Empty>}</div>
    <Pager base="/admin/onboarding" page={page} total={matches.length} pageSize={pageSize} q={q}/>
  </div>;
}
