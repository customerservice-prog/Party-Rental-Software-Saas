import { prisma } from "@/lib/prisma";

export const dynamic="force-dynamic";
export const revalidate=0;

function ageMinutes(d:Date){return Math.max(0,Math.round((Date.now()-d.getTime())/60000))}
function pill(ok:boolean){return ok?"bg-emerald-50 text-emerald-700":"bg-rose-50 text-rose-700"}

export default async function PlatformHealthPage(){
  const t0=Date.now();
  await prisma.$queryRawUnsafe("SELECT 1");
  const dbMs=Date.now()-t0;
  const now=new Date();
  const since24=new Date(Date.now()-24*60*60*1000);
  const since7=new Date(Date.now()-7*24*60*60*1000);

  const [failed24,failed7,queued24,blocked24,staleAutomation,loginLocks,orgs]=await Promise.all([
    prisma.sentMessage.count({where:{status:"failed",createdAt:{gte:since24}}}),
    prisma.sentMessage.count({where:{status:"failed",createdAt:{gte:since7}}}),
    prisma.sentMessage.count({where:{status:"queued",createdAt:{gte:since24}}}),
    prisma.blockedBookingAttempt.count({where:{createdAt:{gte:since24}}}),
    prisma.organization.findMany({where:{slug:{not:"_platform_internal"}},select:{id:true,name:true,automationsLastRunAt:true},take:500}),
    prisma.loginThrottle.count({where:{failCount:{gte:5},failExpiresAt:{gte:now}}}),
    prisma.organization.findMany({where:{slug:{not:"_platform_internal"}},select:{id:true,name:true,slug:true,resendApiKey:true,senderEmail:true,twilioAccountSid:true,twilioAuthToken:true,twilioFromNumber:true,stripeAccountId:true,customDomain:true,status:true},orderBy:{name:"asc"}}),
  ]);

  const stale=staleAutomation.filter(o=>!o.automationsLastRunAt||Date.now()-o.automationsLastRunAt.getTime()>24*60*60*1000);
  const integrationIssues=orgs.filter(o=>
    (o.resendApiKey&&!o.senderEmail)||
    (!!o.twilioAccountSid!==!!o.twilioAuthToken)||
    ((o.twilioAccountSid||o.twilioAuthToken)&&!o.twilioFromNumber)
  );

  const release=process.env.RAILWAY_DEPLOYMENT_ID||process.env.RAILWAY_GIT_COMMIT_SHA||"Current production release";

  return <div className="space-y-6">
    <section>
      <div className="text-[10px] font-black uppercase tracking-[.2em] text-blue-600">Operations</div>
      <h1 className="mt-1 text-3xl font-black tracking-[-.035em]">System health</h1>
      <p className="mt-2 text-sm text-slate-500">Platform runtime, database, messaging, automation, authentication, and tenant integration health.</p>
    </section>

    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {[
        ["Database","Online",dbMs+" ms query",dbMs<750],
        ["Messaging",failed24===0?"Healthy":failed24+" failed",failed7+" failures / 7d",failed24===0],
        ["Automations",stale.length===0?"Healthy":stale.length+" stale",stale.length?"No run in 24h":"All tenants current",stale.length===0],
        ["Authentication",loginLocks===0?"Healthy":loginLocks+" locked IPs",blocked24+" blocked bookings / 24h",loginLocks===0],
      ].map(([label,value,sub,ok])=><div key={String(label)} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div className="text-[9px] font-black uppercase tracking-[.14em] text-slate-400">{label}</div><span className={"rounded-full px-2 py-1 text-[9px] font-black uppercase "+pill(Boolean(ok))}>{ok?"OK":"Attention"}</span></div><div className="mt-2 text-2xl font-black">{value}</div><div className="mt-1 text-[11px] text-slate-400">{sub}</div></div>)}
    </section>

    <section className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4"><h2 className="text-sm font-black">Platform services</h2><p className="mt-0.5 text-[11px] text-slate-400">Current production runtime checks.</p></div>
        <div className="divide-y divide-slate-100">
          {[
            ["Web application","Running","Next.js application responded during this request",true],
            ["PostgreSQL","Connected",dbMs+" ms database probe",dbMs<750],
            ["Outbound email",failed24?"Degraded":"Operational",failed24?failed24+" failed messages in 24 hours":"No failed sends in 24 hours",failed24===0],
            ["SMS / messaging queue",queued24+" queued",queued24?"Some messages are waiting for provider configuration or retry":"No recent queued messages",queued24===0],
            ["Production release",release,"Railway deployment / commit identifier",true],
          ].map(([name,status,detail,ok])=><div key={String(name)} className="grid gap-2 px-5 py-4 sm:grid-cols-[1fr_160px_2fr] sm:items-center"><div className="text-sm font-black">{name}</div><div><span className={"rounded-full px-2.5 py-1 text-[9px] font-black uppercase "+pill(Boolean(ok))}>{status}</span></div><div className="text-xs text-slate-500">{detail}</div></div>)}
        </div>
      </div>

      <div className="space-y-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between"><h2 className="text-sm font-black">Integration inconsistencies</h2><span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-black text-slate-600">{integrationIssues.length}</span></div>
          <div className="mt-4 space-y-2">{integrationIssues.length?integrationIssues.slice(0,10).map(o=><div key={o.id} className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2"><div className="text-xs font-black text-amber-900">{o.name}</div><div className="mt-0.5 text-[10px] text-amber-700">Provider credentials are partially configured.</div></div>):<div className="rounded-xl bg-emerald-50 p-4 text-xs font-bold text-emerald-700">No incomplete provider configurations detected.</div>}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-black">Automation watch</h2>
          <div className="mt-4 space-y-2">{stale.length?stale.slice(0,10).map(o=><div key={o.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs"><b>{o.name}</b><span className="text-slate-400">{o.automationsLastRunAt?ageMinutes(o.automationsLastRunAt)+"m ago":"never"}</span></div>):<div className="rounded-xl bg-emerald-50 p-4 text-xs font-bold text-emerald-700">No stale tenant automation runners.</div>}</div>
        </div>
      </div>
    </section>
  </div>;
}
