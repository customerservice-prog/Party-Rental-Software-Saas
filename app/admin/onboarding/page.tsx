import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic="force-dynamic";
export const revalidate=0;

type OrgRow={
  id:string;name:string;slug:string;status:string;createdAt:Date;contactEmail:string|null;stripeAccountId:string|null;customDomain:string|null;
  resendApiKey:string|null;senderEmail:string|null;twilioAccountSid:string|null;twilioAuthToken:string|null;twilioFromNumber:string|null;
  website:{publishedAt:Date|null}|null;
  _count:{items:number;orders:number;customers:number;users:number;pages:number};
};

function score(o:OrgRow){
  const steps=[
    {key:"account",label:"Account created",done:true},
    {key:"inventory",label:"Inventory added",done:o._count.items>0},
    {key:"website",label:"Storefront published",done:!!o.website?.publishedAt},
    {key:"order",label:"First order",done:o._count.orders>0},
    {key:"payments",label:"Payments connected",done:!!o.stripeAccountId},
    {key:"email",label:"Email connected",done:!!(o.resendApiKey&&o.senderEmail)},
    {key:"sms",label:"SMS connected",done:!!(o.twilioAccountSid&&o.twilioAuthToken&&o.twilioFromNumber)},
    {key:"domain",label:"Custom domain",done:!!o.customDomain},
  ];
  return {steps,done:steps.filter(s=>s.done).length,pct:Math.round(steps.filter(s=>s.done).length/steps.length*100)};
}

export default async function OnboardingMonitorPage(){
  const orgsRaw=await prisma.organization.findMany({
    where:{slug:{not:"_platform_internal"}},
    orderBy:{createdAt:"desc"},
    include:{website:{select:{publishedAt:true}},_count:{select:{items:true,orders:true,customers:true,users:true,pages:true}}},
  });
  const orgs=orgsRaw as OrgRow[];
  const rows=orgs.map(o=>({o,...score(o)}));
  const activated=rows.filter(r=>r.o._count.items>0&&r.o._count.orders>0).length;
  const paymentReady=rows.filter(r=>!!r.o.stripeAccountId).length;
  const storefrontReady=rows.filter(r=>!!r.o.website?.publishedAt).length;
  const stuck=rows.filter(r=>r.pct<50&&Date.now()-r.o.createdAt.getTime()>3*86400000);

  return <div className="space-y-6">
    <section>
      <div className="text-[10px] font-black uppercase tracking-[.2em] text-blue-600">Customer Success</div>
      <h1 className="mt-1 text-3xl font-black tracking-[-.035em]">Onboarding & integrations</h1>
      <p className="mt-2 text-sm text-slate-500">See exactly where each tenant is in setup and which connections are still missing.</p>
    </section>

    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {[
        ["Activated",activated,orgs.length?Math.round(activated/orgs.length*100)+"% of tenants":"—","emerald"],
        ["Storefront live",storefrontReady,orgs.length?Math.round(storefrontReady/orgs.length*100)+"%":"—","blue"],
        ["Payments ready",paymentReady,orgs.length?Math.round(paymentReady/orgs.length*100)+"%":"—","violet"],
        ["Needs outreach",stuck.length,"under 50% after 3 days","amber"],
      ].map(([label,value,sub,tone])=><div key={String(label)} className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className={"absolute inset-x-0 top-0 h-[3px] "+(tone==="emerald"?"bg-emerald-500":tone==="blue"?"bg-blue-500":tone==="violet"?"bg-violet-500":"bg-amber-500")}/><div className="text-[9px] font-black uppercase tracking-[.14em] text-slate-400">{label}</div><div className="mt-2 text-3xl font-black">{value}</div><div className="mt-1 text-[11px] text-slate-400">{sub}</div></div>)}
    </section>

    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-4"><h2 className="text-sm font-black">Tenant setup progress</h2><p className="mt-0.5 text-[11px] text-slate-400">Completion is based on real configured data, not a manual checklist.</p></div>
      <div className="overflow-x-auto">
        <table className="min-w-[1150px] w-full">
          <thead className="bg-slate-50/80"><tr className="text-left text-[9px] font-black uppercase tracking-[.14em] text-slate-400"><th className="px-5 py-3">Tenant</th><th className="px-5 py-3">Progress</th><th className="px-5 py-3">Inventory</th><th className="px-5 py-3">Storefront</th><th className="px-5 py-3">First order</th><th className="px-5 py-3">Stripe</th><th className="px-5 py-3">Email</th><th className="px-5 py-3">SMS</th><th className="px-5 py-3">Domain</th><th className="px-5 py-3"></th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map(({o,pct})=>{
              const yes=<span className="text-emerald-600">●</span>,no=<span className="text-slate-300">○</span>;
              return <tr key={o.id} className="hover:bg-slate-50/60">
                <td className="px-5 py-4"><div className="text-sm font-black">{o.name}</div><div className="text-[10px] text-slate-400">{o.slug}</div></td>
                <td className="px-5 py-4"><div className="w-28"><div className="mb-1 flex justify-between text-[10px]"><b>{pct}%</b></div><div className="h-1.5 rounded-full bg-slate-100"><div className={"h-1.5 rounded-full "+(pct>=75?"bg-emerald-500":pct>=50?"bg-blue-500":"bg-amber-500")} style={{width:pct+"%"}}/></div></div></td>
                <td className="px-5 py-4 text-center">{o._count.items>0?yes:no}</td>
                <td className="px-5 py-4 text-center">{o.website?.publishedAt?yes:no}</td>
                <td className="px-5 py-4 text-center">{o._count.orders>0?yes:no}</td>
                <td className="px-5 py-4 text-center">{o.stripeAccountId?yes:no}</td>
                <td className="px-5 py-4 text-center">{o.resendApiKey&&o.senderEmail?yes:no}</td>
                <td className="px-5 py-4 text-center">{o.twilioAccountSid&&o.twilioAuthToken&&o.twilioFromNumber?yes:no}</td>
                <td className="px-5 py-4 text-center">{o.customDomain?yes:no}</td>
                <td className="px-5 py-4 text-right"><Link href={"/admin/organizations/"+o.id} className="text-[10px] font-black text-blue-600">Open →</Link></td>
              </tr>
            })}
          </tbody>
        </table>
      </div>
    </section>

    {stuck.length>0&&<section className="rounded-2xl border border-amber-200 bg-amber-50 p-5"><div className="text-[10px] font-black uppercase tracking-wide text-amber-700">Suggested outreach</div><div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{stuck.map(r=><Link key={r.o.id} href={"/admin/organizations/"+r.o.id} className="rounded-xl bg-white/80 p-3"><div className="text-xs font-black text-amber-950">{r.o.name}</div><div className="mt-1 text-[10px] text-amber-700">{r.pct}% setup complete · created {r.o.createdAt.toLocaleDateString()}</div></Link>)}</div></section>}
  </div>;
}
