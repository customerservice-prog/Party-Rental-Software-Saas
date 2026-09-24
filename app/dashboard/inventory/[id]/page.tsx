import Link from "next/link";
import {notFound} from "next/navigation";
import {prisma} from "@/lib/prisma";
import {requireCurrentOrganization} from "@/lib/tenant";
import {requirePermission} from "@/lib/authz";
import ItemWorkspace from "./ItemWorkspace";

export default async function InventoryItemPage({params:paramsPromise}:{params:Promise<{id:string}>}){
  const params=await paramsPromise;
  const organization=await requireCurrentOrganization();
  await requirePermission(organization.id,"inventory.view");
  const[item,categories]=await Promise.all([
    prisma.item.findFirst({where:{id:params.id,organizationId:organization.id},include:{addons:{orderBy:{name:"asc"}},category:true}}),
    prisma.category.findMany({where:{organizationId:organization.id},orderBy:[{sortOrder:"asc"},{name:"asc"}]}),
  ]);
  if(!item)notFound();

  const initialItem={id:item.id,categoryId:item.categoryId,name:item.name,description:item.description||"",cost:item.cost,acquisitionCost:item.acquisitionCost,quantity:item.quantity,picture:item.picture||"",displayToCustomer:item.displayToCustomer,status:item.status,lastInspectedAt:item.lastInspectedAt?item.lastInspectedAt.toISOString().slice(0,10):"",attentionNotes:item.attentionNotes||"",blockBookingsUntil:item.blockBookingsUntil?item.blockBookingsUntil.toISOString().slice(0,10):"",restrictionMessage:item.restrictionMessage||""};

  return <div className="friendly-admin-page is-wide">
    <div className="friendly-admin-head">
      <div><Link href="/dashboard/inventory" className="text-xs font-semibold text-[#1a6fd4] hover:underline">← All Items</Link><h1 className="!mt-2">{item.name}</h1><p>{item.category.name} · Item workspace</p></div>
      <div className="friendly-admin-actions"><Link href="/dashboard/inventory/new" className="friendly-admin-primary">New Item</Link><Link href="/dashboard/categories" className="friendly-admin-secondary">Categories</Link></div>
    </div>
    <ItemWorkspace initialItem={initialItem} categories={categories.map(category=>({id:category.id,name:category.name}))} initialAddons={item.addons.map(addon=>({id:addon.id,name:addon.name,price:addon.price,isRequired:addon.isRequired}))}/>
  </div>;
}
