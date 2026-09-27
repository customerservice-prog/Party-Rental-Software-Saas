import {NextRequest,NextResponse} from "next/server";
import {Prisma} from "@prisma/client";
import {requireCurrentOrganization} from "@/lib/tenant";
import {requirePermission,authzErrorResponse} from "@/lib/authz";
import {prisma} from "@/lib/prisma";
import {getPhysicalAvailableQuantityWithClient,getItemBookingRestriction} from "@/lib/availability";
import {getInventoryResourceIds,getRequestedResourceDemand} from "@/lib/packages";

type Line={itemId:string;quantity:number;price:number};

function normalizeLines(body:unknown):Line[]|null{
  if(!Array.isArray(body)||!body.length)return null;
  const merged=new Map<string,{quantity:number;price:number}>();
  for(const raw of body){
    if(!raw||typeof raw!=="object")return null;
    const itemId=typeof (raw as any).itemId==="string"?(raw as any).itemId:"";
    const quantity=Number((raw as any).quantity),price=Number((raw as any).price);
    if(!itemId||!Number.isInteger(quantity)||quantity<1||quantity>100000||!Number.isFinite(price)||price<0||price>10000000)return null;
    const current=merged.get(itemId);
    if(current){
      if(Math.abs(current.price-price)>0.0001)return null;
      current.quantity+=quantity;
    }else merged.set(itemId,{quantity,price});
  }
  return Array.from(merged,([itemId,value])=>({itemId,...value}));
}

export async function PATCH(request:NextRequest,{params:paramsPromise}:{params:Promise<{id:string}>}){
  const params=await paramsPromise;
  const organization=await requireCurrentOrganization();let actor;
  try{actor=await requirePermission(organization.id,"orders.manage")}catch(err){return authzErrorResponse(err)}
  const body=await request.json().catch(()=>null);
  const lines=normalizeLines(body?.items);
  if(!lines)return NextResponse.json({error:"Add at least one valid rental item"},{status:400});

  const order=await prisma.order.findFirst({
    where:{id:params.id,organizationId:organization.id},
    include:{items:true,orderAddons:{include:{addon:true}}},
  });
  if(!order)return NextResponse.json({error:"Order not found"},{status:404});

  const fulfillment=await prisma.$queryRawUnsafe<{id:string}[]>(`SELECT "id" FROM "RentalFulfillment" WHERE "organizationId"=$1 AND "orderId"=$2 LIMIT 1`,organization.id,order.id);
  if(fulfillment.length)return NextResponse.json({error:"Rental items are locked because fulfillment has already started. Reconcile the warehouse record before changing the order."},{status:409});

  const itemIds=lines.map(line=>line.itemId);
  const items=await prisma.item.findMany({where:{id:{in:itemIds},organizationId:organization.id}});
  if(items.length!==itemIds.length)return NextResponse.json({error:"One or more rental items could not be found"},{status:404});
  const itemMap=new Map(items.map(item=>[item.id,item]));
  const start=order.eventDate,end=order.eventEndDate||order.eventDate;

  try{
    const result=await prisma.$transaction(async(tx:Prisma.TransactionClient)=>{
      const resourceIds=await getInventoryResourceIds(tx,organization.id,itemIds);
      for(const resourceId of resourceIds)await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(hashtext($1))`,`${organization.id}:${resourceId}`);
      const resourceItems=await tx.item.findMany({where:{id:{in:resourceIds},organizationId:organization.id}});
      if(resourceItems.length!==resourceIds.length)throw new Error("ITEM_GONE");
      const resourceMap=new Map(resourceItems.map(item=>[item.id,item]));
      const demand=await getRequestedResourceDemand(tx,organization.id,lines.map(({itemId,quantity})=>({itemId,quantity})));
      for(const[resourceId,requested]of demand){
        const resource=resourceMap.get(resourceId);
        if(!resource)throw new Error("ITEM_GONE");
        const restriction=getItemBookingRestriction(resource,start);
        if(restriction)throw new Error("RESTRICTION|"+restriction);
        const remaining=await getPhysicalAvailableQuantityWithClient(tx,organization.id,resourceId,resource.quantity,start,end,order.id);
        if(requested>remaining)throw new Error(`RESOURCE|${resourceId}|${remaining}`);
      }

      const selectedSet=new Set(itemIds);
      const preservedAddons=order.orderAddons.filter(row=>selectedSet.has(row.addon.itemId));
      const requiredAddons=await tx.addon.findMany({where:{organizationId:organization.id,itemId:{in:itemIds},isRequired:true}});
      const preservedAddonIds=new Set(preservedAddons.map(row=>row.addonId));
      const missingRequired=requiredAddons.filter(addon=>!preservedAddonIds.has(addon.id));
      const oldAddonTotal=order.orderAddons.reduce((sum,row)=>sum+row.price,0);
      const oldAdjustment=order.totalAmount-order.subtotal-order.deliveryFee-order.taxAmount;
      const preservedDiscount=Math.max(0,oldAddonTotal-oldAdjustment);
      const newAddonTotal=preservedAddons.reduce((sum,row)=>sum+row.price,0)+missingRequired.reduce((sum,row)=>sum+row.price,0);
      const newSubtotal=lines.reduce((sum,line)=>sum+line.quantity*line.price,0);
      const oldTaxBase=Math.max(0,order.subtotal+oldAdjustment);
      const historicalTaxRate=oldTaxBase>0?order.taxAmount/oldTaxBase:(organization.taxRate||0)/100;
      const taxable=Math.max(0,newSubtotal+newAddonTotal-preservedDiscount);
      const newTax=Math.round(taxable*historicalTaxRate*100)/100;
      const newTotal=Math.max(0,newSubtotal+order.deliveryFee+newAddonTotal-preservedDiscount+newTax);
      if(newTotal+0.009<order.amountPaid)throw new Error("PAID_TOTAL");

      await tx.orderAddon.deleteMany({where:{orderId:order.id,addonId:{notIn:[...preservedAddonIds]}}});
      if(missingRequired.length)await tx.orderAddon.createMany({data:missingRequired.map(addon=>({orderId:order.id,addonId:addon.id,name:addon.name,price:addon.price}))});
      await tx.orderItem.deleteMany({where:{orderId:order.id}});
      await tx.orderItem.createMany({data:lines.map(line=>({orderId:order.id,itemId:line.itemId,quantity:line.quantity,price:line.price}))});
      const updated=await tx.order.update({where:{id:order.id},data:{subtotal:newSubtotal,taxAmount:newTax,totalAmount:newTotal}});
      await tx.auditLog.create({data:{organizationId:organization.id,action:"order.items.updated",performedBy:actor.id,details:JSON.stringify({orderId:order.id,itemCount:lines.length,subtotal:newSubtotal,totalAmount:newTotal,preservedDiscount,requiredAddonsAdded:missingRequired.length})}});
      return updated;
    },{isolationLevel:"Serializable"});
    return NextResponse.json({order:result});
  }catch(err){
    if(err instanceof Error&&err.message==="PAID_TOTAL")return NextResponse.json({error:"The edited order total would be lower than payments already recorded. Refund or remove the excess payment before reducing the order further."},{status:409});
    if(err instanceof Error&&err.message==="ITEM_GONE")return NextResponse.json({error:"One or more rental items are no longer available"},{status:404});
    if(err instanceof Error&&err.message.startsWith("RESTRICTION|"))return NextResponse.json({error:err.message.slice("RESTRICTION|".length)},{status:409});
    if(err instanceof Error&&err.message.startsWith("RESOURCE|")){
      const[,resourceId,availableRaw]=err.message.split("|"),available=Number(availableRaw);
      const resource=await prisma.item.findFirst({where:{id:resourceId,organizationId:organization.id},select:{name:true}});
      return NextResponse.json({error:available>0?`Only ${available} unit(s) of "${resource?.name||"required inventory"}" are available for these dates`:`"${resource?.name||"Required inventory"}" is fully booked for these dates`},{status:409});
    }
    throw err;
  }
}
