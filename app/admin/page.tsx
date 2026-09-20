import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getPlan } from "@/lib/plans";

export const dynamic="force-dynamic";
export const revalidate=0;

type OrgRow={
  id:string;name:string;slug:string;planTier:string;status:string;createdAt:Date;trialEndsAt:Date|null;
  subscription:{status:string;planTier:string;billingInterval:string}|null;
  _count:{users:number;customers:number;orders:number};
};
type ActivityRow={id:string;organizationId:string|null;action:string;performedBy:string;createdAt:Date};

function money(n:number){return new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(n)}
function planLabel(code:string){return getPlan(code).name}
function initials(name:string){return name.split(/\s+/).slice(0,2).map(x=>x[0]).join("").toUpperCase()||"PR"}

export default async function PlatformOverviewPage(){
  const [organizationsRaw,orderAgg,customerCount,userCount,recentActivity]=await Promise.all([
    prisma.organization.findMany({
      where:{slug:{not:"_platform_internal"}},
      orderBy:{createdAt:"desc"},
      take:250,
      include:{
        subscription:{select:{status:true,planTier:true,billingInterval:true}},
        _count:{select:{users:true,customers:true,orders:true}},
      },
    }),
    prisma.order.aggregate({
      where:{organization:{slug:{not:"_platform_internal"}},status:{notIn:["cancelled","canceled"]}},
      _sum:{totalAmount:true,amountPaid:true},
      _count:{_all:true},
    }),
    prisma.customer.count({where:{organization:{slug:{not:"_platform_internal"}}}}),
    prisma.user.count({where:{organization:{slug:{not:"_platform_internal"}},role:{not:"platform_admin"}}}),
    prisma.auditLog.findMany({orderBy:{createdAt:"desc"},take:8}),
  ]);

  const organizations=organizationsRaw as OrgRow[];
  const active=organizations.filter(o=>o.status==="active").length;
  const trials=organizations.filter(o=>o.status==="trial"||o.subscription?.status==="trialing").length;
  const attention=organizations.filter(o=>o.status==="suspended"||["past_due","unpaid","trial_ended","canceled"].includes(o.subscription?.status||"")).length;
  const paid=organizations.filter(o=>o.subscription?.status==="active").length;
  const recent=organizations.slice(0,6);
  const orgName=new Map(organizations.map(o=>[o.id,o.name]));

  return <div className="space-y-6">
    <section className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
      <div>
        <div className="text-[10px] font-black uppercase tracking-[.2em] text-blue-600">Platform Overview</div>
        <h1 className="mt-1 text-3xl font-black tracking-[-.035em] text-slate-950 sm:text-4xl">Control center</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Monitor Party Rental CRM at the platform level: tenant health, account growth, usage, and recent administrative activity.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link href="/admin/organizations" className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700 shadow-sm hover:border-slate-300">View all tenants</Link>
        <Link href="/admin/audit-log" className="rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-black text-white shadow-sm">Platform audit log</Link>
      </div>
    </section>

    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {[
        {label:"Tenant organizations",value:String(organizations.length),sub:`${active} active · ${trials} trial`,tone:"blue"},
        {label:"Paid subscriptions",value:String(paid),sub:attention?`${attention} need attention`:"No billing alerts",tone:attention?"amber":"emerald"},
        {label:"Tenant staff",value:userCount.toLocaleString(),sub:`${customerCount.toLocaleString()} end customers`,tone:"violet"},
        {label:"Tenant order volume",value:money(orderAgg._sum.totalAmount||0),sub:`${(orderAgg._count as any)?._all||0} orders · ${money(orderAgg._sum.amountPaid||0)} collected`,tone:"slate"},
      ].map(card=><div key={card.label} className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,.04)]">
        <div className={"absolute inset-x-0 top-0 h-[3px] "+(card.tone==="blue"?"bg-blue-500":card.tone==="amber"?"bg-amber-500":card.tone==="emerald"?"bg-emerald-500":card.tone==="violet"?"bg-violet-500":"bg-slate-700")}/>
        <div className="text-[10px] font-black uppercase tracking-[.14em] text-slate-400">{card.label}</div>
        <div className="mt-2 text-3xl font-black tracking-[-.04em] text-slate-950">{card.value}</div>
        <div className="mt-2 text-xs text-slate-500">{card.sub}</div>
      </div>)}
    </section>

    <section className="grid gap-5 xl:grid-cols-[1.35fr_.65fr]">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,.04)]">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div><h2 className="text-sm font-black text-slate-950">Newest organizations</h2><p className="mt-0.5 text-[11px] text-slate-400">Most recently created tenant accounts.</p></div>
          <Link href="/admin/organizations" className="text-xs font-black text-blue-600 hover:text-blue-700">All organizations →</Link>
        </div>
        <div className="divide-y divide-slate-100">
          {!recent.length&&<div className="p-10 text-center text-sm text-slate-400">No tenant organizations yet.</div>}
          {recent.map(org=><Link key={org.id} href={`/admin/organizations/${org.id}`} className="grid gap-3 px-5 py-4 transition hover:bg-slate-50 sm:grid-cols-[minmax(0,1fr)_110px_110px_90px] sm:items-center">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-[11px] font-black text-slate-600">{initials(org.name)}</div>
              <div className="min-w-0"><div className="truncate text-sm font-black text-slate-900">{org.name}</div><div className="mt-0.5 truncate text-[11px] text-slate-400">{org.slug}.partyrentalcrm.com</div></div>
            </div>
            <div><div className="text-[9px] font-black uppercase text-slate-400">Plan</div><div className="mt-1 text-xs font-bold text-slate-700">{planLabel(org.subscription?.planTier||org.planTier)}</div></div>
            <div><div className="text-[9px] font-black uppercase text-slate-400">Usage</div><div className="mt-1 text-xs font-bold text-slate-700">{org._count.orders} orders</div></div>
            <div className="sm:text-right"><span className={"inline-flex rounded-full px-2.5 py-1 text-[9px] font-black uppercase "+(org.status==="active"?"bg-emerald-50 text-emerald-700":org.status==="suspended"?"bg-rose-50 text-rose-700":"bg-amber-50 text-amber-700")}>{org.status}</span></div>
          </Link>)}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,.04)]">
        <div className="border-b border-slate-100 px-5 py-4"><h2 className="text-sm font-black text-slate-950">Recent platform activity</h2><p className="mt-0.5 text-[11px] text-slate-400">Latest sensitive/admin events.</p></div>
        <div className="divide-y divide-slate-100">
          {!recentActivity.length&&<div className="p-8 text-center text-xs text-slate-400">No audit activity yet.</div>}
          {(recentActivity as ActivityRow[]).map(log=><div key={log.id} className="px-5 py-3.5">
            <div className="flex items-start gap-3">
              <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-500"/>
              <div className="min-w-0"><div className="truncate text-xs font-bold text-slate-700">{log.action}</div><div className="mt-1 text-[10px] text-slate-400">{log.organizationId?(orgName.get(log.organizationId)||"Tenant"):"Platform"} · {new Date(log.createdAt).toLocaleString()}</div></div>
            </div>
          </div>)}
        </div>
        <div className="border-t border-slate-100 p-3"><Link href="/admin/audit-log" className="block rounded-lg px-3 py-2 text-center text-xs font-black text-slate-600 hover:bg-slate-50">View complete audit log</Link></div>
      </div>
    </section>
  </div>;
}
