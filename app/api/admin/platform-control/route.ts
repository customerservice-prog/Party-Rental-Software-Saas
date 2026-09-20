import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { requirePlatformAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const nullableNumber=(schema:z.ZodNumber)=>z.preprocess(
  value=>value===null||value===""||value===undefined?null:typeof value==="string"?Number(value):value,
  schema.nullable()
);
const planSchema=z.object({
  monthlyPrice:nullableNumber(z.number().finite().min(0).max(1000000)),
  annualMonthlyPrice:nullableNumber(z.number().finite().min(0).max(1000000)),
  trialDays:nullableNumber(z.number().int().min(0).max(365)),
  officeUsers:nullableNumber(z.number().int().min(0).max(1000000)),
  crewUsers:nullableNumber(z.number().int().min(0).max(1000000)),
  locations:nullableNumber(z.number().int().min(0).max(1000000)),
  isEnabled:z.boolean().default(true),
});

type FlagRow={id:string;key:string;label:string;description:string|null;enabledGlobally:boolean;planTiers:unknown;organizationIds:unknown;createdBy:string|null;createdAt:Date;updatedAt:Date};
type AnnouncementRow={id:string;title:string;body:string;tone:string;audienceType:string;audienceValue:string|null;status:string;startsAt:Date|null;endsAt:Date|null;createdBy:string|null;createdAt:Date;updatedAt:Date};
type SettingRow={key:string;value:unknown;updatedBy:string|null;updatedAt:Date};
type PlanRow={planCode:string;monthlyPrice:number|null;annualMonthlyPrice:number|null;trialDays:number|null;officeUsers:number|null;crewUsers:number|null;locations:number|null;isEnabled:boolean;updatedBy:string|null;updatedAt:Date};

function asStringArray(v:unknown){
  return Array.isArray(v)?v.map(String).filter(Boolean):[];
}
function dateOrNull(v:unknown){
  if(!v)return null;
  const d=new Date(String(v));
  return isNaN(d.getTime())?null:d;
}

export async function GET(){
  await requirePlatformAdmin();
  const [flags,announcements,settings,plans]=await Promise.all([
    prisma.$queryRawUnsafe(`SELECT * FROM "PlatformFeatureFlag" ORDER BY "label" ASC`) as Promise<FlagRow[]>,
    prisma.$queryRawUnsafe(`SELECT * FROM "PlatformAnnouncement" ORDER BY "createdAt" DESC LIMIT 200`) as Promise<AnnouncementRow[]>,
    prisma.$queryRawUnsafe(`SELECT * FROM "PlatformSetting" ORDER BY "key" ASC`) as Promise<SettingRow[]>,
    prisma.$queryRawUnsafe(`SELECT * FROM "PlatformPlanOverride" ORDER BY "planCode" ASC`) as Promise<PlanRow[]>,
  ]);
  return NextResponse.json({flags,announcements,settings,plans});
}

export async function POST(req:NextRequest){
  const session=await requirePlatformAdmin();
  const actor=(session.user as any)?.id||"platform_admin";
  const body=await req.json().catch(()=>({}));
  const action=String(body.action||"");

  if(action==="flag.upsert"){
    const key=String(body.key||"").trim().toLowerCase().replace(/[^a-z0-9_.-]/g,"");
    const label=String(body.label||"").trim();
    if(!key||!label)return NextResponse.json({error:"Flag key and label are required."},{status:400});
    const id=String(body.id||"")||randomUUID();
    await prisma.$executeRawUnsafe(
      `INSERT INTO "PlatformFeatureFlag" ("id","key","label","description","enabledGlobally","planTiers","organizationIds","createdBy","createdAt","updatedAt")
       VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
       ON CONFLICT ("key") DO UPDATE SET "label"=EXCLUDED."label","description"=EXCLUDED."description","enabledGlobally"=EXCLUDED."enabledGlobally","planTiers"=EXCLUDED."planTiers","organizationIds"=EXCLUDED."organizationIds","updatedAt"=CURRENT_TIMESTAMP`,
      id,key,label,String(body.description||"").trim()||null,Boolean(body.enabledGlobally),
      JSON.stringify(asStringArray(body.planTiers)),JSON.stringify(asStringArray(body.organizationIds)),actor
    );
    await prisma.auditLog.create({data:{action:"platform.feature_flag.updated",performedBy:actor,details:JSON.stringify({key,label,enabledGlobally:Boolean(body.enabledGlobally)})}});
    return NextResponse.json({success:true});
  }

  if(action==="flag.delete"){
    const key=String(body.key||"");
    await prisma.$executeRawUnsafe(`DELETE FROM "PlatformFeatureFlag" WHERE "key"=$1`,key);
    await prisma.auditLog.create({data:{action:"platform.feature_flag.deleted",performedBy:actor,details:JSON.stringify({key})}});
    return NextResponse.json({success:true});
  }

  if(action==="announcement.upsert"){
    const title=String(body.title||"").trim();
    const message=String(body.body||"").trim();
    if(!title||!message)return NextResponse.json({error:"Announcement title and message are required."},{status:400});
    const id=String(body.id||"")||randomUUID();
    const tone=["info","warning","danger","success"].includes(String(body.tone))?String(body.tone):"info";
    const audienceType=["all","plan","organization"].includes(String(body.audienceType))?String(body.audienceType):"all";
    const status=["draft","published","archived"].includes(String(body.status))?String(body.status):"draft";
    const audienceValue=String(body.audienceValue||"").trim()||null;
    const startsAt=dateOrNull(body.startsAt),endsAt=dateOrNull(body.endsAt);
    if((body.startsAt&&!startsAt)||(body.endsAt&&!endsAt)||(startsAt&&endsAt&&endsAt<=startsAt))return NextResponse.json({error:"Enter valid dates with the end after the start."},{status:400});
    if(audienceType!=="all"&&!audienceValue)return NextResponse.json({error:"Choose an audience for this announcement."},{status:400});
    if(audienceType==="plan"&&!["starter","growth","pro","enterprise"].includes(audienceValue!))return NextResponse.json({error:"Choose one valid plan code."},{status:400});
    if(audienceType==="organization"&&!await prisma.organization.findFirst({where:{id:audienceValue!,slug:{not:"_platform_internal"}},select:{id:true}}))return NextResponse.json({error:"Tenant organization not found."},{status:400});
    await prisma.$executeRawUnsafe(
      `INSERT INTO "PlatformAnnouncement" ("id","title","body","tone","audienceType","audienceValue","status","startsAt","endsAt","createdBy","createdAt","updatedAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
       ON CONFLICT ("id") DO UPDATE SET "title"=EXCLUDED."title","body"=EXCLUDED."body","tone"=EXCLUDED."tone","audienceType"=EXCLUDED."audienceType","audienceValue"=EXCLUDED."audienceValue","status"=EXCLUDED."status","startsAt"=EXCLUDED."startsAt","endsAt"=EXCLUDED."endsAt","updatedAt"=CURRENT_TIMESTAMP`,
      id,title,message,tone,audienceType,audienceType==="all"?null:audienceValue,status,startsAt,endsAt,actor
    );
    await prisma.auditLog.create({data:{action:"platform.announcement.updated",performedBy:actor,details:JSON.stringify({id,title,status,audienceType,audienceValue:body.audienceValue||null})}});
    return NextResponse.json({success:true,id});
  }

  if(action==="announcement.delete"){
    const id=String(body.id||"");
    await prisma.$executeRawUnsafe(`DELETE FROM "PlatformAnnouncement" WHERE "id"=$1`,id);
    await prisma.auditLog.create({data:{action:"platform.announcement.deleted",performedBy:actor,details:JSON.stringify({id})}});
    return NextResponse.json({success:true});
  }

  if(action==="setting.set"){
    const key=String(body.key||"").trim().toLowerCase().replace(/[^a-z0-9_.-]/g,"");
    if(!key)return NextResponse.json({error:"Setting key is required."},{status:400});
    await prisma.$executeRawUnsafe(
      `INSERT INTO "PlatformSetting" ("key","value","updatedBy","updatedAt") VALUES ($1,$2::jsonb,$3,CURRENT_TIMESTAMP)
       ON CONFLICT ("key") DO UPDATE SET "value"=EXCLUDED."value","updatedBy"=EXCLUDED."updatedBy","updatedAt"=CURRENT_TIMESTAMP`,
      key,JSON.stringify(body.value),actor
    );
    await prisma.auditLog.create({data:{action:"platform.setting.updated",performedBy:actor,details:JSON.stringify({key})}});
    return NextResponse.json({success:true});
  }

  if(action==="plan.upsert"){
    const planCode=String(body.planCode||"").trim().toLowerCase();
    if(!["starter","growth","pro","enterprise"].includes(planCode))return NextResponse.json({error:"Invalid plan code."},{status:400});
    const parsed=planSchema.safeParse(body);
    if(!parsed.success)return NextResponse.json({error:"Prices must be non-negative finite amounts; limits must be non-negative whole numbers and trial days must be between 0 and 365."},{status:400});
    const plan=parsed.data;
    await prisma.$executeRawUnsafe(
      `INSERT INTO "PlatformPlanOverride" ("planCode","monthlyPrice","annualMonthlyPrice","trialDays","officeUsers","crewUsers","locations","isEnabled","updatedBy","updatedAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,CURRENT_TIMESTAMP)
       ON CONFLICT ("planCode") DO UPDATE SET "monthlyPrice"=EXCLUDED."monthlyPrice","annualMonthlyPrice"=EXCLUDED."annualMonthlyPrice","trialDays"=EXCLUDED."trialDays","officeUsers"=EXCLUDED."officeUsers","crewUsers"=EXCLUDED."crewUsers","locations"=EXCLUDED."locations","isEnabled"=EXCLUDED."isEnabled","updatedBy"=EXCLUDED."updatedBy","updatedAt"=CURRENT_TIMESTAMP`,
      planCode,plan.monthlyPrice,plan.annualMonthlyPrice,plan.trialDays,plan.officeUsers,plan.crewUsers,plan.locations,plan.isEnabled,actor
    );
    await prisma.auditLog.create({data:{action:"platform.plan_override.updated",performedBy:actor,details:JSON.stringify({planCode})}});
    return NextResponse.json({success:true});
  }

  return NextResponse.json({error:"Unknown platform control action."},{status:400});
}
