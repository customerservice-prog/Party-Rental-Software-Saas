import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveCustomerPortalToken } from "@/lib/customerPortal";

const DEFAULT_TERMS="By signing below, you agree to the rental company's rental terms and accept financial responsibility for the rented equipment during the rental period.";

export async function POST(req:NextRequest,{params: paramsPromise}:{params:Promise<{token:string}>}){
  const params = await paramsPromise;

  const access=await resolveCustomerPortalToken(params.token);
  if(!access)return NextResponse.json({error:"This customer portal link is invalid or expired."},{status:404});

  const body=await req.json().catch(()=>({}));
  const signatureName=typeof body.signatureName==="string"?body.signatureName.trim().slice(0,200):"";
  const accepted=body.accepted===true;
  if(!signatureName)return NextResponse.json({error:"Type your full legal name to sign."},{status:400});
  if(!accepted)return NextResponse.json({error:"You must accept the rental agreement before signing."},{status:400});

  const order=await prisma.order.findFirst({
    where:{id:access.orderId,organizationId:access.organizationId},
    include:{
      organization:{select:{contractTerms:true,name:true}},
      contract:true,
      customer:{select:{firstName:true,lastName:true}},
    },
  });
  if(!order)return NextResponse.json({error:"Order not found."},{status:404});
  if(["cancelled","canceled"].includes(order.status.toLowerCase()))return NextResponse.json({error:"This order has been canceled."},{status:409});
  if(order.contract?.signedAt)return NextResponse.json({error:"This rental agreement is already signed."},{status:409});

  const forwardedFor=req.headers.get("x-forwarded-for");
  const signatureIp=forwardedFor?.split(",")[0]?.trim()||req.headers.get("x-real-ip")||null;
  const contractText=order.contract?.contractText||order.organization.contractTerms||DEFAULT_TERMS;

  await prisma.$transaction(async tx=>{
    if(order.contract){
      await tx.contract.update({
        where:{id:order.contract.id},
        data:{contractText,signedAt:new Date(),signatureName,signatureIp},
      });
    }else{
      await tx.contract.create({
        data:{
          organizationId:order.organizationId,
          orderId:order.id,
          contractText,
          signedAt:new Date(),
          signatureName,
          signatureIp,
        },
      });
    }
    await tx.auditLog.create({
      data:{
        organizationId:order.organizationId,
        action:"contract.signed.customer_portal",
        performedBy:`customer_portal:${access.id}`,
        details:JSON.stringify({orderId:order.id,orderNumber:order.orderNumber,signatureName}),
      },
    });
  });

  return NextResponse.json({success:true,signedAt:new Date().toISOString(),signatureName});
}
