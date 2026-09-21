import Link from "next/link";
import {notFound} from "next/navigation";
import {requireCurrentOrganization} from "@/lib/tenant";
import {prisma} from "@/lib/prisma";
import CustomerRelationships from "./CustomerRelationships";
export default async function CustomerRelationshipsPage({params: paramsPromise}:{params:Promise<{id:string}>}){
  const params = await paramsPromise;
const org=await requireCurrentOrganization();const customer=await prisma.customer.findFirst({where:{id:params.id,organizationId:org.id},include:{orders:{orderBy:{createdAt:"desc"},take:50}}});if(!customer)notFound();return <div className="mx-auto max-w-5xl space-y-5 p-5 sm:p-8"><div><Link href={`/dashboard/customers/${customer.id}`} className="text-xs font-bold text-blue-600">← {customer.firstName} {customer.lastName}</Link><div className="mt-2 text-xs font-black uppercase tracking-[.16em] text-blue-600">Customer CRM</div><h1 className="mt-1 text-3xl font-black tracking-tight">Contacts, credits & rain checks</h1><p className="mt-1 text-sm text-slate-500">Secondary contacts, alternate phone/email/address records and customer credit history.</p></div><CustomerRelationships customerId={customer.id} orders={customer.orders.map(o=>({id:o.id,orderNumber:o.orderNumber,eventDate:o.eventDate.toISOString(),totalAmount:o.totalAmount}))}/></div>}
