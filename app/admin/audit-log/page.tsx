import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic="force-dynamic";
export const revalidate=0;

type AuditRow={id:string;organizationId:string|null;action:string;details:string|null;performedBy:string;createdAt:Date};
type OrgRow={id:string;name:string};

function actionTone(action:string){
  const v=action.toLowerCase();
  if(v.includes("suspend")||v.includes("delete")||v.includes("failed")||v.includes("damage"))return "bg-rose-50 text-rose-700";
  if(v.includes("billing")||v.includes("payment")||v.includes("subscription"))return "bg-amber-50 text-amber-700";
  if(v.includes("created")||v.includes("signed")||v.includes("received"))return "bg-emerald-50 text-emerald-700";
  return "bg-blue-50 text-blue-700";
}

export default async function AdminAuditLogPage({searchParams: searchParamsPromise}:{searchParams:Promise<{q?:string;org?:string;actor?:string;from?:string;to?:string}>}){
  const searchParams = await searchParamsPromise;

  const q=searchParams.q?.trim()||"";
  const orgFilter=searchParams.org||"";
  const actor=searchParams.actor?.trim()||"";
  const from=searchParams.from?new Date(searchParams.from+"T00:00:00"):null;
  const to=searchParams.to?new Date(searchParams.to+"T23:59:59.999"):null;
  const where:any={};
  if(orgFilter==="platform")where.organizationId=null;
  else if(orgFilter)where.organizationId=orgFilter;
  if(actor)where.performedBy={contains:actor,mode:"insensitive"};
  if(from||to)where.createdAt={...(from&&!isNaN(from.getTime())?{gte:from}:{}),...(to&&!isNaN(to.getTime())?{lte:to}:{})};
  if(q)where.OR=[
    {action:{contains:q,mode:"insensitive"}},
    {details:{contains:q,mode:"insensitive"}},
    {performedBy:{contains:q,mode:"insensitive"}},
  ];
  const [logs,allOrgs]=await Promise.all([
    prisma.auditLog.findMany({where,orderBy:{createdAt:"desc"},take:500}),
    prisma.organization.findMany({where:{slug:{not:"_platform_internal"}},select:{id:true,name:true},orderBy:{name:"asc"}}),
  ]);
  const typedLogs=logs as AuditRow[];
  const orgs=allOrgs as OrgRow[];
  const orgNameById=new Map(orgs.map(o=>[o.id,o.name]));

  return <div className="space-y-5">
    <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div className="text-[10px] font-black uppercase tracking-[.2em] text-blue-600">Security & Accountability</div>
        <h1 className="mt-1 text-3xl font-black tracking-[-.035em] text-slate-950">Platform audit log</h1>
        <p className="mt-2 text-sm text-slate-500">Recent platform and tenant-sensitive actions, newest first.</p>
      </div>
      <Link href="/admin" className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700 shadow-sm">← Overview</Link>
    </section>

    <form method="get" className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 xl:grid-cols-3">
      <input name="q" defaultValue={q} placeholder="Search action, details, actor…" className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-blue-400"/>
      <select name="org" defaultValue={orgFilter} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"><option value="">All organizations</option><option value="platform">Platform only</option>{orgs.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select>
      <input name="actor" defaultValue={actor} placeholder="Actor" className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"/>
      <input type="date" name="from" defaultValue={searchParams.from||""} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"/>
      <input type="date" name="to" defaultValue={searchParams.to||""} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"/>
      <button className="rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-black text-white">Filter</button>
    </form>

    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,.04)]">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div><h2 className="text-sm font-black text-slate-950">Recent events</h2><p className="mt-0.5 text-[11px] text-slate-400">Showing up to 500 matching records.</p></div>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black text-slate-500">{typedLogs.length}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-[1050px] w-full">
          <thead className="bg-slate-50/80">
            <tr className="text-left text-[9px] font-black uppercase tracking-[.14em] text-slate-400">
              <th className="px-5 py-3">Time</th><th className="px-5 py-3">Action</th><th className="px-5 py-3">Organization</th><th className="px-5 py-3">Details</th><th className="px-5 py-3">Actor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {!typedLogs.length&&<tr><td colSpan={5} className="px-5 py-16 text-center text-sm text-slate-400">No audit activity recorded yet.</td></tr>}
            {typedLogs.map(log=><tr key={log.id} className="align-top hover:bg-slate-50/70">
              <td className="whitespace-nowrap px-5 py-4"><div className="text-xs font-bold text-slate-700">{new Date(log.createdAt).toLocaleDateString()}</div><div className="mt-0.5 text-[10px] text-slate-400">{new Date(log.createdAt).toLocaleTimeString()}</div></td>
              <td className="px-5 py-4"><span className={"inline-flex rounded-lg px-2.5 py-1 text-[10px] font-black "+actionTone(log.action)}>{log.action.replaceAll("_"," ")}</span></td>
              <td className="px-5 py-4 text-xs font-bold text-slate-700">{log.organizationId?(orgNameById.get(log.organizationId)||"Unknown tenant"):"Platform"}</td>
              <td className="max-w-[500px] px-5 py-4 text-xs leading-5 text-slate-500">{log.details||"—"}</td>
              <td className="px-5 py-4 text-xs text-slate-500">{log.performedBy}</td>
            </tr>)}
          </tbody>
        </table>
      </div>
    </section>
  </div>;
}
