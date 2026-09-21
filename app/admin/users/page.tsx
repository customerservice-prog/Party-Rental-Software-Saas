import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/admin";
import { directoryParams } from "@/lib/adminReadiness";
import { ConsoleHeader, SearchForm, Pager, Empty } from "../_components/Console";
import ViewAsTenantButton from "../ViewAsTenantButton";
export const dynamic="force-dynamic";
export default async function TenantUsersPage({searchParams: searchParamsPromise}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) {
  const searchParams = await searchParamsPromise;

  await requirePlatformAdmin('support');
  const {q,status,page:requested,pageSize}=directoryParams(searchParams);
  const where={organization:{slug:{not:"_platform_internal"}},role:{not:"platform_admin"},...(status==="disabled"?{isActive:false}:status==="active"?{isActive:true}:{}),...(q?{OR:[{name:{contains:q,mode:"insensitive" as const}},{username:{contains:q,mode:"insensitive" as const}},{organization:{name:{contains:q,mode:"insensitive" as const}}}]}:{})};
  const total=await prisma.user.count({where});
  const page=Math.min(requested,Math.max(1,Math.ceil(total/pageSize)));
  const users=await prisma.user.findMany({where,orderBy:[{name:"asc"},{id:"asc"}],take:pageSize,skip:(page-1)*pageSize,select:{id:true,name:true,username:true,role:true,isActive:true,lastLoginAt:true,forcePasswordReset:true,organization:{select:{id:true,name:true,status:true}},tenantRole:{select:{name:true}}}});
  return <div className="space-y-6">
    <ConsoleHeader eyebrow="Customer support" title="Tenant users">Find owners and staff across tenants. Manage passwords, sessions, access and ownership in the tenant’s audited support workspace.</ConsoleHeader>
    <SearchForm q={q} status={status} options={[["active","Active"],["disabled","Disabled"]]}/>
    <div className="grid gap-4 xl:grid-cols-2">{users.map(u=><article key={u.id} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-black">{u.name}</h2><p className="mt-1 break-all text-sm text-slate-500">@{u.username} · {u.organization.name}</p>
      <dl className="my-4 grid grid-cols-2 gap-3 text-sm"><div><dt className="text-xs text-slate-500">Role</dt><dd className="mt-1 font-semibold">{u.role}{u.tenantRole?` · ${u.tenantRole.name}`:""}</dd></div><div><dt className="text-xs text-slate-500">Access</dt><dd className="mt-1 font-semibold">{u.isActive?"Enabled":"Disabled"}{u.forcePasswordReset?" · password change required":""}</dd></div><div className="col-span-2"><dt className="text-xs text-slate-500">Last recorded login (UTC)</dt><dd className="mt-1">{u.lastLoginAt?.toISOString().replace("T"," ").slice(0,19)||"No login recorded"}</dd></div></dl>
      <div className="flex flex-wrap gap-2"><Link href={`/admin/organizations/${u.organization.id}/support`} className="rounded-lg border px-3 py-2 text-sm font-bold">Manage user & access</Link><ViewAsTenantButton organizationId={u.organization.id} userId={u.id} label="View as this user" disabled={!u.isActive||u.organization.status==="suspended"}/></div>
    </article>)}{!users.length&&<Empty>No tenant users match these filters.</Empty>}</div>
    <Pager base="/admin/users" page={page} total={total} pageSize={pageSize} q={q} status={status}/>
  </div>;
}
