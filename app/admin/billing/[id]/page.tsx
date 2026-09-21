import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePlatformAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { ConsoleHeader, Notice } from "../../_components/Console";
import BillingInspector from "./BillingInspector";
export const dynamic="force-dynamic";
export default async function TenantBillingPage({params: paramsPromise}:{params:Promise<{id:string}>}) {
  const params = await paramsPromise;

  await requirePlatformAdmin('billing');
  const org=await prisma.organization.findFirst({where:{id:params.id,slug:{not:"_platform_internal"}},select:{id:true,name:true}});
  if(!org)notFound();
  return <div className="space-y-6"><ConsoleHeader eyebrow="Platform billing" title={org.name}>Read the linked Stripe subscription and recent invoices without changing billing.</ConsoleHeader><Notice>This inspection does not charge a card, cancel a subscription, email an invoice or change a plan. It shows Stripe’s current response, not a reconciled revenue ledger.</Notice><BillingInspector organizationId={org.id}/><div className="flex flex-wrap gap-4 text-sm font-bold text-blue-600"><Link href="/admin/billing">← Billing overview</Link><Link href={`/admin/organizations/${org.id}`}>Manage tenant account</Link></div></div>;
}
