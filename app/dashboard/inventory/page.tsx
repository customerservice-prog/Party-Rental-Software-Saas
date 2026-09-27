import Link from "next/link";
import {requireCurrentOrganization} from "@/lib/tenant";
import {requirePermission} from "@/lib/authz";
import {prisma} from "@/lib/prisma";
import InventoryActions,{InventoryUtilityActions} from "./InventoryActions";

const money=(n:number)=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(n);

export default async function InventoryPage({searchParams:searchParamsPromise}:{searchParams:Promise<{q?:string;category?:string;view?:string;page?:string}>}){
  const searchParams=await searchParamsPromise;
  const organization=await requireCurrentOrganization();
  await requirePermission(organization.id,"inventory.view");
  const q=searchParams.q?.trim().slice(0,160)||"";
  const categoryId=searchParams.category?.trim()||"";
  const view=["all","attention","visible","hidden"].includes(searchParams.view||"")?String(searchParams.view):"all";
  const where={
    organizationId:organization.id,
    ...(categoryId?{categoryId}:{}),
    ...(q?{OR:[{name:{contains:q,mode:"insensitive" as const}},{description:{contains:q,mode:"insensitive" as const}}]}:{}),
    ...(view==="attention"?{status:{not:"available"}}:view==="visible"?{displayToCustomer:true}:view==="hidden"?{displayToCustomer:false}:{}),
  };
  const total=await prisma.item.count({where});
  const pages=Math.max(1,Math.ceil(total/100));
  const page=Math.min(pages,Math.max(1,Math.floor(Number(searchParams.page)||1)));
  const[items,categories]=await Promise.all([
    prisma.item.findMany({where,include:{category:true,_count:{select:{addons:true,units:true}}},orderBy:[{name:"asc"},{id:"asc"}],take:100,skip:(page-1)*100}),
    prisma.category.findMany({where:{organizationId:organization.id},include:{_count:{select:{items:true}}},orderBy:[{sortOrder:"asc"},{name:"asc"}]}),
  ]);

  function href(patch:Record<string,string>={}){
    const params=new URLSearchParams({...q?{q}:{},...categoryId?{category:categoryId}:{},...view!=="all"?{view}:{},...patch});
    for(const[key,value]of Array.from(params.entries()))if(!value||value==="all")params.delete(key);
    return "/dashboard/inventory"+(params.size?"?"+params.toString():"");
  }

  return <div className="friendly-admin-page is-wide">
    <div className="friendly-admin-head">
      <div><h1>Items</h1><p>{total} rental item{total===1?"":"s"}</p></div>
      <InventoryActions/>
    </div>

    <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 pb-2">
      <div className="friendly-admin-tabs !mb-0 !border-0">
        <span className="friendly-admin-tab is-active">Browse Mode</span>
        <span className="friendly-admin-tab text-slate-400">Spreadsheet Mode</span>
        <span className="friendly-admin-tab text-slate-400">Import & Export Mode</span>
      </div>
      <InventoryUtilityActions/>
    </div>

    <section className="mt-4 mb-2">
      <form method="get" className="friendly-admin-filters">
        <label className="min-w-[210px] flex-1"><span>Search</span><input name="q" defaultValue={q} placeholder="Search items..." className="w-full"/></label>
        <label><span>Category</span><select name="category" defaultValue={categoryId}><option value="">All Categories (browse)</option>{categories.map(category=><option key={category.id} value={category.id}>{category.name} ({category._count.items})</option>)}</select></label>
        <label><span>View</span><select name="view" defaultValue={view}><option value="all">All items</option><option value="attention">Needs attention</option><option value="visible">Visible on website</option><option value="hidden">Hidden from website</option></select></label>
        <button type="submit" className="friendly-admin-secondary">Apply</button>
        {(q||categoryId||view!=="all")&&<Link href="/dashboard/inventory" className="friendly-admin-secondary">Clear</Link>}
        <span className="ml-auto text-xs text-slate-500">{items.length} of {total} records</span>
      </form>
    </section>

    <div className="mb-2 text-xs text-slate-500">Use Categories to manage category names, images and website visibility. <Link href="/dashboard/categories" className="font-semibold text-[#1a6fd4] hover:underline">Open Categories →</Link> · <Link href="/dashboard/inventory/packages" className="font-semibold text-[#1a6fd4] hover:underline">Packages →</Link></div>

    <section className="friendly-admin-card flush">
      <div className="friendly-admin-table-wrap">
        <table data-inventory-cards className="friendly-admin-table">
          <thead className="friendly-admin-green-head"><tr><th>Photo</th><th>Name</th><th>Price</th><th>Qty</th><th>Category</th><th>Display</th><th>Condition</th><th>Actions</th></tr></thead>
          <tbody>{items.map(item=><tr key={item.id}>
            <td data-label="Photo">{item.picture?<img src={item.picture} alt={item.name} className="h-10 w-10 rounded object-cover"/>:<span className="text-[10px] text-slate-400">No image</span>}</td>
            <td data-label="Item"><Link href={"/dashboard/inventory/"+item.id} className="font-semibold">{item.name}</Link><div className="mt-1 text-[9px] text-slate-400">{item._count.addons} add-on{item._count.addons===1?"":"s"} · {item._count.units} tracked unit{item._count.units===1?"":"s"}</div></td>
            <td data-label="Price" className="numeric">{money(item.cost)}{item.acquisitionCost!=null&&<div className="text-[9px] text-slate-400">Acq. {money(item.acquisitionCost)}</div>}</td>
            <td data-label="Quantity" className="numeric">{item.quantity}</td>
            <td data-label="Category">{item.category.name}</td>
            <td data-label="Display" className="text-center">{item.displayToCustomer?"✓":"✗"}</td>
            <td data-label="Condition"><span className={"friendly-admin-badge "+(item.status==="available"?"green":item.status==="missing"||item.status==="retired"?"red":"yellow")}>{item.status.replaceAll("_"," ")}</span></td>
            <td data-label="Actions"><Link href={"/dashboard/inventory/"+item.id} className="text-xs font-semibold text-[#1a6fd4] hover:underline">Edit</Link></td>
          </tr>)}
          {!items.length&&<tr><td colSpan={8} className="friendly-admin-empty">No items found.</td></tr>}</tbody>
        </table>
      </div>
    </section>

    <div className="friendly-admin-pager"><span>{total?((page-1)*100+1)+"–"+Math.min(page*100,total)+" of "+total:"0 items"}</span><div className="flex items-center gap-2">{page>1&&<Link href={href({page:String(page-1)})} className="friendly-admin-secondary">Previous</Link>}<span>Page {page} of {pages}</span>{page<pages&&<Link href={href({page:String(page+1)})} className="friendly-admin-secondary">Next</Link>}</div></div>
  </div>;
}
