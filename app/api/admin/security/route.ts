import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { requirePlatformAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export async function GET(){
  await requirePlatformAdmin();
  const [admins,throttles]=await Promise.all([
    prisma.user.findMany({
      where:{role:"platform_admin"},
      select:{id:true,name:true,username:true,isActive:true,lastLoginAt:true,createdAt:true,updatedAt:true},
      orderBy:{createdAt:"asc"},
    }),
    prisma.loginThrottle.findMany({orderBy:{updatedAt:"desc"},take:100}),
  ]);
  return NextResponse.json({admins,throttles});
}

export async function POST(req:NextRequest){
  const session=await requirePlatformAdmin();
  const actor=(session.user as any)?.id||"platform_admin";
  const body=await req.json().catch(()=>({}));
  const action=String(body.action||"");

  let platformOrg=await prisma.organization.findUnique({where:{slug:"_platform_internal"}});
  if(!platformOrg)return NextResponse.json({error:"Platform internal organization is missing."},{status:500});

  if(action==="admin.create"){
    const name=String(body.name||"").trim(),username=String(body.username||"").trim(),password=String(body.password||"");
    if(name.length<2||username.length<3||password.length<12)return NextResponse.json({error:"Name, username, and a 12+ character password are required."},{status:400});
    const duplicate=await prisma.user.findFirst({where:{role:"platform_admin",username}});
    if(duplicate)return NextResponse.json({error:"That platform-admin username already exists."},{status:409});
    const hash=await bcrypt.hash(password,12);
    const admin=await prisma.user.create({data:{organizationId:platformOrg.id,name,username,password:hash,role:"platform_admin",isActive:true,forcePasswordReset:true}});
    await prisma.auditLog.create({data:{action:"platform.admin.created",performedBy:actor,details:JSON.stringify({adminId:admin.id,username,name})}});
    return NextResponse.json({success:true,id:admin.id});
  }

  const id=String(body.id||"");
  const target=await prisma.user.findFirst({where:{id,role:"platform_admin"}});
  if(!target)return NextResponse.json({error:"Platform administrator not found."},{status:404});

  if(action==="admin.toggle"){
    if(target.id===actor&&body.isActive===false)return NextResponse.json({error:"You cannot disable your own current platform-admin account."},{status:400});
    await prisma.user.update({where:{id},data:{isActive:Boolean(body.isActive)}});
    await prisma.auditLog.create({data:{action:Boolean(body.isActive)?"platform.admin.enabled":"platform.admin.disabled",performedBy:actor,details:JSON.stringify({adminId:id,username:target.username})}});
    return NextResponse.json({success:true});
  }

  if(action==="admin.reset_password"){
    const password=String(body.password||"");
    if(password.length<12)return NextResponse.json({error:"New password must be at least 12 characters."},{status:400});
    const hash=await bcrypt.hash(password,12);
    await prisma.user.update({where:{id},data:{password:hash,forcePasswordReset:true,isActive:true}});
    await prisma.auditLog.create({data:{action:"platform.admin.password_reset",performedBy:actor,details:JSON.stringify({adminId:id,username:target.username})}});
    return NextResponse.json({success:true});
  }

  if(action==="throttle.clear"){
    const throttleId=String(body.throttleId||"");
    await prisma.loginThrottle.delete({where:{id:throttleId}}).catch(()=>null);
    await prisma.auditLog.create({data:{action:"platform.login_throttle.cleared",performedBy:actor,details:JSON.stringify({throttleId})}});
    return NextResponse.json({success:true});
  }

  return NextResponse.json({error:"Unknown security action."},{status:400});
}
