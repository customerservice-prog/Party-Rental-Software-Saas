import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic="force-dynamic";
export const revalidate=0;

type Alert={id:string;severity:"critical"|"warning"|"info";title:string;detail:string;href?:string};

export default async function PlatformAlertsPage(){
  const now=new Date();
  const d3=new Date(Date.now()-3*86400000);
  const d1=new Date(Date.now()-86400000);

  const [orgs,failedMessages,lockedIps,pastDue]=await Promise.all([
    prisma.organization.findMany({
      where:{slug:{not:"_platform_internal"}},
      select:{id:true,name:true,slug:true,status:true,createdAt:true,automationsLastRunAt:true,stripeAccountId:true,resendApiKey:true,senderEmail:true,twilioAccountSid:true,twilioAuthToken:true,twilioFromNumber:true,website:{select:{publishedAt:true}},_count:{select:{items:true,orders:true}}},
    }),
    prisma.sentMessage.findMany({where:{status:"failed",createdAt:{gte:d1}},select:{id:true,organizationId:true,channel:true,providerError:true,createdAt:true},orderBy:{createdAt:"desc"},take:50}),
    prisma.loginThrottle.findMany({where:{failCount:{gte:5},failExpiresAt:{gte:now}},select:{id:true,ip:true,failCount:true,failExpiresAt:true}}),
    prisma.platformSubscription.findMany({where:{status:{in:["past_due","unpaid","trial_ended"]}},include:{organization:{select:{id:true,name:true}}}}),
  ]);

  const alerts:Alert[]=[];
  for(const s of pastDue)alerts.push({id:"billing-"+s.organizationId,severity:"critical",title:s.organization.name+" billing needs attention",detail:"Platform subscription status: "+s.status.replaceAll("_"," "),href:"/admin/organizations/"+s.organizationId});
  for(const m of failedMessages){
    const org=orgs.find(o=>o.id===m.organizationId);
    alerts.push({id:"msg-"+m.id,severity:"warning",title:(org?.name||"Tenant")+" message delivery failed",detail:m.channel.toUpperCase()+" · "+(m.providerError||"Provider returned a failure."),href:org?"/admin/organizations/"+org.id+"/support":undefined});
  }
  for(const o of orgs){
    const age=Date.now()-o.createdAt.getTime();
    const setupDone=o._count.items>0&&o._count.orders>0;
    if(age>3*86400000&&!setupDone)alerts.push({id:"onboard-"+o.id,severity:"warning",title:o.name+" onboarding is stalled",detail:"Created "+o.createdAt.toLocaleDateString()+" without both inventory and a first order.",href:"/admin/organizations/"+o.id+"/support"});
    if(o.automationsLastRunAt&&o.automationsLastRunAt<d1)alerts.push({id:"auto-"+o.id,severity:"info",title:o.name+" automations appear stale",detail:"Last automation run "+o.automationsLastRunAt.toLocaleString(),href:"/admin/organizations/"+o.id+"/support"});
    if((o.resendApiKey&&!o.senderEmail)||((o.twilioAccountSid||o.twilioAuthToken)&&!(o.twilioAccountSid&&o.twilioAuthToken&&o.twilioFromNumber)))alerts.push({id:"integration-"+o.id,severity:"warning",title:o.name+" has incomplete messaging setup",detail:"One or more provider credentials are only partially configured.",href:"/admin/organizations/"+o.id+"/support"});
  }
  for(const l of lockedIps)alerts.push({id:"ip-"+l.id,severity:"critical",title:"Login abuse lock active",detail:l.ip+" · "+l.failCount+" failures · lock until "+l.failExpiresAt?.toLocaleTimeString(),href:"/admin/security"});

  const critical=alerts.filter(a=>a.severity==="critical").length,warning=alerts.filter(a=>a.severity==="warning").length;
  return <div className="space-y-6">
    <section>
      <div className="text-[10px] font-black uppercase tracking-[.2em] text-blue-600">Platform Support</div>
      <h1 className="mt-1 text-3xl font-black tracking-[-.035em]">Alerts & attention queue</h1>
      <p className="mt-2 text-sm text-slate-500">One place for billing, setup, delivery-provider, automation, and security issues that may need intervention.</p>
    </section>
    <section className="grid gap-3 sm:grid-cols-3"><div className="rounded-2xl border border-rose-200 bg-rose-50 p-5"><div className="text-[9px] font-black uppercase text-rose-500">Critical</div><div className="mt-2 text-3xl font-black text-rose-800">{critical}</div></div><div className="rounded-2xl border border-amber-200 bg-amber-50 p-5"><div className="text-[9px] font-black uppercase text-amber-600">Warnings</div><div className="mt-2 text-3xl font-black text-amber-900">{warning}</div></div><div className="rounded-2xl border border-slate-200 bg-white p-5"><div className="text-[9px] font-black uppercase text-slate-400">Total open signals</div><div className="mt-2 text-3xl font-black">{alerts.length}</div></div></section>
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-4"><h2 className="text-sm font-black">Attention queue</h2></div>
      <div className="divide-y divide-slate-100">{alerts.length?alerts.map(a=><div key={a.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><span className={"mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full "+(a.severity==="critical"?"bg-rose-500":a.severity==="warning"?"bg-amber-500":"bg-blue-500")}/><div><div className="text-sm font-black text-slate-900">{a.title}</div><div className="mt-1 text-xs leading-5 text-slate-500">{a.detail}</div></div></div>{a.href&&<Link href={a.href} className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] font-black text-blue-600">Investigate →</Link>}</div>):<div className="p-12 text-center"><div className="text-sm font-black text-emerald-700">No active platform alerts</div><p className="mt-1 text-xs text-slate-400">No billing, security, onboarding, or provider issues matched the current rules.</p></div>}</div>
    </section>
  </div>;
}
