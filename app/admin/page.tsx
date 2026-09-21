import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/admin";
import { ConsoleHeader, Metric, Empty } from "./_components/Console";
export const dynamic="force-dynamic";
const money=(n:number)=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(n);
export default async function PlatformOverviewPage(){
  await requirePlatformAdmin();
  const scope={organization:{slug:{not:"_platform_internal"}}};
  const [orgs,orders,customers,users,activity]=await Promise.all([
    prisma.organization.findMany({where:{slug:{not:"_platform_internal"}},orderBy:[{createdAt:"desc"},{id:"asc"}],select:{id:true,name:true,slug:true,status:true,subscription:{select:{status:true}},_count:{select:{orders:true}}}}),
    prisma.order.aggregate({where:{...scope,status:{notIn:["cancelled","canceled"]}},_sum:{totalAmount:true,amountPaid:true},_count:{_all:true}}),
    prisma.customer.count({where:scope}),
    prisma.user.count({where:{...scope,role:{not:"platform_admin"}}}),
    prisma.auditLog.findMany({orderBy:{createdAt:"desc"},take:8,select:{id:true,organizationId:true,action:true,createdAt:true}}),
  ]);
  const name=new Map(orgs.map(o=>[o.id,o.name]));
  const attention=orgs.filter(o=>o.status==="suspended"||["past_due","unpaid","trial_ended"].includes(o.subscription?.status||"")).length;
  return <div className="space-y-6">
    <ConsoleHeader eyebrow="Party Rental CRM" title="Control center">Your tenant accounts, recorded activity and platform operations. Counts include every tenant, not just a capped directory sample.</ConsoleHeader>
    <div className="flex flex-wrap gap-2">{[["/admin/organizations/new","Create tenant"],["/admin/users","Find a tenant user"],["/admin/health","Review system health"]].map(([href,label])=><Link key={href} href={href} className="rounded-xl border bg-white px-4 py-3 text-sm font-bold">{label}</Link>)}</div>
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Tenant organizations" value={orgs.length} detail={`${orgs.filter(o=>o.status==="active").length} active accounts; platform internal account excluded`}/><Metric label="Active subscription records" value={orgs.filter(o=>o.subscription?.status==="active").length} detail={`${attention} account/billing issues. Local active status is not proof of payment.`}/><Metric label="Tenant staff" value={users} detail={`${customers.toLocaleString()} end-customer records`}/><Metric label="Recorded tenant order value" value={money(orders._sum.totalAmount||0)} detail={`${orders._count._all} non-canceled orders; ${money(orders._sum.amountPaid||0)} recorded as paid. Not platform revenue.`}/></section>
    <section className="grid gap-5 xl:grid-cols-[1.3fr_1fr]">
      <div className="rounded-2xl border bg-white p-5"><div className="flex flex-wrap justify-between gap-3"><h2 className="text-lg font-black">Newest tenants</h2><Link href="/admin/organizations" className="text-sm font-bold text-blue-600">All organizations →</Link></div><div className="mt-4 divide-y">{orgs.slice(0,6).map(o=><Link key={o.id} href={`/admin/organizations/${o.id}`} className="flex flex-wrap items-center justify-between gap-3 py-4"><div className="min-w-0"><h3 className="font-bold">{o.name}</h3><p className="mt-1 break-all text-xs text-slate-500">{o.slug}</p></div><p className="text-sm text-slate-600">{o.status} · {o._count.orders} orders</p></Link>)}{!orgs.length&&<Empty>No tenant organizations yet.</Empty>}</div></div>
      <div className="rounded-2xl border bg-white p-5"><h2 className="text-lg font-black">Recent audited activity</h2><div className="mt-4 divide-y">{activity.map(a=><div key={a.id} className="py-3"><p className="break-words text-sm font-bold">{a.action}</p><p className="mt-1 text-xs leading-5 text-slate-500">{a.organizationId?(name.get(a.organizationId)||"Tenant"):"Platform"} · {a.createdAt.toISOString().replace("T"," ").slice(0,19)} UTC</p></div>)}{!activity.length&&<Empty>No audit activity recorded.</Empty>}</div><Link href="/admin/audit-log" className="mt-3 inline-block rounded-lg border px-3 py-2 text-sm font-bold">Search audit history</Link></div>
    </section>
  </div>;
}
