import { prisma } from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/admin";
import { ConsoleHeader, Metric, Notice } from "../_components/Console";
export const dynamic="force-dynamic";
const pct=(n:number,total:number)=>total?`${Math.round(n/total*100)}%`:"—";
export default async function PlatformAnalyticsPage(){
  await requirePlatformAdmin('analytics');
  const now=new Date(),since=new Date(Date.now()-30*86400000);
  const scope={organization:{slug:{not:"_platform_internal"}}};
  const [orgs,orders,users,messages]=await Promise.all([
    prisma.organization.findMany({where:{slug:{not:"_platform_internal"}},select:{createdAt:true,subscription:{select:{status:true}},_count:{select:{items:true,orders:true}}}}),
    prisma.order.aggregate({where:{...scope,createdAt:{gte:since},status:{notIn:["cancelled","canceled"]}},_sum:{totalAmount:true},_count:{_all:true}}),
    prisma.user.count({where:{...scope,role:{not:"platform_admin"},lastLoginAt:{gte:since}}}),
    prisma.sentMessage.count({where:{...scope,createdAt:{gte:since}}}),
  ]);
  const activated=orgs.filter(o=>o._count.items>0&&o._count.orders>0).length;
  const active=orgs.filter(o=>o.subscription?.status==="active").length;
  const months=Array.from({length:6},(_,i)=>{const start=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth()-5+i,1));const end=new Date(Date.UTC(start.getUTCFullYear(),start.getUTCMonth()+1,1));return {label:start.toLocaleDateString("en-US",{month:"short",year:"numeric",timeZone:"UTC"}),count:orgs.filter(o=>o.createdAt>=start&&o.createdAt<end).length}});
  const max=Math.max(1,...months.map(m=>m.count));
  return <div className="space-y-6">
    <ConsoleHeader eyebrow="Platform analytics" title="Growth & recorded usage">Current tenant state and recorded activity through {now.toISOString()}. Tenant order amounts are separate from platform subscription revenue.</ConsoleHeader>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric label="New tenants / 30 days" value={orgs.filter(o=>o.createdAt>=since).length} detail="Based on account creation timestamps"/><Metric label="Inventory + first order" value={pct(activated,orgs.length)} detail={`${activated} of ${orgs.length} current tenants meet this milestone`}/><Metric label="Active subscription share" value={pct(active,orgs.length)} detail={`${active} local active records; payment not independently verified`}/><Metric label="Staff with a login / 30 days" value={users} detail="Last recorded sign-in, not continuous user activity"/></div>
    <Notice>Current status shares are not trial-to-paid conversion, retention or churn rates. Reliable historical billing transitions and feature-use events are not yet available in this dashboard. No missing metric is replaced with a fabricated zero.</Notice>
    <section className="rounded-2xl border bg-white p-5"><h2 className="text-lg font-black">Tenant signups by calendar month</h2><p className="mt-1 text-sm text-slate-500">UTC months. The current month is still in progress.</p><div className="mt-5 space-y-4">{months.map(m=><div key={m.label}><div className="mb-2 flex justify-between gap-3 text-sm"><span>{m.label}</span><b>{m.count}</b></div><div className="h-3 rounded-full bg-slate-100"><div className="h-3 rounded-full bg-blue-600" style={{width:`${m.count/max*100}%`}}/></div></div>)}</div></section>
    <div className="grid gap-3 sm:grid-cols-3"><Metric label="Non-canceled orders / 30 days" value={orders._count._all} detail="Orders created in the last 30 days"/><Metric label="Recorded order amount / 30 days" value={new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(orders._sum.totalAmount||0)} detail="Not collected cash or platform subscription revenue"/><Metric label="Message records / 30 days" value={messages} detail="All statuses and directions; not a delivered-message count"/></div>
  </div>;
}
