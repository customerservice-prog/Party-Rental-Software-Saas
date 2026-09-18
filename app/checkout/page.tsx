import { Suspense } from "react";
import { redirect } from "next/navigation";
import { requireCurrentOrganization } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import CheckoutClient from "./CheckoutClient";

export default async function CheckoutPage({searchParams}:{searchParams:{resumeOrderId?:string}}){
  const organization=await requireCurrentOrganization();
  if(searchParams.resumeOrderId){
    const pending=await prisma.order.findFirst({where:{id:searchParams.resumeOrderId,organizationId:organization.id,status:"pending"},include:{items:{select:{itemId:true}}}});
    if(pending){
      if(pending.items.length>1) redirect("/cart");
      if(pending.items[0]?.itemId) redirect(`/checkout?itemId=${encodeURIComponent(pending.items[0].itemId)}`);
    }
    redirect("/book");
  }
  return <Suspense fallback={<main className="mx-auto max-w-xl px-5 py-20 text-center text-slate-500">Loading your reservation…</main>}><CheckoutClient organizationId={organization.id}/></Suspense>;
}
