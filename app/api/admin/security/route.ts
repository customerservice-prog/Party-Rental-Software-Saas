import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { requirePlatformAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { generateTotpSecret, encryptTotpSecret, decryptTotpSecret, totpUri, verifyTotp } from "@/lib/totp";

export async function GET(){
  await requirePlatformAdmin();
  const [admins,throttles]=await Promise.all([
    prisma.user.findMany({
      where:{role:"platform_admin"},
      select:{id:true,name:true,username:true,isActive:true,lastLoginAt:true,createdAt:true,updatedAt:true,mfaEnabled:true},
      orderBy:{createdAt:"asc"},
    }),
    prisma.loginThrottle.findMany({orderBy:{updatedAt:"desc"},take:100}),
  ]);
  const session=await requirePlatformAdmin();
  return NextResponse.json({admins,throttles,currentAdminId:(session.user as any)?.id||null});
}

export async function POST(req:NextRequest){
  const session=await requirePlatformAdmin();
  const actor=(session.user as any)?.id||"platform_admin";
  const body=await req.json().catch(()=>({}));
  const action=String(body.action||"");

  let platformOrg=await prisma.organization.findUnique({where:{slug:"_platform_internal"}});
  if(!platformOrg)return NextResponse.json({error:"Platform internal organization is missing."},{status:500});

  if(action==="mfa.start"){
    const secret=generateTotpSecret();
    const username=(session.user as any)?.name||"platform-admin";
    return NextResponse.json({success:true,secret,uri:totpUri(secret,username)});
  }

  if(action==="mfa.enable"){
    const secret=String(body.secret||"");
    const code=String(body.code||"");
    if(!secret||!verifyTotp(secret,code))return NextResponse.json({error:"Authenticator code is invalid. Check your device time and try again."},{status:400});
    await prisma.user.update({where:{id:actor},data:{mfaEnabled:true,mfaSecret:encryptTotpSecret(secret)}});
    await prisma.auditLog.create({data:{action:"platform.admin.mfa_enabled",performedBy:actor,details:"TOTP MFA enabled for current platform administrator"}});
    return NextResponse.json({success:true});
  }

  if(action==="mfa.disable"){
    const current=await prisma.user.findFirst({where:{id:actor,role:"platform_admin"}});
    if(!current)return NextResponse.json({error:"Administrator account not found."},{status:404});
    const code=String(body.code||"");
    if(current.mfaEnabled){
      if(!current.mfaSecret||!verifyTotp(decryptTotpSecret(current.mfaSecret),code))return NextResponse.json({error:"Enter a valid authenticator code to disable MFA."},{status:400});
    }
    await prisma.user.update({where:{id:actor},data:{mfaEnabled:false,mfaSecret:null}});
    await prisma.auditLog.create({data:{action:"platform.admin.mfa_disabled",performedBy:actor,details:"TOTP MFA disabled for current platform administrator"}});
    return NextResponse.json({success:true});
  }

  if(action==="admin.create"){
    const name=String(body.name||"").trim(),username=String(body.username||"").trim(),password=String(body.password||"");
    if(name.length<2||username.length<3||password.length<12)return NextResponse.json({error:"Name, username, and a 12+ character password are required."},{status:400});
    const duplicate=await prisma.user.findFirst({where:{role:"platform_admin",username}});
    if(duplicate)return NextResponse.json({error:"That platform-admin username already exists."},{status:409});
    const hash=await bcrypt.hash(password,12);
    const admin=await prisma.user.create({data:{organizationId:platformOrg.id,name,username,password:hash,role:"platform_admin",isActive:true,forcePasswordReset:false}});
    await prisma.auditLog.create({data:{action:"platform.admin.created",performedBy:actor,details:JSON.stringify({adminId:admin.id,username,name})}});
    return NextResponse.json({success:true,id:admin.id});
  }

  const id=String(body.id||"");
  const target=await prisma.user.findFirst({where:{id,role:"platform_admin"}});
  if(!target)return NextResponse.json({error:"Platform administrator not found."},{status:404});

  if(action==="admin.mfa_reset"){
    if(target.id===actor)return NextResponse.json({error:"Use your authenticator code to disable MFA on your own account."},{status:400});
    await prisma.user.update({where:{id},data:{mfaEnabled:false,mfaSecret:null}});
    await prisma.auditLog.create({data:{action:"platform.admin.mfa_reset",performedBy:actor,details:JSON.stringify({adminId:id,username:target.username})}});
    return NextResponse.json({success:true});
  }

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
    await prisma.user.update({where:{id},data:{password:hash,forcePasswordReset:false,isActive:true}});
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
