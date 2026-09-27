import Link from "next/link";
import {requireCurrentOrganization} from "@/lib/tenant";
import {prisma} from "@/lib/prisma";
import Icon from "../components/Icon";
import CustomerAutoRefresh from "./CustomerAutoRefresh";

const money=(value:number)=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(value);
const ts=(date:Date|null|undefined)=>date?date.getTime():0;

export default async function CustomersPage({searchParams:searchParamsPromise}:{searchParams:Promise<{q?:string;from?:string;to?:string;page?:string}>}){
  const searchParams=await searchParamsPromise;
  const org=await requireCurrentOrganization();
  const q=searchParams.q?.trim().slice(0,200)||"",from=searchParams.from?.trim()||"",to=searchParams.to?.trim()||"";
  const dateFilter:{gte?:Date;lte?:Date}={};
  if(from&&!isNaN(+new Date(from)))dateFilter.gte=new Date(from);
  if(to&&!isNaN(+new Date(to)))dateFilter.lte=new Date(new Date(to).setUTCHours(23,59,59,999));

  const orderCustomerIds=q?(await prisma.order.findMany({where:{organizationId:org.id,orderNumber:{contains:q,mode:"insensitive"}},select:{customerId:true},distinct:["customerId"],take:500})).map(row=>row.customerId):[];
  const words=q.split(/\s+/).filter(Boolean).slice(0,8);
  const where={
    organizationId:org.id,
    ...(Object.keys(dateFilter).length?{createdAt:dateFilter}:{}),
    ...(q?{OR:[
      {id:{in:orderCustomerIds.length?orderCustomerIds:["__none__"]}},
      ...words.flatMap(word=>[
        {firstName:{contains:word,mode:"insensitive" as const}},
        {lastName:{contains:word,mode:"insensitive" as const}},
        {email:{contains:word,mode:"insensitive" as const}},
        {phone:{contains:word,mode:"insensitive" as const}},
      ]),
    ]}:{}),
  };

  const [rows,restrictions]=await Promise.all([
    prisma.customer.findMany({
      where,
      include:{
        orders:{
          select:{
            id:true,status:true,totalAmount:true,amountPaid:true,eventDate:true,createdAt:true,
            payments:{select:{createdAt:true,type:true,amount:true},orderBy:{createdAt:"desc"}},
          },
        },
      },
    }),
    prisma.doNotRentRestriction.findMany({where:{organizationId:org.id,isActive:true},select:{email:true,phone:true,address:true}}),
  ]);

  const restrictionEmails=new Set(restrictions.map(r=>r.email?.trim().toLowerCase()).filter(Boolean));
  const restrictionPhones=new Set(restrictions.map(r=>(r.phone||"").replace(/\D/g,"")).filter(Boolean));
  const restrictionAddresses=new Set(restrictions.map(r=>r.address?.trim().toLowerCase()).filter(Boolean));

  const customers=rows.map(customer=>{
    const nonCanceled=customer.orders.filter(order=>!["canceled","cancelled"].includes(order.status.toLowerCase()));
    const paidBookingDates=new Set(nonCanceled
      .filter(order=>order.amountPaid>0&&["active","confirmed","completed"].includes(order.status.toLowerCase()))
      .map(order=>order.eventDate.toISOString().slice(0,10)));
    const bookingOrders=nonCanceled.filter(order=>{
      const status=order.status.toLowerCase();
      const convertedDraft=(status==="incomplete"||status==="pending")&&order.amountPaid<=0&&paidBookingDates.has(order.eventDate.toISOString().slice(0,10));
      return !convertedDraft;
    });
    const bookingIds=new Set(bookingOrders.map(order=>order.id));
    const excludedDraftCount=nonCanceled.length-bookingOrders.length;
    let totalPaid=0,balance=0,lastOrder:Date|null=null,latestAt=customer.createdAt,latestType="Customer added";
    for(const order of customer.orders){
      const status=order.status.toLowerCase();
      if(bookingIds.has(order.id)){
        totalPaid+=Math.max(0,order.amountPaid);
        balance+=Math.max(0,order.totalAmount-order.amountPaid);
      }
      if(!lastOrder||ts(order.eventDate)>ts(lastOrder))lastOrder=order.eventDate;
      if(ts(order.createdAt)>ts(latestAt)){
        latestAt=order.createdAt;
        latestType=status==="quote"?"Quote":status==="incomplete"||status==="pending"?"Incomplete checkout":"Order";
      }
      for(const payment of order.payments){
        if(ts(payment.createdAt)>ts(latestAt)){latestAt=payment.createdAt;latestType=payment.type==="refund"?"Refund":"Payment";}
      }
    }
    const emailRestricted=customer.email&&restrictionEmails.has(customer.email.trim().toLowerCase());
    const phoneRestricted=customer.phone&&restrictionPhones.has(customer.phone.replace(/\D/g,""));
    const addressRestricted=customer.address&&restrictionAddresses.has(customer.address.trim().toLowerCase());
    return {...customer,orderCount:bookingOrders.length,totalPaid,balance,excludedDraftCount,lastOrder,latestAt,latestType,restricted:Boolean(emailRestricted||phoneRestricted),addressRestricted:Boolean(!emailRestricted&&!phoneRestricted&&addressRestricted)};
  }).sort((a,b)=>ts(b.latestAt)-ts(a.latestAt)||a.lastName.localeCompare(b.lastName)||a.firstName.localeCompare(b.firstName));

  const total=customers.length,pages=Math.max(1,Math.ceil(total/50)),page=Math.min(pages,Math.max(1,Math.floor(Number(searchParams.page)||1)));
  const pageCustomers=customers.slice((page-1)*50,page*50);
  const filters=new URLSearchParams({...q?{q}:{},...from?{from}:{},...to?{to}:{}});
  const pageUrl=(p:number)=>"/dashboard/customers?"+new URLSearchParams({...Object.fromEntries(filters),page:String(p)});

  return <div className="friendly-admin-page">
    <CustomerAutoRefresh/>
    <div className="friendly-admin-head">
      <div><h1>Customers</h1><p>{total} customer{total===1?"":"s"} · Latest payment, quote or incomplete checkout first</p><p className="!mt-1 text-[10px]">Refreshes automatically every 15 seconds. Customers without booking activity appear last.</p></div>
      <div className="friendly-admin-actions"><a href={"/api/customers/export?"+filters} className="friendly-admin-secondary">Export CSV</a><Link href="/dashboard/customers/new" className="friendly-admin-primary"><Icon name="plus" className="h-4 w-4"/>Add Customer</Link></div>
    </div>

    <section className="friendly-admin-card accent-blue">
      <form method="get" className="friendly-admin-filters">
        <label className="min-w-[240px] flex-1"><span>Search</span><input type="search" name="q" defaultValue={q} placeholder="Search by name, email, phone, or order #..." className="w-full"/></label>
        <button className="friendly-admin-secondary" type="submit">Search</button>
        <details className="customer-more-filters">
          <summary className="friendly-admin-secondary cursor-pointer list-none">More filters</summary>
          <div className="customer-more-filter-panel">
            <label><span>Added from</span><input type="date" name="from" defaultValue={from}/></label>
            <label><span>Added through</span><input type="date" name="to" defaultValue={to}/></label>
          </div>
        </details>
        {filters.size>0&&<Link href="/dashboard/customers" className="friendly-admin-secondary">Clear</Link>}
      </form>
    </section>

    <section className="friendly-admin-card flush">
      <div className="friendly-admin-table-wrap">
        <table className="friendly-admin-table">
          <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th className="numeric"># Orders</th><th className="numeric">Total Paid</th><th className="numeric">Balance Due</th><th>Latest Activity</th></tr></thead>
          <tbody>{pageCustomers.map(customer=><tr key={customer.id}>
            <td><Link href={"/dashboard/customers/"+customer.id}>{customer.firstName} {customer.lastName}</Link>{customer.restricted&&<span className="ml-2 friendly-admin-badge red">Do Not Rent</span>}{customer.addressRestricted&&<span className="ml-2 friendly-admin-badge yellow">Restricted Address</span>}</td>
            <td>{customer.email||"—"}</td>
            <td>{customer.phone||"—"}</td>
            <td className="numeric">{customer.orderCount}</td>
            <td className="numeric">{money(customer.totalPaid)}</td>
            <td className={"numeric "+(customer.balance>0?"!text-red-600 font-semibold":"")}>{money(customer.balance)}{customer.excludedDraftCount>0&&<div className="mt-1 text-[9px] font-normal text-slate-400">{customer.excludedDraftCount} converted checkout{customer.excludedDraftCount===1?"":"s"} excluded</div>}</td>
            <td><div className="font-medium text-slate-700">{customer.latestType}</div><time dateTime={customer.latestAt.toISOString()} className="text-[10px] text-slate-400">{customer.latestAt.toLocaleString("en-US",{timeZone:org.timezone||"America/New_York",month:"short",day:"numeric",year:"numeric",hour:"numeric",minute:"2-digit"})}</time></td>
          </tr>)}
          {!pageCustomers.length&&<tr><td colSpan={7} className="friendly-admin-empty">No customers found.</td></tr>}</tbody>
        </table>
      </div>
    </section>

    <div className="friendly-admin-pager"><span>{total?((page-1)*50+1)+"–"+Math.min(page*50,total)+" of "+total:"0 customers"}</span><div className="flex items-center gap-2">{page>1&&<Link href={pageUrl(page-1)} className="friendly-admin-secondary">Previous</Link>}<span>Page {page} of {pages}</span>{page<pages&&<Link href={pageUrl(page+1)} className="friendly-admin-secondary">Next</Link>}</div></div>
  </div>;
}
