import Link from "next/link";
import {notFound} from "next/navigation";
import {requireCurrentOrganization} from "@/lib/tenant";
import {prisma} from "@/lib/prisma";
import DeleteCustomerButton from "@/app/dashboard/customers/DeleteCustomerButton";
import CustomerNotes from "@/app/dashboard/customers/CustomerNotes";
import CustomerProfileEditor from "@/app/dashboard/customers/CustomerProfileEditor";
import CustomerRelationships from "./relationships/CustomerRelationships";

const money=(value:number)=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(value);

export default async function CustomerDetailPage({params:paramsPromise}:{params:Promise<{id:string}>}){
  const params=await paramsPromise;
  const organization=await requireCurrentOrganization();
  const customer=await prisma.customer.findFirst({
    where:{id:params.id,organizationId:organization.id},
    include:{orders:{orderBy:{createdAt:"desc"}}},
  });
  if(!customer)notFound();

  const normalizedPhone=(customer.phone||"").replace(/\D/g,"");
  const normalizedEmail=customer.email.trim().toLowerCase();
  const normalizedAddress=(customer.address||"").trim().toLowerCase();
  const[customerMessages,activeRestrictions]=await Promise.all([
    prisma.sentMessage.findMany({where:{organizationId:organization.id,customerId:customer.id},orderBy:{createdAt:"desc"},take:50}),
    prisma.doNotRentRestriction.findMany({where:{organizationId:organization.id,isActive:true},select:{id:true,email:true,phone:true,address:true}}),
  ]);
  const restriction=activeRestrictions.find(row=>{
    const email=(row.email||"").trim().toLowerCase();
    const phone=(row.phone||"").replace(/\D/g,"");
    const address=(row.address||"").trim().toLowerCase();
    return Boolean((normalizedEmail&&email===normalizedEmail)||(normalizedPhone&&phone===normalizedPhone)||(normalizedAddress&&address===normalizedAddress));
  })||null;

  const bookedOrders=customer.orders.filter(order=>["active","confirmed","completed"].includes(order.status.toLowerCase()));
  const balanceDue=bookedOrders.reduce((sum,order)=>sum+Math.max(0,order.totalAmount-order.amountPaid),0);
  const dnrParams=new URLSearchParams({add:"1",name:(customer.firstName+" "+customer.lastName).trim(),email:customer.email});
  if(customer.phone)dnrParams.set("phone",customer.phone);
  if(customer.address)dnrParams.set("address",customer.address);

  return <div className="mx-auto max-w-4xl p-4">
    <Link href="/dashboard/customers" className="text-sm font-medium text-[#1a6fd4] hover:underline">← Back to Customers</Link>

    <h1 className="mt-2 text-2xl font-bold text-slate-900">{customer.firstName} {customer.lastName}</h1>
    {restriction&&<p className="mt-1 text-xs font-semibold text-red-700">⚠ Active Rental Restriction</p>}

    <div className="mt-3 flex flex-wrap items-center gap-2">
      <Link href={"/dashboard/orders/new?customerId="+customer.id} className="friendly-admin-primary !min-h-0 !py-1.5">Book an Order</Link>
      <Link href={"/dashboard/do-not-rent?"+dnrParams.toString()} className="text-sm font-semibold text-[#1a6fd4] hover:underline">{restriction?"View Restriction":"+ Add to Do Not Rent"}</Link>
    </div>

    <CustomerProfileEditor customer={{id:customer.id,firstName:customer.firstName,lastName:customer.lastName,email:customer.email,phone:customer.phone||"",address:customer.address||"",city:customer.city||"",state:customer.state||"",zip:customer.zip||""}}/>

    <section className="mt-4 mb-4">
      <p className="mb-1 text-sm text-slate-600">{customer.email}</p>
      {customer.phone&&<p className="mb-1 text-sm text-slate-600">{customer.phone}</p>}
      {(customer.address||customer.city||customer.state||customer.zip)&&<p className="mb-1 text-sm text-slate-600">{[customer.address,customer.city,customer.state,customer.zip].filter(Boolean).join(", ")}</p>}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm">
        <Link href={"/dashboard/customers/"+customer.id+"/relationships"} className="text-[#1a6fd4] hover:underline">Contacts & Credits</Link>
        <Link href={"/dashboard/messages?customerId="+customer.id+"&to="+encodeURIComponent(customer.email)+"&name="+encodeURIComponent(customer.firstName+" "+customer.lastName)} className="text-[#1a6fd4] hover:underline">Message Customer</Link>
      </div>
    </section>

    <section className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
      <div className="mb-2 text-sm font-semibold text-slate-800">Notes</div>
      <CustomerNotes customerId={customer.id} initialNotes={customer.notes||""}/>
    </section>

    <section className="mb-4 rounded-lg border border-slate-200 bg-white px-4 py-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-semibold">Do Not Rent</span>
        <Link href={"/dashboard/do-not-rent?"+dnrParams.toString()} className="text-sm text-[#1a6fd4] hover:underline">+ Add to Do Not Rent</Link>
      </div>
      <p className={"mt-2 text-sm "+(restriction?"text-red-700":"text-slate-500")}>{restriction?"Active rental restriction on file.":"No active rental restriction on file."}</p>
    </section>

    <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-lg font-semibold text-slate-900">Orders</h2>
      {balanceDue>0&&<span className="text-xs font-semibold text-red-600">{money(balanceDue)} total balance due</span>}
    </div>
    <section className="mb-6 overflow-hidden rounded bg-white shadow">
      {customer.orders.length?customer.orders.map(order=><div key={order.id} className="flex items-center justify-between gap-4 border-b px-4 py-3 last:border-0">
        <div>
          <Link href={"/dashboard/orders/"+order.id} className="font-medium text-[#1a6fd4] hover:underline">{order.orderNumber}</Link>
          <span className={"ml-2 friendly-admin-badge "+(order.status==="active"||order.status==="confirmed"?"green":order.status==="quote"?"yellow":order.status==="canceled"||order.status==="cancelled"?"red":"gray")}>{order.status==="pending"?"incomplete":order.status}</span>
          <span className="ml-2 text-sm text-slate-500">{new Date(order.eventDate).toLocaleDateString()}</span>
        </div>
        <div className="text-right"><span className="font-medium">{money(order.totalAmount)}</span>{order.totalAmount-order.amountPaid>0.009&&<div className="text-xs font-semibold text-red-600">{money(order.totalAmount-order.amountPaid)} due</div>}</div>
      </div>):<div className="px-4 py-4 text-sm text-slate-500">This customer has no orders yet.</div>}
    </section>

    <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
      <div><h2 className="text-lg font-semibold text-slate-900">Contacts, Credits & Rainchecks</h2><p className="mt-1 text-xs text-slate-500">Manage alternate contacts and customer credit directly from this customer record, like Friendly admin.</p></div>
      <Link href={"/dashboard/customers/"+customer.id+"/relationships"} className="text-xs font-semibold text-[#1a6fd4] hover:underline">Open full CRM view →</Link>
    </div>
    <div className="mb-6">
      <CustomerRelationships customerId={customer.id} orders={customer.orders.slice(0,50).map(order=>({id:order.id,orderNumber:order.orderNumber,eventDate:order.eventDate.toISOString(),totalAmount:order.totalAmount}))}/>
    </div>

    <div className="mb-2 flex items-center justify-between">
      <h2 className="text-lg font-semibold text-slate-900">Communication History</h2>
      <span className="text-xs text-slate-400">{customerMessages.length}</span>
    </div>
    <section className="mb-6 overflow-hidden rounded bg-white shadow">
      {customerMessages.length?customerMessages.map(message=><div key={message.id} className="grid gap-1 border-b px-4 py-3 text-xs last:border-0 sm:grid-cols-[150px_70px_1fr_auto]">
        <span className="text-slate-500">{new Date(message.createdAt).toLocaleString()}</span>
        <span className="font-semibold uppercase text-slate-500">{message.channel}</span>
        <span className="text-slate-700">{message.channel==="sms"?"(SMS)":message.subject||"—"}</span>
        <span className="font-semibold uppercase text-slate-400">{message.status}</span>
      </div>):<div className="px-4 py-4 text-sm text-slate-500">No messages yet.</div>}
    </section>

    <div className="border-t border-slate-200 pt-4">
      <DeleteCustomerButton customerId={customer.id} customerName={customer.firstName+" "+customer.lastName}/>
    </div>
  </div>;
}
