import Link from "next/link";
import { requirePlatformAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { getEffectivePlanCommercial } from "@/lib/platformPlans";
import { knownPlanCode, catalogMonthlyValue, directoryParams } from "@/lib/adminReadiness";
import { ConsoleHeader, Metric, Notice, Empty, Pager, SearchForm } from "../_components/Console";
export const dynamic="force-dynamic";
export const revalidate=0;
const money=(n:number)=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:2}).format(n);
export default async function PlatformBillingPage({searchParams: searchParamsPromise}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) {
  const searchParams = await searchParamsPromise;

  await requirePlatformAdmin('billing');
  const {q,status,page:requestedPage,pageSize}=directoryParams(searchParams);
  const [subs,plans]=await Promise.all([
    prisma.platformSubscription.findMany({where:{organization:{slug:{not:"_platform_internal"}}},select:{organizationId:true,planTier:true,status:true,billingInterval:true,foundingCustomer:true,stripeSubId:true,currentPeriodEnd:true,organization:{select:{name:true,slug:true,trialEndsAt:true}}},orderBy:[{updatedAt:"desc"},{id:"asc"}]}),
    Promise.all(["starter","growth","pro","enterprise"].map(getEffectivePlanCommercial)),
  ]);
  const planMap=new Map<string,(typeof plans)[number]>(plans.map(p=>[p.code,p]));
  const value=(s:(typeof subs)[number])=>catalogMonthlyValue(s,planMap.get(knownPlanCode(s.planTier)||""));
  const active=subs.filter(s=>s.status==="active");
  const priced=active.map(value).filter((n):n is number=>n!==null);
  const estimate=priced.reduce((a,b)=>a+b,0);
  const trials=subs.filter(s=>s.status==="trialing");
  const now=Date.now();
  const ending=trials.filter(s=>s.organization.trialEndsAt && +s.organization.trialEndsAt>=now && +s.organization.trialEndsAt<=now+7*86400000);
  const filtered=subs.filter(s=>(!status || s.status===status) && (!q || `${s.organization.name} ${s.organization.slug}`.toLowerCase().includes(q.toLowerCase())));
  const page=Math.min(requestedPage,Math.max(1,Math.ceil(filtered.length/pageSize)));
  const rows=filtered.slice((page-1)*pageSize,page*pageSize);
  return <div className="space-y-6"><ConsoleHeader eyebrow="Platform billing" title="Billing & subscriptions">Subscriptions to Party Rental CRM. Tenant event payments remain separate.</ConsoleHeader><Notice><b>Revenue coverage:</b> the cards below use local subscription state and current configured list prices, not a reconciled Stripe revenue ledger. Founding, custom-priced and unknown-price subscriptions are excluded from the estimate, not valued at $0. Active status is not proof of a successful payment. Open a tenant’s Stripe inspection for actual subscription prices and recent invoices.</Notice><section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Estimated list-price monthly value" value={money(estimate)} detail={`${priced.length} of ${active.length} active records have estimable pricing; ${active.length-priced.length} excluded. Not net MRR.`}/><Metric label="Active subscription records" value={active.length} detail={`${active.filter(s=>s.stripeSubId).length} linked to Stripe; linkage is not verification.`}/><Metric label="Trials ending in 7 days" value={ending.length} detail={`${trials.length} trialing subscription records.`}/><Metric label="Past due / unpaid" value={subs.filter(s=>["past_due","unpaid"].includes(s.status)).length} detail={`${subs.filter(s=>s.status==="canceled").length} canceled; ${subs.filter(s=>s.status==="trial_ended").length} trials ended.`}/></section><SearchForm q={q} status={status} options={["active","trialing","past_due","unpaid","trial_ended","canceled"].map(s=>[s,s.replaceAll("_"," ")])}/><section className="overflow-hidden rounded-2xl border bg-white"><div className="divide-y divide-slate-100">{rows.length?rows.map(s=><article key={s.organizationId} className="grid gap-4 p-5 md:grid-cols-[minmax(0,1.4fr)_1fr_1fr_auto]"><div><Link href={`/admin/organizations/${s.organizationId}`} className="break-words font-bold text-slate-950">{s.organization.name}</Link><p className="mt-1 text-xs text-slate-500">{s.organization.slug}</p></div><div><p className="text-sm font-bold">{planMap.get(knownPlanCode(s.planTier)||"")?.name || s.planTier} · {s.billingInterval}</p><p className="mt-1 text-xs text-slate-600">{s.status.replaceAll("_"," ")}{s.foundingCustomer?" · founding pricing":""}</p></div><div><p className="text-sm font-bold">{value(s)===null?"Price not estimated":money(value(s)!)+" / month list estimate"}</p><p className="mt-1 text-xs text-slate-600">Period / trial end: {(s.currentPeriodEnd||s.organization.trialEndsAt)?.toLocaleDateString("en-US",{timeZone:"UTC"})||"not recorded"}</p></div><Link href={`/admin/billing/${s.organizationId}`} className="self-start rounded-lg border px-3 py-2 text-sm font-bold text-blue-600">Inspect Stripe →</Link></article>):<Empty>No subscription records match these filters.</Empty>}</div><Pager base="/admin/billing" page={page} total={filtered.length} pageSize={pageSize} q={q} status={status}/></section><section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{plans.map(p=><Metric key={p.code} label={`${p.name} records`} value={subs.filter(s=>knownPlanCode(s.planTier)===p.code).length} detail="Current records across all subscription statuses."/>)}</section></div>;
}
