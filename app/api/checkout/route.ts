import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireCurrentOrganization } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { getAvailableQuantity, getPhysicalAvailableQuantityWithClient, getItemBookingRestriction } from "@/lib/availability";
import { getInventoryResourceIds, getRequestedResourceDemand } from "@/lib/packages";

const DEFAULT_TERMS="By signing below, you agree to the rental company's rental terms and accept financial responsibility for the rented equipment during the rental period.";
const text=(v:unknown,max:number)=>typeof v==="string"?v.trim().slice(0,max):"";
type RequestedLine={itemId:string;quantity:number;addonIds:string[]};
type ItemRow={id:string;name:string;cost:number;quantity:number;status:string;blockBookingsUntil:Date|null;restrictionMessage:string|null;displayToCustomer:boolean};
type AddonRow={id:string;itemId:string;name:string;price:number;isRequired:boolean};

function normalizeLines(body:any):RequestedLine[]{
  const raw:Array<any>=Array.isArray(body?.items)&&body.items.length?body.items:[{itemId:body?.itemId,quantity:body?.quantity,addonIds:body?.addonIds}];
  const merged=new Map<string,RequestedLine>();
  for(const row of raw.slice(0,100)){
    const itemId=text(row?.itemId,100);if(!itemId)continue;
    const quantity=Math.max(1,Math.min(10000,Math.floor(Number(row?.quantity)||1)));
    const rawAddonIds:unknown[]=Array.isArray(row?.addonIds)?row.addonIds:[];
    const addonIds=rawAddonIds.filter((v:unknown):v is string=>typeof v==="string").map((v:string)=>v.slice(0,100)).slice(0,50);
    const existing=merged.get(itemId);
    if(existing){existing.quantity=Math.min(10000,existing.quantity+quantity);existing.addonIds=Array.from(new Set([...existing.addonIds,...addonIds]));}
    else merged.set(itemId,{itemId,quantity,addonIds:Array.from(new Set(addonIds))});
  }
  return Array.from(merged.values());
}

export async function POST(request:NextRequest){
  const organization=await requireCurrentOrganization();
  const body=await request.json().catch(()=>null);
  if(!body||typeof body!=="object")return NextResponse.json({error:"Invalid booking request"},{status:400});
  const lines=normalizeLines(body);
  const firstName=text((body as any).firstName,100),lastName=text((body as any).lastName,100),email=text((body as any).email,254).toLowerCase(),phone=text((body as any).phone,50),deliveryAddress=text((body as any).deliveryAddress,500),signatureName=text((body as any).signatureName,200),eventDate=text((body as any).eventDate,30),eventEndDate=text((body as any).eventEndDate,30),deliveryType=text((body as any).deliveryType,30).toLowerCase()==="pickup"?"pickup":"delivery";
  if(!lines.length||!firstName||!lastName||!email||!eventDate)return NextResponse.json({error:"Please complete all required booking details"},{status:400});
  if(deliveryType==="delivery"&&!deliveryAddress)return NextResponse.json({error:"Enter the event / delivery address"},{status:400});
  if(!/^\S+@\S+\.\S+$/.test(email))return NextResponse.json({error:"Enter a valid email address"},{status:400});
  if(!signatureName)return NextResponse.json({error:"Please sign the rental agreement to continue"},{status:400});
  const rangeStart=new Date(`${eventDate}T12:00:00`),rangeEnd=eventEndDate?new Date(`${eventEndDate}T12:00:00`):null;
  if(Number.isNaN(rangeStart.getTime())||(rangeEnd&&Number.isNaN(rangeEnd.getTime())))return NextResponse.json({error:"Choose a valid event date"},{status:400});
  if(rangeEnd&&rangeEnd<rangeStart)return NextResponse.json({error:"The event end date cannot be before the start date"},{status:400});
  const today=new Date();today.setHours(0,0,0,0);if(rangeStart<today)return NextResponse.json({error:"The event date cannot be in the past"},{status:400});

  const itemIds=lines.map(l=>l.itemId);
  const [itemsRaw,allAddonsRaw,depositRule]=await Promise.all([
    prisma.item.findMany({where:{id:{in:itemIds},organizationId:organization.id,displayToCustomer:true,status:"available"}}),
    prisma.addon.findMany({where:{organizationId:organization.id,itemId:{in:itemIds}}}),
    prisma.depositRule.findFirst({where:{organizationId:organization.id,isActive:true},orderBy:{createdAt:"desc"}}),
  ]);
  const items=itemsRaw as ItemRow[];
  const allAddons=allAddonsRaw as AddonRow[];
  if(items.length!==itemIds.length)return NextResponse.json({error:"One or more rentals are no longer available for online booking"},{status:404});
  const itemMap=new Map(items.map(i=>[i.id,i]));
  for(const line of lines){const item=itemMap.get(line.itemId)!;const restriction=getItemBookingRestriction(item,rangeStart);if(restriction)return NextResponse.json({error:restriction},{status:409});const available=await getAvailableQuantity(organization.id,item.id,item.quantity,rangeStart,rangeEnd);if(line.quantity>available)return NextResponse.json({error:available>0?`Only ${available} unit(s) of ${item.name} are available for those dates`:`${item.name} is fully booked for those dates`},{status:409});}

  const restrictionClauses:Array<Record<string,unknown>>=[{email:{equals:email,mode:"insensitive"}}];if(phone)restrictionClauses.push({phone});if(deliveryAddress)restrictionClauses.push({address:{equals:deliveryAddress,mode:"insensitive"}});
  const blocked=await prisma.doNotRentRestriction.findFirst({where:{organizationId:organization.id,isActive:true,OR:restrictionClauses as never}});if(blocked)return NextResponse.json({error:"We're unable to complete this booking online. Please contact us directly."},{status:403});

  const selectedAddons:AddonRow[]=[];
  for(const line of lines){for(const addon of allAddons.filter(a=>a.itemId===line.itemId)){if(addon.isRequired||line.addonIds.includes(addon.id))selectedAddons.push(addon);}}
  const subtotal=lines.reduce((sum,line)=>sum+(itemMap.get(line.itemId)?.cost||0)*line.quantity,0),addonsTotal=selectedAddons.reduce((s,a)=>s+a.price,0),deliveryFee=deliveryType==="delivery"?(organization.flatDeliveryFee||0):0;
  let couponDiscount=0;const couponCode=text((body as any).couponCode,100).toUpperCase();if(couponCode){const coupon=await prisma.coupon.findFirst({where:{organizationId:organization.id,code:couponCode}});if(!coupon||!coupon.isActive||(coupon.expiresAt&&coupon.expiresAt<new Date()))return NextResponse.json({error:"That coupon code is invalid or has expired"},{status:400});const pre=subtotal+deliveryFee+addonsTotal;couponDiscount=coupon.discountType==="fixed"?Math.min(coupon.discountAmount,pre):Math.round(pre*coupon.discountAmount)/100;}
  const taxable=Math.max(0,subtotal+addonsTotal-couponDiscount),taxAmount=Math.round(taxable*(organization.taxRate||0))/100,totalAmount=Math.max(0,subtotal+deliveryFee+addonsTotal-couponDiscount+taxAmount),depositAmount=depositRule?(depositRule.type==="flat"?Math.min(depositRule.amount,totalAmount):Math.round(totalAmount*depositRule.amount)/100):totalAmount;

  let order:any;
  try{
    order=await prisma.$transaction(async (tx: Prisma.TransactionClient)=>{
      const resourceIds=await getInventoryResourceIds(tx,organization.id,itemIds);for(const resourceId of resourceIds)await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(hashtext($1))`,`${organization.id}:${resourceId}`);
      const currentItems:ItemRow[]=await tx.item.findMany({where:{id:{in:itemIds},organizationId:organization.id,displayToCustomer:true,status:"available"}});if(currentItems.length!==itemIds.length)throw new Error("ITEM_GONE");const currentMap=new Map(currentItems.map(i=>[i.id,i]));
      const resourceItems:ItemRow[]=await tx.item.findMany({where:{id:{in:resourceIds},organizationId:organization.id}});if(resourceItems.length!==resourceIds.length)throw new Error("ITEM_GONE");const resourceMap=new Map(resourceItems.map(i=>[i.id,i]));
      const requestedDemand=await getRequestedResourceDemand(tx,organization.id,lines);
      for(const [resourceId,requested] of requestedDemand){const resourceItem=resourceMap.get(resourceId);if(!resourceItem)throw new Error("ITEM_GONE");const restriction=getItemBookingRestriction(resourceItem,rangeStart);if(restriction)throw new Error(`RESTRICTION|${restriction}`);const remaining=await getPhysicalAvailableQuantityWithClient(tx,organization.id,resourceId,resourceItem.quantity,rangeStart,rangeEnd);if(requested>remaining)throw new Error(`RESOURCE|${resourceId}|${remaining}`);}
      let customer=await tx.customer.findFirst({where:{organizationId:organization.id,email:{equals:email,mode:"insensitive"}}});
      if(!customer)customer=await tx.customer.create({data:{organizationId:organization.id,firstName,lastName,email,phone:phone||null,address:deliveryAddress||null}});
      else customer=await tx.customer.update({where:{id:customer.id},data:{firstName,lastName,phone:phone||customer.phone,address:deliveryAddress||customer.address}});
      const created=await tx.order.create({data:{organizationId:organization.id,customerId:customer.id,orderNumber:`ORD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`,eventDate:rangeStart,eventEndDate:rangeEnd,deliveryAddress:deliveryAddress||null,deliveryType,status:"pending",source:"online",deliveryFee,subtotal,taxAmount,totalAmount,items:{create:lines.map(line=>({itemId:line.itemId,quantity:line.quantity,price:currentMap.get(line.itemId)!.cost}))},orderAddons:{create:selectedAddons.map(a=>({addonId:a.id,name:a.name,price:a.price}))}}});
      const forwardedFor=request.headers.get("x-forwarded-for");await tx.contract.create({data:{organizationId:organization.id,orderId:created.id,signedAt:new Date(),signatureName,signatureIp:forwardedFor?.split(",")[0].trim()||null,contractText:organization.contractTerms||DEFAULT_TERMS}});return created;
    },{isolationLevel:"Serializable"});
  }catch(err){if(err instanceof Error&&err.message.startsWith("RESOURCE|")){const[,resourceId,availableRaw]=err.message.split("|"),availableNow=Number(availableRaw);const resource=await prisma.item.findFirst({where:{id:resourceId,organizationId:organization.id},select:{name:true}});const name=resource?.name||"required inventory";return NextResponse.json({error:availableNow>0?`Only ${availableNow} unit(s) of ${name} remain for those dates once all items in this reservation are counted.`:`${name} is fully committed for those dates. Please adjust your cart or choose another date.`},{status:409});}if(err instanceof Error&&err.message==="ITEM_GONE")return NextResponse.json({error:"One or more rentals are no longer available for online booking"},{status:404});if(err instanceof Error&&err.message.startsWith("RESTRICTION|"))return NextResponse.json({error:err.message.slice("RESTRICTION|".length)},{status:409});throw err;}

  if(totalAmount<=0||depositAmount<=0){await prisma.order.update({where:{id:order.id},data:{status:"confirmed"}});return NextResponse.json({orderId:order.id,paid:false});}
  const proto=request.headers.get("x-forwarded-proto")||"https",host=request.headers.get("host"),origin=process.env.PUBLIC_BASE_URL||`${proto}://${host}`;
  try{
    const itemSummary=lines.length===1?`${itemMap.get(lines[0].itemId)!.name} × ${lines[0].quantity}`:`${lines.length} rental items`;
    const session=await stripe.checkout.sessions.create({mode:"payment",payment_intent_data:organization.stripeAccountId?{application_fee_amount:Math.round(depositAmount*100*0.03),transfer_data:{destination:organization.stripeAccountId}}:undefined,payment_method_types:["card"],customer_email:email,line_items:[{price_data:{currency:"usd",product_data:{name:`${itemSummary}${depositAmount<totalAmount?" — reservation deposit":" — reservation"}`},unit_amount:Math.round(depositAmount*100)},quantity:1}],success_url:`${origin}/checkout/success?orderId=${order.id}`,cancel_url:`${origin}/checkout?resumeOrderId=${order.id}`,metadata:{orderId:order.id,organizationId:organization.id,paymentKind:depositAmount<totalAmount?"booking_deposit":"booking_checkout"}});
    await prisma.order.update({where:{id:order.id},data:{stripeSessionId:session.id}});return NextResponse.json({url:session.url,orderId:order.id});
  }catch(err){await prisma.contract.deleteMany({where:{orderId:order.id,organizationId:organization.id}}).catch(()=>undefined);await prisma.orderAddon.deleteMany({where:{orderId:order.id}}).catch(()=>undefined);await prisma.orderItem.deleteMany({where:{orderId:order.id}}).catch(()=>undefined);await prisma.order.delete({where:{id:order.id}}).catch(()=>undefined);console.error("checkout session creation failed",err);return NextResponse.json({error:"We couldn't start payment. Your card was not charged and the booking was not created. Please try again."},{status:502});}
}
