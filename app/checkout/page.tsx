import { Suspense } from "react";
import { requireCurrentOrganization } from "@/lib/tenant";
import CheckoutClient from "./CheckoutClient";

export default async function CheckoutPage(){
  const organization=await requireCurrentOrganization();
  return <Suspense fallback={<main className="mx-auto max-w-xl px-5 py-20 text-center text-slate-500">Loading your reservation…</main>}><CheckoutClient organizationId={organization.id}/></Suspense>;
}
