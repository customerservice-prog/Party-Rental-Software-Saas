import {NextRequest,NextResponse} from "next/server";
import {Prisma} from "@prisma/client";
import {requireCurrentOrganization} from "@/lib/tenant";
import {requirePermission,authzErrorResponse} from "@/lib/authz";
import {prisma} from "@/lib/prisma";
import {getPhysicalAvailableQuantityWithClient,getItemBookingRestriction} from "@/lib/availability";
import {getInventoryResourceIds,getRequestedResourceDemand} from "@/lib/packages";

function parseOrderDate(value:unknown){
  if(typeof value!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(value))return null;
  const date=new Date(value+"T12:00:00");
  return Number.isNaN(date.getTime())?null:date;
}

export async function PATCH(request:NextRequest,{params:paramsPromise}:{params:Promise<{id:string}>}){
  const params=await paramsPromise;
  const organization=await requireCurrentOrganization();let actor;
  try{actor=await requirePermission(organization.id,"orders.manage")}catch(err){return authzErrorResponse(err)}
  const order=await prisma.order.findFirst({
    where:{id:params.id,organizationId:organization.id},
    include:{items:true},
  });
  if(!order)return NextResponse.json({error:"Order not found"},{status:404});
  const body=await request.json();
  const data:Record<string,unknown>={};

  if(body.deliveryAddress!==undefined){
    if(typeof body.deliveryAddress!=="string")return NextResponse.json({error:"Delivery address must be text"},{status:400});
    const value=body.deliveryAddress.trim().slice(0,500);
    data.deliveryAddress=value||null;
  }

  const scheduleRequested=body.eventDate!==undefined||body.eventEndDate!==undefined||body.deliveryType!==undefined;
  let rangeStart=order.eventDate;
  let rangeEnd=order.eventEndDate||order.eventDate;
  if(scheduleRequested){
    if(body.eventDate!==undefined){
      const parsed=parseOrderDate(body.eventDate);
      if(!parsed)return NextResponse.json({error:"Choose a valid event date"},{status:400});
      rangeStart=parsed;
    }
    if(body.eventEndDate!==undefined){
      const parsed=body.eventEndDate?parseOrderDate(body.eventEndDate):rangeStart;
      if(!parsed)return NextResponse.json({error:"Choose a valid event end date"},{status:400});
      rangeEnd=parsed;
    }else if(body.eventDate!==undefined&&(!order.eventEndDate||+order.eventEndDate===+order.eventDate)){
      rangeEnd=rangeStart;
    }
    if(rangeEnd<rangeStart)return NextResponse.json({error:"The event end date cannot be before the start date"},{status:400});
    if(body.deliveryType!==undefined&&!["delivery","pickup"].includes(body.deliveryType))return NextResponse.json({error:"Fulfillment must be delivery or customer pickup"},{status:400});
  }

  try{
    const updated=await prisma.$transaction(async(tx:Prisma.TransactionClient)=>{
      if(scheduleRequested&&order.items.length){
        const lines=order.items.map(line=>({itemId:line.itemId,quantity:line.quantity}));
        const resourceIds=await getInventoryResourceIds(tx,organization.id,lines.map(line=>line.itemId));
        for(const resourceId of resourceIds)await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(hashtext($1))`,`${organization.id}:${resourceId}`);
        const resourceItems=await tx.item.findMany({where:{id:{in:resourceIds},organizationId:organization.id}});
        if(resourceItems.length!==resourceIds.length)throw new Error("ITEM_GONE");
        const resourceMap=new Map(resourceItems.map(item=>[item.id,item]));
        const demand=await getRequestedResourceDemand(tx,organization.id,lines);
        for(const[resourceId,requested]of demand){
          const resourceItem=resourceMap.get(resourceId);
          if(!resourceItem)throw new Error("ITEM_GONE");
          const restriction=getItemBookingRestriction(resourceItem,rangeStart);
          if(restriction)throw new Error("RESTRICTION|"+restriction);
          const remaining=await getPhysicalAvailableQuantityWithClient(tx,organization.id,resourceId,resourceItem.quantity,rangeStart,rangeEnd,order.id);
          if(requested>remaining)throw new Error(`RESOURCE|${resourceId}|${remaining}`);
        }
        data.eventDate=rangeStart;
        data.eventEndDate=rangeEnd;
        if(body.deliveryType!==undefined&&body.deliveryType!==order.deliveryType){
          const newDeliveryFee=body.deliveryType==="delivery"?(organization.flatDeliveryFee||0):0;
          data.deliveryType=body.deliveryType;
          data.deliveryFee=newDeliveryFee;
          data.totalAmount=Math.max(0,order.totalAmount-order.deliveryFee+newDeliveryFee);
        }
      }
      if(!Object.keys(data).length)return order;
      const result=await tx.order.update({where:{id:order.id},data});
      await tx.auditLog.create({data:{organizationId:organization.id,action:"order.updated",performedBy:actor.id,details:JSON.stringify({orderId:order.id,fields:Object.keys(data)})}});
      return result;
    },{isolationLevel:"Serializable"});
    return NextResponse.json({order:updated});
  }catch(err){
    if(err instanceof Error&&err.message==="ITEM_GONE")return NextResponse.json({error:"One or more rental items are no longer available"},{status:404});
    if(err instanceof Error&&err.message.startsWith("RESTRICTION|"))return NextResponse.json({error:err.message.slice("RESTRICTION|".length)},{status:409});
    if(err instanceof Error&&err.message.startsWith("RESOURCE|")){
      const[,resourceId,availableRaw]=err.message.split("|");
      const available=Number(availableRaw);
      const resource=await prisma.item.findFirst({where:{id:resourceId,organizationId:organization.id},select:{name:true}});
      return NextResponse.json({error:available>0?`Only ${available} unit(s) of "${resource?.name||"required inventory"}" are available for those dates`:`"${resource?.name||"Required inventory"}" is fully booked for those dates`},{status:409});
    }
    throw err;
  }
}