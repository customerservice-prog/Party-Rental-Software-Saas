import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export async function GET(_req:Request,{params: paramsPromise}:{params:Promise<{id:string}>}){
  const params = await paramsPromise;

  const session=await requirePlatformAdmin('data');
  const org=await prisma.organization.findFirst({
    where:{id:params.id,slug:{not:"_platform_internal"}},
    select:{
      id:true,name:true,slug:true,customDomain:true,planTier:true,stripeAccountId:true,status:true,trialEndsAt:true,
      logoUrl:true,primaryColor:true,tagline:true,heroImageUrl:true,seoTitle:true,seoDescription:true,aboutText:true,contractTerms:true,
      facebookUrl:true,instagramUrl:true,showHoursOnSite:true,flatDeliveryFee:true,taxRate:true,contactEmail:true,contactPhone:true,
      senderEmail:true,senderName:true,twilioFromNumber:true,autoConfirmationEnabled:true,autoReminderEnabled:true,reminderDaysBefore:true,
      autoBalanceReminderEnabled:true,balanceReminderDaysBefore:true,address:true,city:true,state:true,zip:true,timezone:true,createdAt:true,updatedAt:true,
      subscription:true,
      users:{select:{id:true,name:true,username:true,role:true,isActive:true,lastLoginAt:true,forcePasswordReset:true,tenantRoleId:true,createdAt:true,updatedAt:true}},
      tenantRoles:true,categories:true,items:true,itemUnits:true,customers:true,
      drivers:{select:{id:true,organizationId:true,name:true,phone:true,email:true,isActive:true,defaultStopPay:true,createdAt:true,updatedAt:true}},
      coupons:true,depositRules:true,
      businessHours:true,closedDates:true,addons:true,pages:true,website:true,messageTemplates:true,meetings:true,
    },
  });
  if(!org)return NextResponse.json({error:"Organization not found."},{status:404});

  const [orders,payments,contracts,tasks,sentMessages,doNotRent,blockedAttempts]=await Promise.all([
    prisma.order.findMany({where:{organizationId:org.id},include:{items:true,orderAddons:true},orderBy:{createdAt:"asc"}}),
    prisma.payment.findMany({where:{organizationId:org.id},orderBy:{createdAt:"asc"}}),
    prisma.contract.findMany({where:{organizationId:org.id},orderBy:{createdAt:"asc"}}),
    prisma.task.findMany({where:{organizationId:org.id},orderBy:{createdAt:"asc"}}),
    prisma.sentMessage.findMany({where:{organizationId:org.id},orderBy:{createdAt:"asc"}}),
    prisma.doNotRentRestriction.findMany({where:{organizationId:org.id},orderBy:{createdAt:"asc"}}),
    prisma.blockedBookingAttempt.findMany({where:{organizationId:org.id},orderBy:{createdAt:"asc"}}),
  ]);

  await prisma.auditLog.create({data:{
    organizationId:org.id,
    action:"platform.tenant.exported",
    performedBy:(session.user as any)?.id||"platform_admin",
    details:JSON.stringify({slug:org.slug}),
  }});

  const snapshot={
    exportedAt:new Date().toISOString(),
    platform:"Party Rental CRM",
    organization:org,
    businessData:{orders,payments,contracts,tasks,sentMessages,doNotRent,blockedAttempts},
  };
  return new NextResponse(JSON.stringify(snapshot,null,2),{
    headers:{
      "Content-Type":"application/json; charset=utf-8",
      "Content-Disposition":`attachment; filename="${org.slug}-tenant-export.json"`,
      "Cache-Control":"no-store",
    },
  });
}
