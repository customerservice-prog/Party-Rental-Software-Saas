import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/admin";
import { activeLoginLockWhere } from "@/lib/loginPolicy";
import { automationState } from "@/lib/adminReadiness";
import { ConsoleHeader, Metric, Notice, Empty } from "../_components/Console";
export const dynamic="force-dynamic";
type Probe<T>={ok:true;value:T}|{ok:false};
async function probe<T>(run:()=>Promise<T>):Promise<Probe<T>>{try{return {ok:true,value:await run()}}catch{return {ok:false}}}
export default async function PlatformHealthPage() {
  await requirePlatformAdmin();
  const checkedAt=new Date(),since=new Date(checkedAt.getTime()-86400000);
  const scope={organization:{slug:{not:"_platform_internal"}}};
  const [database,failures,queued,locks,automations]=await Promise.all([
    probe(async()=>{const start=Date.now();await prisma.$queryRaw`SELECT 1`;return Date.now()-start}),
    probe(()=>prisma.sentMessage.groupBy({by:["channel","status"],where:{...scope,direction:"outbound",createdAt:{gte:since}},_count:{_all:true}})),
    probe(()=>prisma.sentMessage.count({where:{...scope,direction:"outbound",status:"queued",createdAt:{lt:new Date(checkedAt.getTime()-3600000)}}})),
    probe(()=>prisma.loginThrottle.count({where:activeLoginLockWhere(checkedAt)})),
    probe(()=>prisma.organization.findMany({where:{slug:{not:"_platform_internal"}},select:{id:true,name:true,status:true,autoConfirmationEnabled:true,autoReminderEnabled:true,autoBalanceReminderEnabled:true,automationsLastRunAt:true}})),
  ]);
  const rows=automations.ok?automations.value.map(o=>({...o,state:automationState(o,checkedAt.getTime())})):[];
  const attention=rows.filter(o=>!["disabled","recent run"].includes(o.state));
  const failed=failures.ok?failures.value.filter(r=>r.status==="failed").reduce((n,r)=>n+r._count._all,0):null;
  const release=process.env.RAILWAY_GIT_COMMIT_SHA||process.env.RAILWAY_DEPLOYMENT_ID||"Not supplied by runtime";
  return <div className="space-y-6">
    <ConsoleHeader eyebrow="Operations" title="System health">Recorded signals as of {checkedAt.toISOString()}. A missing signal is not shown as healthy.</ConsoleHeader>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Database probe" value={database.ok?`${database.value} ms`:"Check failed"} detail={database.ok?"SELECT 1 completed during this request":"Database readiness could not be verified"}/><Metric label="Failed outbound records / 24h" value={failed??"Unavailable"} detail="Zero failures does not establish provider availability"/><Metric label="Queued longer than one hour" value={queued.ok?queued.value:"Unavailable"} detail="May require provider configuration; not proof a retry worker exists"/><Metric label="Current login locks" value={locks.ok?locks.value:"Unavailable"} detail="Actual sign-in thresholds; a lock alone is not a service outage"/></div>
    <Notice>No synthetic payment or message is sent by this page. Scheduled-job execution, backup restoration, webhook retries and public checkout reachability are not established by these counters. <Link href="/admin/integrations" className="font-bold underline">Run read-only provider checks.</Link></Notice>
    <section className="grid gap-5 xl:grid-cols-2">
      <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5"><h2 className="text-lg font-black">Runtime & configuration</h2><dl className="mt-4 space-y-4 text-sm">{[["Web application","This page rendered; other routes are not tested"],["Release",release],["Stripe platform",process.env.STRIPE_SECRET_KEY?"Credential present · provider not checked":"Credential absent"],["Platform subscription webhook",process.env.STRIPE_PLATFORM_WEBHOOK_SECRET?"Signing secret present · recent delivery not verified":"Signing secret absent"],["Cron authentication",process.env.CRON_SECRET?"Secret present · scheduler not verified":"No CRON_SECRET detected · scheduler not verified"]].map(([label,value])=><div key={label}><dt className="font-bold text-slate-700">{label}</dt><dd className="mt-1 break-all text-slate-500">{value}</dd></div>)}</dl></div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="text-lg font-black">Outbound message records / 24h</h2><p className="mt-2 text-sm leading-6 text-slate-500">Statuses come from application records; provider acceptance is not inbox delivery.</p><div className="mt-4 space-y-2">{failures.ok?failures.value.length?failures.value.map(r=><div key={`${r.channel}-${r.status}`} className="flex justify-between gap-3 rounded-lg bg-slate-50 p-3 text-sm"><span>{r.channel} · {r.status}</span><strong>{r._count._all}</strong></div>):<Empty>No outbound activity recorded in this period. Delivery remains unverified.</Empty>:<Notice>Message records could not be loaded.</Notice>}</div></div>
    </section>
    <section className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="text-lg font-black">Automation heartbeat review</h2><p className="mt-2 text-sm leading-6 text-slate-500">Only active/trial tenants with at least one enabled automation are assessed. A recent recorded run does not establish that future scheduled runs will occur.</p>{automations.ok?<><p className="mt-3 text-sm">{attention.length} need review · {rows.filter(r=>r.state==="recent run").length} have a recent run · {rows.filter(r=>r.state==="disabled").length} excluded (disabled/inactive).</p><div className="mt-4 grid gap-3 sm:grid-cols-2">{attention.slice(0,30).map(o=><Link href={`/admin/organizations/${o.id}/support`} key={o.id} className="rounded-xl border border-amber-200 bg-amber-50 p-3"><b className="text-sm">{o.name}</b><p className="mt-1 text-xs">{o.state} · {o.automationsLastRunAt?.toISOString()||"No heartbeat recorded"}</p></Link>)}</div>{attention.length>30&&<p className="mt-3 text-xs text-slate-500">Showing the first 30 of {attention.length} accounts needing review.</p>}</>:<Notice>Automation records could not be loaded.</Notice>}</section>
  </div>;
}
