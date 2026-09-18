import { NextResponse } from "next/server";
import { requireCurrentOrganization } from "@/lib/tenant";
import { requirePermission, authzErrorResponse } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { optimizeRentalRoute } from "@/lib/routeOptimization";

export async function POST(_req:Request,{params}:{params:{runId:string}}){
  const organization=await requireCurrentOrganization();
  try{await requirePermission(organization.id,"drivers.manage")}catch(err){return authzErrorResponse(err)}
  const run=await prisma.driverRun.findFirst({where:{id:params.runId,organizationId:organization.id},include:{stops:{include:{order:true}}}});
  if(!run)return NextResponse.json({error:"Run not found."},{status:404});
  if(run.stops.length<2)return NextResponse.json({ok:true,strategy:"schedule_fallback",message:"This run has fewer than two stops; no optimization is needed."});
  const origin=[organization.address,organization.city,organization.state,organization.zip].filter(Boolean).join(", ");
  const result=await optimizeRentalRoute({originAddress:origin||null,stops:run.stops.map(s=>({id:s.id,address:s.order.deliveryAddress||"",eventDate:s.order.eventDate}))});
  const orderIndex=new Map(result.orderedIds.map((id,i)=>[id,i+1]));
  await prisma.$transaction(run.stops.map(stop=>prisma.driverRunStop.update({where:{id:stop.id},data:{stopOrder:orderIndex.get(stop.id)??stop.stopOrder}})));
  return NextResponse.json({ok:true,...result});
}
