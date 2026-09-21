import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requirePlatformAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { SUPPORT_COOKIE, SUPPORT_SECONDS, createSupportSession, readSupportSessionDetails } from "@/lib/supportSession";

export async function POST(req:NextRequest,{params: paramsPromise}:{params:Promise<{id:string}>}){
  const params = await paramsPromise;

  const session=await requirePlatformAdmin();
  const organization=await prisma.organization.findFirst({
    where:{id:params.id,slug:{not:"_platform_internal"}},
    select:{id:true,name:true,slug:true,status:true},
  });
  if(!organization)return NextResponse.json({error:"Tenant organization not found."},{status:404});
  const body=await req.json().catch(()=>({}));
  const userId=typeof body.userId==="string"?body.userId.trim():"";
  const user=await prisma.user.findFirst({
    where:{organizationId:organization.id,isActive:true,...(userId?{id:userId,role:{in:["owner","staff"]}}:{role:"owner"})},
    select:{id:true,name:true,role:true,sessionVersion:true},orderBy:{createdAt:"asc"},
  });
  if(!user)return NextResponse.json({error:userId?"Choose an active user belonging to this tenant.":"This tenant has no active owner. Open the support workspace to choose a staff user."},{status:400});

  const expiresAt=new Date(Date.now()+SUPPORT_SECONDS*1000).toISOString();

  // Record the real actor and effective user before granting the view.
  await prisma.auditLog.create({data:{
    organizationId:organization.id,action:"platform_support_session.started",
    performedBy:(session.user as any).id,
    details:JSON.stringify({tenant:organization.name,slug:organization.slug,viewAsUserId:user.id,viewAsName:user.name,viewAsRole:user.role,expiresAt}),
  }});

  (await cookies()).set(SUPPORT_COOKIE,createSupportSession(organization.id,(session.user as any).id,user.id,user.sessionVersion),{
    httpOnly:true,
    secure:process.env.NODE_ENV==="production",
    sameSite:"lax",
    path:"/",
    maxAge:SUPPORT_SECONDS,
  });

  return NextResponse.json({success:true,organization,viewAs:{id:user.id,name:user.name,role:user.role},expiresAt});
}

export async function DELETE(){
  const session=await requirePlatformAdmin();
  const current=readSupportSessionDetails((await cookies()).get(SUPPORT_COOKIE)?.value,(session.user as any).id);
  (await cookies()).set(SUPPORT_COOKIE,"",{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:0});
  if(current){
    await prisma.auditLog.create({data:{
      organizationId:current.organizationId,
      action:"platform_support_session.ended",
      performedBy:(session.user as any)?.id||"platform_admin",
      details:JSON.stringify({viewAsUserId:current.userId,reason:"Support session ended by platform administrator"}),
    }}).catch(()=>null);
  }
  return NextResponse.json({success:true});
}
