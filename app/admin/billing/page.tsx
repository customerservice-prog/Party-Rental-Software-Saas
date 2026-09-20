import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getPlan } from "@/lib/plans";

export const dynamic="force-dynamic";
export const revalidate=0;

type SubRow={organizationId:string;planTier:string;status:string;billingInterval:string;currentPeriodEnd:Date|null;pastDueSince:Date|null;foundingCustomer:boolean;organization:{id:string;name:string;slug:string;status:string;trialEndsAt:Date|null;createdAt:Date}};

function money(n:number){return new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(n)}
function monthlyValue(sub:SubRow){
  const p=getPlan(sub.planTier);
  if(p.isCustomPricing)return 0;
  return sub.billingInterval==="annual"?(p.annualMonthlyPrice||0):(p.monthlyPrice||0);
}

export default async function PlatformBillingPage(){
  const subsRaw=await prisma.platformSubscription.findMany({
    where:{organization:{slug:{not:"_platform_internal"}}},
    include:{organization:{select:{id:true,name:true,slug:true,status:true,trialEndsAt:true,createdAt:true}}},
    orderBy:{updatedAt:"desc"},
  });
  const subs=subsRaw as SubRow[];
  const active=subs.filter(s=>s.status==="active");
  const trials=subs.filter(s=>s.status==="trialing");
  const pastDue=subs.filter(s=>["past_due","unpaid","trial_ended"].includes(s.status));
  const canceled=subs.filter(s=>s.status==="canceled");
  const mrr=active.reduce((sum,s)=>sum+monthlyValue(s),0);
  const now=Date.now(),seven=7*86400000;
  const endingTrials=trials.filter(s=>s.organization.trialEndsAt&&s.organization.trialEndsAt.getTime()>=now&&s.organization.trialEndsAt.getTime()<=now+seven);

  const planCounts=new Map<string,number>();
  for(const s of subs)planCounts.set(s.planTier,(planCounts.get(s.planTier)||0)+1);

  return <div className="space-y-6">
    <section>
      <div className="text-[10px] font-black uppercase tracking-[.2em] text-blue-600">Platform Revenue</div>
      <h1 className="mt-1 text-3xl font-black tracking-[-.035em]">Billing & subscriptions</h1>
      <p className="mt-2 text-sm text-slate-500">Subscription health for rental companies paying Party Rental CRM. Tenant customer payments are intentionally separate.</p>
    </section>

    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {[
        ["MRR",money(mrr),active.length+" paid tenants","blue"],
        ["ARR",money(mrr*12),"run-rate","violet"],
        ["Trials",String(trials.length),endingTrials.length+" ending in 7 days","amber"],
        ["Past due",String(pastDue.length),"needs attention",pastDue.length?"rose":"emerald"],
        ["Canceled",String(canceled.length),"subscription records","slate"],
      ].map(([label,value,sub,tone])=><div key={String(label)} className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className={"absolute inset-x-0 top-0 h-[3px] "+(tone==="blue"?"bg-blue-500":tone==="violet"?"bg-violet-500":tone==="amber"?"bg-amber-500":tone==="rose"?"bg-rose-500":tone==="emerald"?"bg-emerald-500":"bg-slate-600")}/><div className="text-[9px] font-black uppercase tracking-[.14em] text-slate-400">{label}</div><div className="mt-2 text-3xl font-black tracking-tight">{value}</div><div className="mt-1 text-[11px] text-slate-400">{sub}</div></div>)}
    </section>

    <section className="grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4"><h2 className="text-sm font-black">Subscription ledger</h2><p className="mt-0.5 text-[11px] text-slate-400">Current platform subscription state by tenant.</p></div>
        <div className="overflow-x-auto">
          <table className="min-w-[900px] w-full">
            <thead className="bg-slate-50/80"><tr className="text-left text-[9px] font-black uppercase tracking-[.14em] text-slate-400"><th className="px-5 py-3">Tenant</th><th className="px-5 py-3">Plan</th><th className="px-5 py-3">Billing</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Monthly value</th><th className="px-5 py-3">Period / trial end</th><th className="px-5 py-3"></th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {subs.map(s=><tr key={s.organizationId} className="hover:bg-slate-50/70">
                <td className="px-5 py-4"><div className="text-sm font-black">{s.organization.name}</div><div className="mt-0.5 text-[10px] text-slate-400">{s.organization.slug}</div></td>
                <td className="px-5 py-4 text-xs font-bold">{getPlan(s.planTier).name}{s.foundingCustomer?<span className="ml-2 rounded bg-violet-50 px-1.5 py-0.5 text-[9px] font-black text-violet-700">FOUNDING</span>:null}</td>
                <td className="px-5 py-4 text-xs capitalize text-slate-500">{s.billingInterval}</td>
                <td className="px-5 py-4"><span className={"rounded-full px-2.5 py-1 text-[9px] font-black uppercase "+(s.status==="active"?"bg-emerald-50 text-emerald-700":s.status==="trialing"?"bg-amber-50 text-amber-700":s.status==="canceled"?"bg-slate-100 text-slate-600":"bg-rose-50 text-rose-700")}>{s.status.replaceAll("_"," ")}</span></td>
                <td className="px-5 py-4 text-xs font-black">{money(monthlyValue(s))}</td>
                <td className="px-5 py-4 text-xs text-slate-500">{(s.currentPeriodEnd||s.organization.trialEndsAt)?.toLocaleDateString()||"—"}</td>
                <td className="px-5 py-4 text-right"><Link href={"/admin/organizations/"+s.organizationId} className="text-[10px] font-black text-blue-600">Manage →</Link></td>
              </tr>)}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-black">Plan distribution</h2>
          <div className="mt-4 space-y-3">{["starter","growth","pro","enterprise"].map(code=>{const n=planCounts.get(code)||0;const pct=subs.length?Math.round(n/subs.length*100):0;return <div key={code}><div className="mb-1 flex justify-between text-xs"><span className="font-bold">{getPlan(code).name}</span><span className="text-slate-400">{n} · {pct}%</span></div><div className="h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-blue-500" style={{width:pct+"%"}}/></div></div>})}</div>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <div className="text-[10px] font-black uppercase tracking-wide text-amber-700">Trials ending soon</div>
          <div className="mt-3 space-y-2">{endingTrials.length?endingTrials.map(s=><Link key={s.organizationId} href={"/admin/organizations/"+s.organizationId} className="flex items-center justify-between rounded-xl bg-white/70 px-3 py-2 text-xs"><b>{s.organization.name}</b><span className="text-amber-700">{s.organization.trialEndsAt?.toLocaleDateString()}</span></Link>):<p className="text-xs text-amber-800">No trials end in the next 7 days.</p>}</div>
        </div>
      </div>
    </section>
  </div>;
}
