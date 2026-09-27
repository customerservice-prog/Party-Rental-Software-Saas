import Link from "next/link";
import {requireCurrentOrganization} from "@/lib/tenant";
import {requirePermission} from "@/lib/authz";
import {prisma} from "@/lib/prisma";
import PrintButton from "../PrintButton";

const labels:Record<string,string>={damaged:"Damaged",needs_repair:"Needs Repair",missing:"Missing",out_of_service:"Out of Service",retired:"Retired"};
const badge=(status:string)=>status==="damaged"?"red":status==="needs_repair"?"yellow":status==="missing"?"red":"gray";

export default async function ProductAttentionReport(){
  const organization=await requireCurrentOrganization();
  await requirePermission(organization.id,"inventory.view");
  const items=await prisma.item.findMany({
    where:{organizationId:organization.id,OR:[{status:{not:"available"}},{attentionNotes:{not:null}}]},
    include:{category:true},
    orderBy:[{status:"asc"},{name:"asc"}],
  });
  const grouped=new Map<string,typeof items>();
  for(const item of items){const key=item.status==="available"?"attention":item.status;const rows=grouped.get(key)||[];rows.push(item);grouped.set(key,rows);}
  const groups=Array.from(grouped.entries());

  return <div className="friendly-admin-page is-wide print-page">
    <div className="mb-4 print-hide"><Link href="/dashboard/deliveries" className="text-xs font-semibold text-[#1a6fd4] hover:underline">← Back to Delivery</Link></div>
    <div className="friendly-admin-head">
      <div><h1>Product Attention Report</h1><p>{items.length} item{items.length===1?"":"s"} need attention</p></div>
      <div className="friendly-admin-actions print-hide"><PrintButton label="Print"/><Link href="/dashboard/inventory?view=attention" className="friendly-admin-secondary">Open Items</Link></div>
    </div>
    {!groups.length?<div className="friendly-admin-card friendly-admin-empty">No items currently need attention. Everything is marked Available.</div>:groups.map(([status,rows])=><section key={status} className="friendly-admin-card flush print-document">
      <div className="friendly-admin-subhead"><div><span className={"friendly-admin-badge "+badge(status)}>{status==="attention"?"Attention Notes":labels[status]||status.replaceAll("_"," ")}</span></div></div>
      <div className="friendly-admin-table-wrap"><table className="friendly-admin-table"><thead><tr><th>Item</th><th>Category</th><th>Notes</th><th>Last Inspected</th><th className="print-hide">Edit</th></tr></thead><tbody>{rows.map(item=><tr key={item.id}><td>{item.name}</td><td>{item.category?.name||"Uncategorized"}</td><td>{item.attentionNotes||"—"}</td><td>{item.lastInspectedAt?item.lastInspectedAt.toLocaleDateString():"—"}</td><td className="print-hide"><Link href={"/dashboard/inventory/"+item.id}>Edit</Link></td></tr>)}</tbody></table></div>
    </section>)}
  </div>;
}
