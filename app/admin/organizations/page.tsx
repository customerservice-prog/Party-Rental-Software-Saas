import Link from "next/link";
import ViewAsTenantButton from "@/app/admin/ViewAsTenantButton";
import { prisma } from "@/lib/prisma";
import { getPlan } from "@/lib/plans";

export const dynamic="force-dynamic";
export const revalidate=0;

type OrgRow={
  id:string;name:string;slug:string;planTier:string;status:string;createdAt:Date;contactEmail:string|null;trialEndsAt:Date|null;
  subscription:{status:string;planTier:string;billingInterval:string;currentPeriodEnd:Date|null}|null;
  _count:{users:number;customers:number;orders:number};
};

function planLabel(code:string){return getPlan(code).name}
function initials(name:string){return name.split(/\s+/).slice(0,2).map(x=>x[0]).join("").toUpperCase()||"PR"}

export default async function OrganizationsPage({searchParams}:{searchParams:{q?:string;status?:string;plan?:string}}){
  const q=searchParams.q?.trim()||"";
  const status=searchParams.status||"";
  const plan=searchParams.plan||"";

  const rowsRaw=await prisma.organization.findMany({
    where:{
      slug:{not:"_platform_internal"},
      ...(q?{OR:[
        {name:{contains:q,mode:"insensitive"}},
        {slug:{contains:q,mode:"insensitive"}},
        {contactEmail:{contains:q,mode:"insensitive"}},
      ]}:{}),
      ...(status?{status}:{}),
    },
    orderBy:{createdAt:"desc"},
    include:{
      subscription:{select:{status:true,planTier:true,billingInterval:true,currentPeriodEnd:true}},
      _count:{select:{users:true,customers:true,orders:true}},
    },
  });
  const rows=(rowsRaw as OrgRow[]).filter(org=>!plan||((org.subscription?.planTier||org.planTier)===plan));

  return <div className="space-y-5">
    <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div className="text-[10px] font-black uppercase tracking-[.2em] text-blue-600">Tenant Directory</div>
        <h1 className="mt-1 text-3xl font-black tracking-[-.035em] text-slate-950">Organizations</h1>
        <p className="mt-2 text-sm text-slate-500">Search, review, and manage every rental company on Party Rental CRM.</p>
      </div>
      <Link href="/admin/organizations/new" className="rounded-xl bg-blue-600 px-4 py-3 text-xs font-black text-white shadow-sm">+ Create organization</Link>
    </section>

    <section className="rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,.04)]">
      <form className="grid gap-3 border-b border-slate-100 p-4 sm:grid-cols-[minmax(220px,1fr)_160px_160px_auto] sm:p-5" method="get">
        <div className="relative">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.4-3.4"/></svg>
          <input name="q" defaultValue={q} placeholder="Search name, subdomain, or email…" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"/>
        </div>
        <select name="status" defaultValue={status} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-400">
          <option value="">All statuses</option><option value="active">Active</option><option value="trial">Trial</option><option value="suspended">Suspended</option>
        </select>
        <select name="plan" defaultValue={plan} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-400">
          <option value="">All plans</option><option value="starter">Starter</option><option value="growth">Growth</option><option value="pro">Pro</option><option value="enterprise">Enterprise</option>
        </select>
        <button className="rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-black text-white">Apply filters</button>
      </form>

      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
        <div className="text-xs font-bold text-slate-500">{rows.length} organization{rows.length===1?"":"s"}</div>
        {(q||status||plan)&&<Link href="/admin/organizations" className="text-xs font-black text-blue-600">Clear filters</Link>}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-[1050px] w-full">
          <thead className="bg-slate-50/80">
            <tr className="text-left text-[9px] font-black uppercase tracking-[.14em] text-slate-400">
              <th className="px-5 py-3">Organization</th><th className="px-5 py-3">Account</th><th className="px-5 py-3">Subscription</th><th className="px-5 py-3">Staff</th><th className="px-5 py-3">Customers</th><th className="px-5 py-3">Orders</th><th className="px-5 py-3">Created</th><th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {!rows.length&&<tr><td colSpan={8} className="px-5 py-16 text-center"><div className="text-sm font-black text-slate-700">No organizations found</div><div className="mt-1 text-xs text-slate-400">Try changing the search or filters.</div></td></tr>}
            {rows.map(org=>{
              const subStatus=org.subscription?.status||"no record";
              return <tr key={org.id} className="group transition hover:bg-slate-50/80">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 text-[11px] font-black text-slate-600">{initials(org.name)}</div>
                    <div className="min-w-0"><div className="max-w-[260px] truncate text-sm font-black text-slate-900">{org.name}</div><div className="mt-0.5 max-w-[260px] truncate text-[11px] text-slate-400">{org.slug+".partyrentalcrm.com"}</div>{org.contactEmail&&<div className="mt-0.5 max-w-[260px] truncate text-[10px] text-slate-400">{org.contactEmail}</div>}</div>
                  </div>
                </td>
                <td className="px-5 py-4"><span className={"inline-flex rounded-full px-2.5 py-1 text-[9px] font-black uppercase "+(org.status==="active"?"bg-emerald-50 text-emerald-700":org.status==="suspended"?"bg-rose-50 text-rose-700":"bg-amber-50 text-amber-700")}>{org.status}</span></td>
                <td className="px-5 py-4"><div className="text-xs font-black text-slate-700">{planLabel(org.subscription?.planTier||org.planTier)}</div><div className="mt-1 text-[10px] capitalize text-slate-400">{subStatus.replaceAll("_"," ")}{org.subscription?.billingInterval?" · "+org.subscription.billingInterval:""}</div></td>
                <td className="px-5 py-4 text-sm font-black text-slate-700">{org._count.users}</td>
                <td className="px-5 py-4 text-sm font-black text-slate-700">{org._count.customers}</td>
                <td className="px-5 py-4 text-sm font-black text-slate-700">{org._count.orders}</td>
                <td className="px-5 py-4 text-xs text-slate-500">{new Date(org.createdAt).toLocaleDateString()}</td>
                <td className="px-5 py-4 text-right"><div className="flex flex-wrap justify-end gap-2"><ViewAsTenantButton organizationId={org.id}/><Link href={"/admin/organizations/"+org.id} className="inline-flex rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] font-black text-slate-700 shadow-sm group-hover:border-blue-200 group-hover:text-blue-700">Manage →</Link></div></td>
              </tr>
            })}
          </tbody>
        </table>
      </div>
    </section>
  </div>;
}
