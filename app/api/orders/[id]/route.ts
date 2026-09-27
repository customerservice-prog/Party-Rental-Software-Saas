import {NextRequest,NextResponse} from "next/server";
import {requireCurrentOrganization} from "@/lib/tenant";
import {requirePermission,authzErrorResponse} from "@/lib/authz";
import {prisma} from "@/lib/prisma";

export async function PATCH(request:NextRequest,{params:paramsPromise}:{params:Promise<{id:string}>}){
  const params=await paramsPromise;
  const organization=await requireCurrentOrganization();let actor;
  try{actor=await requirePermission(organization.id,"orders.manage")}catch(err){return authzErrorResponse(err)}
  const order=await prisma.order.findFirst({where:{id:params.id,organizationId:organization.id}});
  if(!order)return NextResponse.json({error:"Order not found"},{status:404});
  const body=await request.json();
  const data:Record<string,unknown>={};
  if(body.deliveryAddress!==undefined){
    if(typeof body.deliveryAddress!=="string")return NextResponse.json({error:"Delivery address must be text"},{status:400});
    const value=body.deliveryAddress.trim().slice(0,500);
    data.deliveryAddress=value||null;
  }
  if(!Object.keys(data).length)return NextResponse.json({order});
  const updated=await prisma.order.update({where:{id:order.id},data});
  await prisma.auditLog.create({data:{organizationId:organization.id,action:"order.updated",performedBy:actor.id,details:JSON.stringify({orderId:order.id,fields:Object.keys(data)})}});
  return NextResponse.json({order:updated});
}
