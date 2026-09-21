import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/admin";
import { configurationState, directoryParams } from "@/lib/adminReadiness";
import { ConsoleHeader, SearchForm, Pager, Empty, Notice } from "../_components/Console";
import CheckProviders from "./CheckProviders";
export const dynamic="force-dynamic";
export default async function IntegrationsPage({searchParams: searchParamsPromise}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) {
  const searchParams = await searchParamsPromise;

  await requirePlatformAdmin();
  const {q,page:requested,pageSize}=directoryParams(searchParams);
  const where={slug:{not:"_platform_internal"},...(q?{OR:[{name:{contains:q,mode:"insensitive" as const}},{slug:{contains:q,mode:"insensitive" as const}}]}:{})};
  const total=await prisma.organization.count({where});
  const page=Math.min(requested,Math.max(1,Math.ceil(total/pageSize)));
  const orgs=await prisma.organization.findMany({where,orderBy:[{name:"asc"},{id:"asc"}],take:pageSize,skip:(page-1)*pageSize,select:{id:true,name:true,slug:true,status:true,stripeAccountId:true,resendApiKey:true,senderEmail:true,twilioAccountSid:true,twilioAuthToken:true,twilioFromNumber:true,customDomain:true}});
  return <div className="space-y-6">
    <ConsoleHeader eyebrow="Operations" title="Tenant integrations">Review saved connections and run explicit, read-only provider checks. Credentials stay on the server.</ConsoleHeader>
    <Notice>Saved credentials do not prove that checkout, email or SMS works. Checks report a point-in-time provider response, not an end-to-end transaction. Custom-domain DNS/SSL and Google routing are not automatically tested here.</Notice>
    <SearchForm q={q}/>
    <div className="space-y-4">{orgs.map(o=><article key={o.id} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-black">{o.name}</h2><p className="mt-1 break-all text-xs text-slate-500">{o.slug} · {o.status}</p></div><Link href={`/admin/organizations/${o.id}/support`} className="rounded-lg border px-3 py-2 text-sm font-bold">Open support</Link></div>
      <dl className="my-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[
        ["Stripe Connect",configurationState([o.stripeAccountId])],
        ["Email / Resend",configurationState([o.resendApiKey,o.senderEmail])],
        ["SMS / Twilio",configurationState([o.twilioAccountSid,o.twilioAuthToken,o.twilioFromNumber])],
        ["Custom domain",o.customDomain?"saved · DNS/SSL not checked":"optional · not configured"],
      ].map(([name,state])=><div key={name} className="rounded-xl bg-slate-50 p-3"><dt className="text-xs font-bold text-slate-600">{name}</dt><dd className="mt-2 text-sm">{state}</dd></div>)}</dl>
      <CheckProviders organizationId={o.id}/>
    </article>)}{!orgs.length&&<Empty>No tenants match this search.</Empty>}</div>
    <Pager base="/admin/integrations" page={page} total={total} pageSize={pageSize} q={q}/>
  </div>;
}
