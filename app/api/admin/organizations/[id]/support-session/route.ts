import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requirePlatformAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

const COOKIE="prcrm_support_tenant";

export async function POST(req:NextRequest,{params}:{params:{id:string}}){
  const session=await requirePlatformAdmin();
  const organization=await prisma.organization.findFirst({
    where:{id:params.id,slug:{not:"_platform_internal"}},
    select:{id:true,name:true,slug:true,status:true},
  });
  if(!organization)return NextResponse.json({error:"Tenant organization not found."},{status:404});

  cookies().set(COOKIE,organization.id,{
    httpOnly:true,
    secure:process.env.NODE_ENV==="production",
    sameSite:"lax",
    path:"/",
    maxAge:20*60,
  });

  await prisma.auditLog.create({data:{
    organizationId:organization.id,
    action:"platform_support_session.started",
    performedBy:(session.user as any)?.id||"platform_admin",
    details:JSON.stringify({tenant:organization.name,slug:organization.slug,expiresMinutes:20}),
  }});

  return NextResponse.json({success:true,organization});
}

export async function DELETE(){
  const session=await requirePlatformAdmin();
  const current=cookies().get(COOKIE)?.value||null;
  cookies().set(COOKIE,"",{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:0});
  if(current){
    await prisma.auditLog.create({data:{
      organizationId:current,
      action:"platform_support_session.ended",
      performedBy:(session.user as any)?.id||"platform_admin",
      details:"Support session ended by platform administrator",
    }}).catch(()=>null);
  }
  return NextResponse.json({success:true});
}
