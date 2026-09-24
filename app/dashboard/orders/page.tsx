import Link from "next/link";
import {requireCurrentOrganization} from "@/lib/tenant";
import {prisma} from "@/lib/prisma";
import {ORDER_STATUSES,orderSearchWhere} from "@/lib/orderFilters";
import Icon from "../components/Icon";
import {StatusBadge,money,eventDateLabel} from "../components/TenantUI";

export default async function OrdersPage({searchParams:searchParamsPromise}:{searchParams:Promise<{status?:string;q?:string;page?:string;balance?:string}>}){
 const searchParams=await searchParamsPromise;
 const org=await requireCurrentOrganization(),q=searchParams.q?.trim().slice(0,200)||"";
 const status=ORDER_STATUSES.includes(searchParams.status as any)?searchParams.status!:"";
 const unpaid=searchParams.balance==="unpaid";
 const where={organizationId:org.id,...orderSearchWhere(q),...(status?{status}:unpaid?{status:{in:["active","confirmed","completed"]}}:{}),...(unpaid?{amountPaid:{lt:prisma.order.fields.totalAmount}}:{})};
 const total=await prisma.order.count({where}),pages=Math.max(1,Math.ceil(total/25)),page=Math.min(pages,Math.max(1,Math.floor(Number(searchParams.page)||1)));
 const orders=await prisma.order.findMany({where,include:{customer:true},orderBy:[{eventDate:"desc"},{id:"asc"}],take:25,skip:(page-1)*25});
 function url(patch:Record<string,string>={}){const params=new URLSearchParams({...q?{q}:{},...status?{status}:{},...unpaid?{balance:"unpaid"}:{},...patch});for(const[key,value]of Array.from(params.entries()))if(!value)params.delete(key);return"/dashboard/orders"+(params.size?"?"+params:"");}
 const exportParams=new URLSearchParams({...q?{q}:{},...status?{status}:{},...unpaid?{balance:"unpaid"}:{}});
 return <div className="friendly-admin-page">
  <div className="friendly-admin-head">
   <div><h1>Orders</h1><p>{total} matching {total===1?"order":"orders"}</p></div>
   <div className="friendly-admin-actions"><a href={"/api/orders/export?"+exportParams} className="friendly-admin-secondary">Export CSV</a><Link href="/dashboard/orders/new" className="friendly-admin-primary"><Icon name="plus" className="h-4 w-4"/>New Order</Link></div>
  </div>

  <div className="friendly-admin-card accent-blue">
   <form className="friendly-admin-filters" method="get">
    <label><span>Status</span><select name="status" defaultValue={status}><option value="">All Statuses</option>{ORDER_STATUSES.map(value=><option key={value} value={value}>{value[0].toUpperCase()+value.slice(1)}</option>)}</select></label>
    <label className="min-w-[220px] flex-1"><span>Search</span><input name="q" defaultValue={q} placeholder="Search by customer name or order number..." className="w-full"/></label>
    <label className="flex items-center gap-2 pb-2"><input type="checkbox" name="balance" value="unpaid" defaultChecked={unpaid}/><span className="!mb-0">Balance due only</span></label>
    <button className="friendly-admin-secondary" type="submit">Apply</button>
    {(q||status||unpaid)&&<Link href="/dashboard/orders" className="friendly-admin-secondary">Clear</Link>}
   </form>
  </div>

  <div className="friendly-admin-card flush">
   <div className="friendly-admin-table-wrap">
    <table className="friendly-admin-table">
     <thead><tr><th>Order#</th><th>Customer</th><th>Event Date</th><th>Status</th><th className="numeric">Total</th><th className="numeric">Paid</th><th className="numeric">Balance</th><th>Actions</th></tr></thead>
     <tbody>
      {orders.map(o=><tr key={o.id}>
       <td><Link href={"/dashboard/orders/"+o.id}>{o.orderNumber}</Link><div className="mt-1 text-[9px] capitalize text-gray-400">{o.deliveryType==="pickup"?"Customer pickup":"Delivery"}</div></td>
       <td><div className="font-medium text-[#333]">{o.customer.firstName} {o.customer.lastName}</div><div className="mt-1 text-[9px] text-gray-400">{o.customer.email}</div></td>
       <td>{eventDateLabel(o.eventDate)}</td>
       <td><StatusBadge status={o.status}/></td>
       <td className="numeric">{money(o.totalAmount)}</td>
       <td className="numeric">{money(o.amountPaid)}</td>
       <td className={"numeric "+(o.totalAmount>o.amountPaid?"!text-red-600 font-semibold":"!text-green-700")}>{money(Math.max(0,o.totalAmount-o.amountPaid))}</td>
       <td><Link href={"/dashboard/orders/"+o.id} className="friendly-admin-secondary !min-h-0 !px-3 !py-1">View</Link></td>
      </tr>)}
      {!orders.length&&<tr><td colSpan={8} className="friendly-admin-empty">No orders found.</td></tr>}
     </tbody>
    </table>
   </div>
  </div>

  <div className="friendly-admin-pager"><span>{total ? ((page-1)*25+1)+"–"+Math.min(page*25,total)+" of "+total : "0 orders"}</span><div className="flex items-center gap-2">{page>1&&<Link href={url({page:String(page-1)})} className="friendly-admin-secondary">Previous</Link>}<span>Page {page} of {pages}</span>{page<pages&&<Link href={url({page:String(page+1)})} className="friendly-admin-secondary">Next</Link>}</div></div>
 </div>;
}
