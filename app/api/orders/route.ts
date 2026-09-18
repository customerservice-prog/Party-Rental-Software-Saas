import { NextRequest, NextResponse } from "next/server";
import { requireCurrentOrganization } from "@/lib/tenant";
import { requirePermission, authzErrorResponse } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { getAvailableQuantity, getItemBookingRestriction } from "@/lib/availability";

export async function POST(request:NextRequest){
  const organization=await requireCurrentOrganization(); let actor;
  try{actor=await requirePermission(organization.id,"orders.manage")}catch(err){return authzErrorResponse(err)}
  const body=await request.json();
  const{customerId,firstName,lastName,email,phone,eventDate,eventEndDate,deliveryType,deliveryAddress,status,amountPaid}=body;
  const raw:{itemId:string;quantity:number}[]=Array.isArray(body.items)?body.items.filter((li:any)=>li&&typeof li.itemId==="string").map((li:any)=>({itemId:li.itemId,quantity:typeof li.quantity==="number"&&li.quantity>0?Math.floor(li.quantity):1})):[];
  const merged=new Map<string,number>(); for(const li of raw)merged.set(li.itemId,(merged.get(li.itemId)||0)+li.quantity);
  const lineItems=Array.from(merged,([itemId,quantity])=>({itemId,quantity}));
  if(!eventDate)return NextResponse.json({error:"Event date is required"},{status:400});
  if(!lineItems.length)return NextResponse.json({error:"Add at least one item to the order"},{status:400});
  const rangeStart=new Date(eventDate); if(isNaN(rangeStart.getTime()))return NextResponse.json({error:"Invalid event date"},{status:400});
  const rangeEnd=eventEndDate?new Date(eventEndDate):rangeStart; if(isNaN(rangeEnd.getTime())||rangeEnd<rangeStart)return NextResponse.json({error:"Invalid event end date"},{status:400});
  let customer=null;
  if(customerId&&typeof customerId==="string")customer=await prisma.customer.findFirst({where:{id:customerId,organizationId:organization.id}});
  if(!customer){if(!firstName||!lastName||!email)return NextResponse.json({error:"Select a customer or provide first name, last name, and email"},{status:400});customer=await prisma.customer.findFirst({where:{organizationId:organization.id,email:{equals:String(email).trim(),mode:"insensitive"}}});if(!customer)customer=await prisma.customer.create({data:{organizationId:organization.id,firstName:String(firstName).trim(),lastName:String(lastName).trim(),email:String(email).trim().toLowerCase(),phone:phone||null,address:deliveryAddress||null}})}
  const items=await prisma.item.findMany({where:{id:{in:lineItems.map(x=>x.itemId)},organizationId:organization.id}}),itemMap=new Map(items.map(i=>[i.id,i]));
  const resolved=lineItems.map(li=>{const item=itemMap.get(li.itemId);return item?{item,quantity:li.quantity}:null}).filter((x):x is {item:(typeof items)[number];quantity:number}=>x!==null);
  if(resolved.length!==lineItems.length)return NextResponse.json({error:"One or more selected rental items could not be found"},{status:400});
  for(const{item,quantity}of resolved){const restriction=getItemBookingRestriction(item,rangeStart);if(restriction)return NextResponse.json({error:restriction},{status:409});const available=await getAvailableQuantity(organization.id,item.id,item.quantity,rangeStart,rangeEnd);if(quantity>available)return NextResponse.json({error:available>0?`Only ${available} unit(s) of "${item.name}" are available for the selected dates`:`"${item.name}" is fully booked for the selected dates`},{status:409})}
  const subtotal=resolved.reduce((s,r)=>s+r.item.cost*r.quantity,0),isDelivery=deliveryType!=="pickup",deliveryFee=isDelivery?organization.flatDeliveryFee||0:0,taxRate=organization.taxRate||0,taxAmount=Math.round(subtotal*(taxRate/100)*100)/100,totalAmount=Math.max(0,subtotal+deliveryFee+taxAmount),paid=typeof amountPaid==="number"&&amountPaid>0?Math.min(Math.round(amountPaid*100)/100,totalAmount):0;
  const allowedStatuses=["quote","pending","confirmed","completed","cancelled"],orderStatus=typeof status==="string"&&allowedStatuses.includes(status)?status:"quote";
  if(orderStatus!=="quote"){const clauses:any[]=[];if(customer.email)clauses.push({email:{equals:customer.email,mode:"insensitive"}});if(customer.phone)clauses.push({phone:customer.phone});if(customer.address)clauses.push({address:{contains:customer.address,mode:"insensitive"}});if(clauses.length){const blocked=await prisma.doNotRentRestriction.findFirst({where:{organizationId:organization.id,isActive:true,OR:clauses}});if(blocked)return NextResponse.json({error:"This customer has an active do-not-rent restriction. Review it before booking."},{status:403})}}
  const orderNumber="ORD-"+Date.now();
  try{const order=await prisma.$transaction(async tx=>{
    for(const item of [...resolved.map(r=>r.item)].sort((a,b)=>a.id.localeCompare(b.id)))await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(hashtext($1))`,`${organization.id}:${item.id}`);
    for(const{item,quantity}of resolved){const unavailableUnits=await tx.itemUnit.count({where:{organizationId:organization.id,itemId:item.id,status:{in:["maintenance","retired"]}}}),overlapping=await tx.orderItem.findMany({where:{itemId:item.id,order:{organizationId:organization.id,status:{not:"cancelled"},eventDate:{lte:rangeEnd},OR:[{eventEndDate:{gte:rangeStart}},{eventEndDate:null,eventDate:{gte:rangeStart}}]}},select:{quantity:true}}),booked=overlapping.reduce((s,x)=>s+x.quantity,0),available=Math.max(0,item.quantity-unavailableUnits-booked);if(quantity>available)throw new Error(`AVAILABILITY|${item.name}|${available}`)}
    const created=await tx.order.create({data:{organizationId:organization.id,customerId:customer!.id,orderNumber,eventDate:rangeStart,eventEndDate:rangeEnd,deliveryType:isDelivery?"delivery":"pickup",deliveryAddress:deliveryAddress||null,status:orderStatus,source:"manual",deliveryFee,subtotal,taxAmount,totalAmount,amountPaid:paid,stripeSessionId:null,items:{create:resolved.map(r=>({itemId:r.item.id,quantity:r.quantity,price:r.item.cost}))}}});
    if(paid>0){const dbUser=await tx.user.findUnique({where:{id:actor.id},select:{name:true}});await tx.payment.create({data:{organizationId:organization.id,orderId:created.id,amount:paid,type:"payment",method:"other",tip:0,note:"Initial payment recorded during manual order creation",recordedBy:dbUser?.name||null}})}
    await tx.auditLog.create({data:{organizationId:organization.id,action:"order.created.manual",performedBy:actor.id,details:JSON.stringify({orderId:created.id,orderNumber:created.orderNumber,status:orderStatus,totalAmount,amountPaid:paid})}});
    return created;
  },{isolationLevel:"Serializable"});return NextResponse.json({id:order.id,orderNumber:order.orderNumber})}catch(err){if(err instanceof Error&&err.message.startsWith("AVAILABILITY|")){const[,name,a]=err.message.split("|"),available=Number(a);return NextResponse.json({error:available>0?`Only ${available} unit(s) of "${name}" are available for the selected dates`:`"${name}" became fully booked while this order was being saved`},{status:409})}throw err}
}
