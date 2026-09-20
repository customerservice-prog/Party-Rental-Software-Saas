import { prisma } from "@/lib/prisma";

export const dynamic="force-dynamic";
export const revalidate=0;

function pct(a:number,b:number){return b?Math.round(a/b*100):0}
function money(n:number){return new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(n)}

export default async function PlatformAnalyticsPage(){
  const now=new Date();
  const d30=new Date(Date.now()-30*86400000);
  const d90=new Date(Date.now()-90*86400000);
  const [orgs,orders30,orders90,customers30,messages30,activeUsers30]=await Promise.all([
    prisma.organization.findMany({
      where:{slug:{not:"_platform_internal"}},
      select:{id:true,name:true,status:true,createdAt:true,subscription:{select:{status:true,planTier:true}},_count:{select:{items:true,orders:true,users:true}}},
      orderBy:{createdAt:"asc"},
    }),
    prisma.order.aggregate({where:{createdAt:{gte:d30},organization:{slug:{not:"_platform_internal"}},status:{notIn:["cancelled","canceled"]}},_sum:{totalAmount:true},_count:{_all:true}}),
    prisma.order.count({where:{createdAt:{gte:d90},organization:{slug:{not:"_platform_internal"}},status:{notIn:["cancelled","canceled"]}}}),
    prisma.customer.count({where:{createdAt:{gte:d30},organization:{slug:{not:"_platform_internal"}}}}),
    prisma.sentMessage.count({where:{createdAt:{gte:d30},organization:{slug:{not:"_platform_internal"}}}}),
    prisma.user.count({where:{lastLoginAt:{gte:d30},organization:{slug:{not:"_platform_internal"}},role:{not:"platform_admin"}}}),
  ]);

  const paid=orgs.filter(o=>o.subscription?.status==="active").length;
  const activated=orgs.filter(o=>o._count.items>0&&o._count.orders>0).length;
  const trial=orgs.filter(o=>o.subscription?.status==="trialing").length;
  const canceled=orgs.filter(o=>o.subscription?.status==="canceled").length;
  const new30=orgs.filter(o=>o.createdAt>=d30).length;

  const months:Array<{label:string;count:number}>=[];
  for(let i=5;i>=0;i--){
    const start=new Date(now.getFullYear(),now.getMonth()-i,1);
    const end=new Date(now.getFullYear(),now.getMonth()-i+1,1);
    months.push({label:start.toLocaleDateString("en-US",{month:"short"}),count:orgs.filter(o=>o.createdAt>=start&&o.createdAt<end).length});
  }
  const maxMonth=Math.max(1,...months.map(m=>m.count));

  return <div className="space-y-6">
    <section>
      <div className="text-[10px] font-black uppercase tracking-[.2em] text-blue-600">Growth Intelligence</div>
      <h1 className="mt-1 text-3xl font-black tracking-[-.035em]">Platform analytics</h1>
      <p className="mt-2 text-sm text-slate-500">Growth, activation, paid conversion, tenant usage, and marketplace activity across Party Rental CRM.</p>
    </section>

    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {[
        ["New tenants / 30d",new30,"Recent growth"],
        ["Activation rate",pct(activated,orgs.length)+"%",activated+" activated"],
        ["Paid conversion",pct(paid,orgs.length)+"%",paid+" active paid"],
        ["30d tenant GMV",money(orders30._sum.totalAmount||0),(orders30._count as any)?._all+" orders"],
        ["30d active staff",activeUsers30,"Signed in"],
      ].map(([label,value,sub])=><div key={String(label)} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="text-[9px] font-black uppercase tracking-[.14em] text-slate-400">{label}</div><div className="mt-2 text-3xl font-black tracking-tight">{value}</div><div className="mt-1 text-[11px] text-slate-400">{sub}</div></div>)}
    </section>

    <section className="grid gap-5 xl:grid-cols-[1fr_1fr]">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div><h2 className="text-sm font-black">Tenant signups</h2><p className="mt-0.5 text-[11px] text-slate-400">Last six calendar months</p></div>
        <div className="mt-6 flex h-52 items-end gap-3">
          {months.map(m=><div key={m.label} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-2"><div className="text-xs font-black text-slate-700">{m.count}</div><div className="w-full rounded-t-lg bg-blue-500/90" style={{height:Math.max(8,m.count/maxMonth*150)+"px"}}/><div className="text-[10px] font-bold text-slate-400">{m.label}</div></div>)}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-black">Lifecycle funnel</h2>
        <p className="mt-0.5 text-[11px] text-slate-400">Current tenant cohort</p>
        <div className="mt-5 space-y-4">
          {[
            ["Accounts created",orgs.length,100,"bg-slate-700"],
            ["Activated",activated,pct(activated,orgs.length),"bg-blue-500"],
            ["Paid",paid,pct(paid,orgs.length),"bg-emerald-500"],
            ["Trialing",trial,pct(trial,orgs.length),"bg-amber-500"],
            ["Canceled",canceled,pct(canceled,orgs.length),"bg-rose-500"],
          ].map(([label,count,percent,color])=><div key={String(label)}><div className="mb-1.5 flex justify-between text-xs"><b>{label}</b><span className="text-slate-400">{count} · {percent}%</span></div><div className="h-2.5 rounded-full bg-slate-100"><div className={"h-2.5 rounded-full "+color} style={{width:percent+"%"}}/></div></div>)}
        </div>
      </div>
    </section>

    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5"><div className="text-[9px] font-black uppercase text-slate-400">Orders / 90d</div><div className="mt-2 text-2xl font-black">{orders90.toLocaleString()}</div></div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5"><div className="text-[9px] font-black uppercase text-slate-400">New end customers / 30d</div><div className="mt-2 text-2xl font-black">{customers30.toLocaleString()}</div></div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5"><div className="text-[9px] font-black uppercase text-slate-400">Messages / 30d</div><div className="mt-2 text-2xl font-black">{messages30.toLocaleString()}</div></div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5"><div className="text-[9px] font-black uppercase text-slate-400">Tenant accounts</div><div className="mt-2 text-2xl font-black">{orgs.length.toLocaleString()}</div></div>
    </section>
  </div>;
}
