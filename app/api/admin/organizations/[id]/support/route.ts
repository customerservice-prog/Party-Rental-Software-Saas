import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { requirePlatformAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

type SupportNote={id:string;organizationId:string;body:string;createdBy:string;createdAt:Date;updatedAt:Date};

async function getTenant(id:string){
  return prisma.organization.findFirst({
    where:{id,slug:{not:"_platform_internal"}},
    select:{
      id:true,name:true,slug:true,status:true,contactEmail:true,contactPhone:true,customDomain:true,
      stripeAccountId:true,resendApiKey:true,senderEmail:true,twilioAccountSid:true,twilioAuthToken:true,twilioFromNumber:true,createdAt:true,
      users:{select:{id:true,name:true,username:true,role:true,isActive:true,lastLoginAt:true,createdAt:true,forcePasswordReset:true,tenantRole:{select:{name:true}}},orderBy:{createdAt:"asc"}},
      _count:{select:{items:true,customers:true,orders:true,pages:true,drivers:true,sentMessages:true}},
      website:{select:{publishedAt:true}},
    },
  });
}

export async function GET(_req:NextRequest,{params: paramsPromise}:{params:Promise<{id:string}>}){
  const params = await paramsPromise;

  await requirePlatformAdmin('support');
  const organization=await getTenant(params.id);
  if(!organization)return NextResponse.json({error:"Organization not found."},{status:404});
  const notes=(await prisma.$queryRawUnsafe(
    `SELECT * FROM "TenantSupportNote" WHERE "organizationId"=$1 ORDER BY "createdAt" DESC LIMIT 100`,
    organization.id
  )) as SupportNote[];
  const failedMessages=await prisma.sentMessage.count({where:{organizationId:organization.id,status:"failed"}});
  const blockedAttempts=await prisma.blockedBookingAttempt.count({where:{organizationId:organization.id}});
  const {resendApiKey,twilioAccountSid,twilioAuthToken,...safeOrganization}=organization;
  return NextResponse.json({organization:{...safeOrganization,
    emailConfigured:Boolean(resendApiKey&&organization.senderEmail),
    smsConfigured:Boolean(twilioAccountSid&&twilioAuthToken&&organization.twilioFromNumber),
  },notes,health:{failedMessages,blockedAttempts}},{headers:{"Cache-Control":"no-store"}});
}

export async function POST(req:NextRequest,{params: paramsPromise}:{params:Promise<{id:string}>}){
  const params = await paramsPromise;

  const session=await requirePlatformAdmin('support');
  const actor=(session.user as any)?.id||"platform_admin";
  const tenant=await prisma.organization.findFirst({where:{id:params.id,slug:{not:"_platform_internal"}},select:{id:true,name:true,slug:true}});
  if(!tenant)return NextResponse.json({error:"Organization not found."},{status:404});
  const body=await req.json().catch(()=>({}));
  const action=String(body.action||"");

  if(action==="note.create"){
    const note=String(body.body||"").trim();
    if(!note)return NextResponse.json({error:"Enter a support note."},{status:400});
    const id=randomUUID();
    await prisma.$executeRawUnsafe(
      `INSERT INTO "TenantSupportNote" ("id","organizationId","body","createdBy","createdAt","updatedAt") VALUES ($1,$2,$3,$4,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`,
      id,tenant.id,note.slice(0,5000),actor
    );
    await prisma.auditLog.create({data:{organizationId:tenant.id,action:"platform.support_note.created",performedBy:actor,details:note.slice(0,500)}});
    return NextResponse.json({success:true,id});
  }

  if(["user.enable","user.disable","user.reset_password","user.transfer_owner","user.revoke_sessions"].includes(action)){
    const userId=String(body.userId||"");
    const user=await prisma.user.findFirst({where:{id:userId,organizationId:tenant.id,role:{not:"platform_admin"}}});
    if(!user)return NextResponse.json({error:"Tenant user not found."},{status:404});

    if(action==="user.enable"||action==="user.disable"){
      const isActive=action==="user.enable";
      await prisma.user.update({where:{id:user.id},data:{isActive,...(!isActive?{sessionVersion:{increment:1}}:{})}});
      await prisma.auditLog.create({data:{organizationId:tenant.id,action:isActive?"platform.user.enabled":"platform.user.disabled",performedBy:actor,details:JSON.stringify({userId:user.id,username:user.username,name:user.name})}});
      return NextResponse.json({success:true});
    }

    if(action==="user.reset_password"){
      const password=String(body.password||"");
      if(password.length<12)return NextResponse.json({error:"Temporary password must be at least 12 characters."},{status:400});
      const hash=await bcrypt.hash(password,12);
      await prisma.user.update({where:{id:user.id},data:{password:hash,forcePasswordReset:true,isActive:true,sessionVersion:{increment:1}}});
      await prisma.auditLog.create({data:{organizationId:tenant.id,action:"platform.user.password_reset",performedBy:actor,details:JSON.stringify({userId:user.id,username:user.username})}});
      return NextResponse.json({success:true});
    }

    if(action==="user.revoke_sessions"){
      await prisma.user.update({where:{id:user.id},data:{sessionVersion:{increment:1}}});
      await prisma.auditLog.create({data:{organizationId:tenant.id,action:"platform.user.sessions_revoked",performedBy:actor,details:JSON.stringify({userId:user.id,username:user.username})}});
      return NextResponse.json({success:true});
    }

    if(action==="user.transfer_owner"){
      await prisma.$transaction(async tx=>{
        await tx.user.updateMany({where:{organizationId:tenant.id,role:"owner",id:{not:user.id}},data:{role:"staff",sessionVersion:{increment:1}}});
        await tx.user.update({where:{id:user.id},data:{role:"owner",isActive:true,sessionVersion:{increment:1}}});
        await tx.auditLog.create({data:{organizationId:tenant.id,action:"platform.ownership.transferred",performedBy:actor,details:JSON.stringify({newOwnerId:user.id,newOwner:user.name})}});
      });
      return NextResponse.json({success:true});
    }
  }

  if(action==="tenant.archive"){
    if(String(body.confirmSlug||"")!==tenant.slug)return NextResponse.json({error:"Type the exact tenant slug to archive this account."},{status:400});
    await prisma.organization.update({where:{id:tenant.id},data:{status:"suspended"}});
    await prisma.auditLog.create({data:{organizationId:tenant.id,action:"platform.tenant.archived",performedBy:actor,details:JSON.stringify({slug:tenant.slug})}});
    return NextResponse.json({success:true});
  }

  return NextResponse.json({error:"Unknown support action."},{status:400});
}
