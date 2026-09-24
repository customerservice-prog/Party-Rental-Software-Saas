import Link from "next/link";
import {requireCurrentOrganization} from "@/lib/tenant";
import {prisma} from "@/lib/prisma";
import Icon from "../components/Icon";

export default async function CustomersPage({searchParams:searchParamsPromise}:{searchParams:Promise<{q?:string;from?:string;to?:string;page?:string}>}){
 const searchParams=await searchParamsPromise;
 const org=await requireCurrentOrganization(),q=searchParams.q?.trim().slice(0,200)||"",from=searchParams.from?.trim()||"",to=searchParams.to?.trim()||"";
 const dateFilter:{gte?:Date;lte?:Date}={};if(from&&!isNaN(+new Date(from)))dateFilter.gte=new Date(from);if(to&&!isNaN(+new Date(to)))dateFilter.lte=new Date(new Date(to).setUTCHours(23,59,59,999));
 const where={organizationId:org.id,...Object.keys(dateFilter).length?{createdAt:dateFilter}:{},...q?{AND:q.split(/\s+/).slice(0,8).map(word=>({OR:[{firstName:{contains:word,mode:"insensitive" as const}},{lastName:{contains:word,mode:"insensitive" as const}},{email:{contains:word,mode:"insensitive" as const}},{phone:{contains:word,mode:"insensitive" as const}}]}))}:{}};
 const total=await prisma.customer.count({where}),pages=Math.max(1,Math.ceil(total/25)),page=Math.min(pages,Math.max(1,Math.floor(Number(searchParams.page)||1)));
 const customers=await prisma.customer.findMany({where,orderBy:[{createdAt:"desc"},{id:"asc"}],include:{_count:{select:{orders:true}},orders:{select:{totalAmount:true,amountPaid:true,eventDate:true},orderBy:{eventDate:"desc"},take:100}},take:25,skip:(page-1)*25});
 const filters=new URLSearchParams({...q?{q}:{},...from?{from}:{},...to?{to}:{}});
 const pageUrl=(p:number)=>"/dashboard/customers?"+new URLSearchParams({...Object.fromEntries(filters),page:String(p)});
 return <div className="friendly-admin-page">
  <div className="friendly-admin-head">
   <div><h1>Customers</h1><p>{total} customer{total===1?"":"s"}</p></div>
   <div className="friendly-admin-actions"><a href={"/api/customers/export?"+filters} className="friendly-admin-secondary">Export CSV</a><Link href="/dashboard/customers/new" className="friendly-admin-primary"><Icon name="plus" className="h-4 w-4"/>Add Customer</Link></div>
  </div>

  <div className="friendly-admin-card accent-blue">
   <form method="get" className="friendly-admin-filters">
    <label className="min-w-[240px] flex-1"><span>Search</span><input type="search" name="q" defaultValue={q} placeholder="Search by name, email, phone, or order #..." className="w-full"/></label>
    <label><span>Added from</span><input type="date" name="from" defaultValue={from}/></label>
    <label><span>Added through</span><input type="date" name="to" defaultValue={to}/></label>
    <button className="friendly-admin-secondary" type="submit">Apply</button>
    {filters.size>0&&<Link href="/dashboard/customers" className="friendly-admin-secondary">Clear</Link>}
   </form>
  </div>

  <div className="friendly-admin-card flush">
   <div className="friendly-admin-table-wrap">
    <table className="friendly-admin-table">
     <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th className="numeric"># Orders</th><th className="numeric">Total Booked</th><th className="numeric">Balance Due</th><th>Last Order</th></tr></thead>
     <tbody>
      {customers.map(c=>{const totalBooked=c.orders.reduce((s,o)=>s+o.totalAmount,0),balance=c.orders.reduce((s,o)=>s+Math.max(0,o.totalAmount-o.amountPaid),0),last=c.orders[0]?.eventDate;return <tr key={c.id}>
       <td><Link href={"/dashboard/customers/"+c.id}>{c.firstName} {c.lastName}</Link></td>
       <td>{c.email||"—"}</td>
       <td>{c.phone||"—"}</td>
       <td className="numeric">{c._count.orders}</td>
       <td className="numeric">{new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(totalBooked)}</td>
       <td className={"numeric "+(balance>0?"!text-red-600 font-semibold":"")}>{new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(balance)}</td>
       <td>{last?last.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric",timeZone:"UTC"}):"—"}</td>
      </tr>})}
      {!customers.length&&<tr><td colSpan={7} className="friendly-admin-empty">No customers found.</td></tr>}
     </tbody>
    </table>
   </div>
  </div>

  <div className="friendly-admin-pager"><span>{total ? ((page-1)*25+1)+"–"+Math.min(page*25,total)+" of "+total : "0 customers"}</span><div className="flex items-center gap-2">{page>1&&<Link href={pageUrl(page-1)} className="friendly-admin-secondary">Previous</Link>}<span>Page {page} of {pages}</span>{page<pages&&<Link href={pageUrl(page+1)} className="friendly-admin-secondary">Next</Link>}</div></div>
 </div>;
}
