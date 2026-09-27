import Link from "next/link";
import {requireCurrentOrganization} from "@/lib/tenant";
import {requirePermission} from "@/lib/authz";
import {prisma} from "@/lib/prisma";
import PrintButton from "../PrintButton";

function shift(date:string,days:number){const d=new Date(date+"T12:00:00Z");d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);}
function todayKey(){return new Date().toISOString().slice(0,10);}

export default async function ProductStatusReport({searchParams:paramsPromise}:{searchParams:Promise<{date?:string}>}){
  const params=await paramsPromise;
  const organization=await requireCurrentOrganization();
  await requirePermission(organization.id,"inventory.view");
  const date=/^\d{4}-\d{2}-\d{2}$/.test(params.date||"")?String(params.date):todayKey();
  const start=new Date(date+"T00:00:00.000Z"),end=new Date(shift(date,1)+"T00:00:00.000Z");
  const orders=await prisma.order.findMany({
    where:{organizationId:organization.id,eventDate:{gte:start,lt:end},status:{notIn:["cancelled","canceled"]}},
    orderBy:{orderNumber:"asc"},
    include:{items:{include:{item:{include:{category:true}}}}},
  });

  const grouped=new Map<string,{orderId:string;orderNumber:string;itemName:string;quantity:number}[]>();
  for(const order of orders)for(const line of order.items){
    const category=line.item.category?.name||"Uncategorized";
    const rows=grouped.get(category)||[];
    rows.push({orderId:order.id,orderNumber:order.orderNumber,itemName:line.item.name,quantity:line.quantity});
    grouped.set(category,rows);
  }
  const categories=Array.from(grouped.entries()).sort(([a],[b])=>a.localeCompare(b));

  return <div className="friendly-admin-page is-wide print-page">
    <div className="mb-4 print-hide"><Link href="/dashboard/deliveries" className="text-xs font-semibold text-[#1a6fd4] hover:underline">← Back to Delivery</Link></div>
    <div className="friendly-admin-head">
      <div><h1>Product Status Report</h1><p>{orders.length} order{orders.length===1?"":"s"} scheduled for {date}</p></div>
      <div className="friendly-admin-actions print-hide"><PrintButton label="Print"/><Link href="/dashboard/inventory" className="friendly-admin-secondary">Items</Link></div>
    </div>
    <div className="mb-5 flex flex-wrap items-center gap-2 print-hide">
      <Link href={"/dashboard/deliveries/product-status-report?date="+shift(date,-1)} className="friendly-admin-secondary !min-h-0 !py-1">← Prev</Link>
      <form><input type="date" name="date" defaultValue={date} className="friendly-admin-field"/><button className="friendly-admin-secondary ml-2 !min-h-0 !py-1">Go</button></form>
      <Link href={"/dashboard/deliveries/product-status-report?date="+shift(date,1)} className="friendly-admin-secondary !min-h-0 !py-1">Next →</Link>
      <Link href="/dashboard/deliveries/product-status-report" className="friendly-admin-secondary !min-h-0 !py-1">Today</Link>
    </div>
    {!categories.length?<div className="friendly-admin-card friendly-admin-empty">No items scheduled for this date.</div>:categories.map(([category,rows])=><section key={category} className="friendly-admin-card flush print-document">
      <div className="friendly-admin-subhead"><h2>{category}</h2></div>
      <div className="friendly-admin-table-wrap"><table className="friendly-admin-table"><thead><tr><th>Order</th><th>Item</th><th className="numeric">Qty</th></tr></thead><tbody>{rows.map((row,index)=><tr key={row.orderId+"-"+index}><td><Link href={"/dashboard/orders/"+row.orderId}>{row.orderNumber}</Link></td><td>{row.itemName}</td><td className="numeric">{row.quantity}</td></tr>)}</tbody></table></div>
    </section>)}
  </div>;
}
