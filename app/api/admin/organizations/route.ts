import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { requirePlatformAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { TRIAL_DAYS } from "@/lib/plans";

const schema=z.object({
  businessName:z.string().min(2),
  slug:z.string().min(3).regex(/^[a-z0-9-]+$/),
  contactEmail:z.string().email(),
  ownerName:z.string().min(2),
  username:z.string().min(3),
  password:z.string().min(12),
  planTier:z.enum(["starter","growth","pro","enterprise"]).default("starter"),
  trialDays:z.number().int().min(0).max(365).default(TRIAL_DAYS),
});

const DEFAULT_ROLES=[
  {name:"Manager",slug:"manager",permissions:["orders.view","orders.manage","orders.export","customers.view","customers.manage","customers.message","inventory.view","inventory.manage","drivers.view","drivers.manage","reports.view","coupons.manage"]},
  {name:"Front Desk",slug:"front-desk",permissions:["orders.view","orders.manage","customers.view","customers.manage","customers.message","inventory.view"]},
  {name:"Driver",slug:"driver",permissions:["orders.view","drivers.view"]},
];

export async function POST(req:NextRequest){
  const session=await requirePlatformAdmin();
  const body=await req.json().catch(()=>({}));
  const parsed=schema.safeParse(body);
  if(!parsed.success)return NextResponse.json({error:"Check the organization, owner, and password fields.",details:parsed.error.flatten()},{status:400});
  const data=parsed.data;
  if(await prisma.organization.findUnique({where:{slug:data.slug}}))return NextResponse.json({error:"That tenant subdomain is already in use."},{status:409});

  const passwordHash=await bcrypt.hash(data.password,12);
  const trialEndsAt=new Date();
  trialEndsAt.setDate(trialEndsAt.getDate()+data.trialDays);

  const organization=await prisma.organization.create({
    data:{
      name:data.businessName,
      slug:data.slug,
      contactEmail:data.contactEmail,
      planTier:data.planTier,
      status:data.trialDays>0?"trial":"active",
      trialEndsAt:data.trialDays>0?trialEndsAt:null,
      users:{create:{name:data.ownerName,username:data.username,password:passwordHash,role:"owner",isActive:true,forcePasswordReset:true}},
      subscription:{create:{planTier:data.planTier,status:data.trialDays>0?"trialing":"active"}},
      tenantRoles:{create:DEFAULT_ROLES.map(r=>({...r,isSystem:true}))},
    },
  });

  await prisma.auditLog.create({data:{
    organizationId:organization.id,
    action:"platform.tenant.created",
    performedBy:(session.user as any)?.id||"platform_admin",
    details:JSON.stringify({slug:organization.slug,planTier:data.planTier,trialDays:data.trialDays,owner:data.ownerName}),
  }});

  return NextResponse.json({success:true,organizationId:organization.id,slug:organization.slug},{status:201});
}
