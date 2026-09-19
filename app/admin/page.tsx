import Link from "next/link";
import { prisma } from "@/lib/prisma";

type AdminOrgRow={
  id:string;name:string;slug:string;planTier:string;status:string;createdAt:Date;
  _count:{users:number;customers:number;orders:number};
};

export default async function AdminOrganizationsPage({
  searchParams,
}:{searchParams:{q?:string;status?:string}}){
  const q=searchParams.q?.trim()||"";
  const status=searchParams.status||"";

  const organizations:AdminOrgRow[]=await prisma.organization.findMany({
    where:{
      slug:{not:"_platform_internal"},
      ...(q?{OR:[{name:{contains:q,mode:"insensitive"}},{slug:{contains:q,mode:"insensitive"}}]}:{}),
      ...(status?{status}:{}),
    },
    orderBy:{createdAt:"desc"},
    include:{_count:{select:{users:true,customers:true,orders:true}}},
  });

  const totals=organizations.reduce((a,o)=>({
    users:a.users+o._count.users,
    customers:a.customers+o._count.customers,
    orders:a.orders+o._count.orders,
  }),{users:0,customers:0,orders:0});
  const active=organizations.filter(o=>o.status==="active").length;
  const trial=organizations.filter(o=>o.status==="trial").length;
  const suspended=organizations.filter(o=>o.status==="suspended").length;

  return <div className="space-y-6">
    <section>
      <div className="text-[10px] font-black uppercase tracking-[.18em] text-red-600">Platform Overview</div>
      <div className="mt-1 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Tenant Management</h1>
          <p className="mt-1 text-sm text-slate-500">Manage every rental business using Party Rental CRM. This is platform-level data, not a tenant workspace.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/audit-log" className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-black text-slate-700 shadow-sm">Audit Log</Link>
          <Link href="/admin/catalog-templates" className="rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-black text-white">Global Catalog</Link>
        </div>
      </div>
    </section>

    <section className="grid grid-cols-2 gap-3 lg:grid-cols-6">
      {[
        ["TENANTS",organizations.length,"All organizations"],
        ["ACTIVE",active,"Operating"],
        ["TRIAL",trial,"Trial accounts"],
        ["SUSPENDED",suspended,"Restricted"],
        ["USERS",totals.users,"Tenant staff"],
        ["ORDERS",totals.orders,"Across tenants"],
      ].map(([label,value,sub])=><div key={String(label)} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="text-[9px] font-black uppercase tracking-[.15em] text-slate-400">{label}</div>
        <div className="mt-1 text-2xl font-black text-slate-950">{value}</div>
        <div className="mt-1 text-[10px] text-slate-400">{sub}</div>
      </div>)}
    </section>

    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-100 p-5 lg:flex-row lg:items-center lg:justify-between">
        <div><h2 className="font-black">Organizations</h2><p className="text-xs text-slate-500">Open a tenant to manage its platform record, plan and status.</p></div>
        <form className="flex min-w-0 flex-1 gap-2 lg:max-w-2xl" method="get">
          <input type="text" name="q" defaultValue={q} placeholder="Search tenant name or subdomain" className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2.5 text-sm"/>
          <select name="status" defaultValue={status} className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm">
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="trial">Trial</option>
            <option value="suspended">Suspended</option>
          </select>
          <button className="rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-black text-white">Filter</button>
        </form>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left">
            <tr className="text-[10px] font-black uppercase tracking-wide text-slate-400">
              <th className="px-5 py-3">Tenant</th><th className="px-5 py-3">Plan</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Staff</th><th className="px-5 py-3">Customers</th><th className="px-5 py-3">Orders</th><th className="px-5 py-3">Joined</th><th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {!organizations.length&&<tr><td colSpan={8} className="px-5 py-12 text-center text-sm text-slate-400">No tenant organizations match this filter.</td></tr>}
            {organizations.map(org=><tr key={org.id} className="hover:bg-slate-50">
              <td className="px-5 py-4">
                <div className="font-black text-slate-900">{org.name}</div>
                <div className="mt-0.5 text-xs text-slate-400">{org.slug}.partyrentalcrm.com</div>
              </td>
              <td className="px-5 py-4 capitalize text-slate-600">{org.planTier}</td>
              <td className="px-5 py-4"><span className={"inline-flex rounded-full px-2.5 py-1 text-[9px] font-black uppercase "+(org.status==="active"?"bg-emerald-50 text-emerald-700":org.status==="suspended"?"bg-rose-50 text-rose-700":"bg-amber-50 text-amber-700")}>{org.status}</span></td>
              <td className="px-5 py-4 font-bold">{org._count.users}</td>
              <td className="px-5 py-4 font-bold">{org._count.customers}</td>
              <td className="px-5 py-4 font-bold">{org._count.orders}</td>
              <td className="px-5 py-4 text-xs text-slate-500">{new Date(org.createdAt).toLocaleDateString()}</td>
              <td className="px-5 py-4 text-right"><Link href={`/admin/organizations/${org.id}`} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-blue-700">Manage tenant →</Link></td>
            </tr>)}
          </tbody>
        </table>
      </div>
    </section>
  </div>;
}
