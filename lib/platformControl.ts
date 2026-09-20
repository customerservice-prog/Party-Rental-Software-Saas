import { prisma } from "@/lib/prisma";

export type PlatformAnnouncementRow={
  id:string;title:string;body:string;tone:string;audienceType:string;audienceValue:string|null;
  status:string;startsAt:Date|null;endsAt:Date|null;createdBy:string|null;createdAt:Date;updatedAt:Date;
};
export type PlatformFeatureFlagRow={
  id:string;key:string;label:string;description:string|null;enabledGlobally:boolean;
  planTiers:unknown;organizationIds:unknown;createdBy:string|null;createdAt:Date;updatedAt:Date;
};

function stringArray(value:unknown):string[]{
  if(Array.isArray(value))return value.map(String);
  return [];
}

export async function getActivePlatformAnnouncements(organizationId:string,planTier:string){
  const now=new Date();
  const rows=(await prisma.$queryRawUnsafe(
    `SELECT * FROM "PlatformAnnouncement"
     WHERE "status"='published'
       AND ("startsAt" IS NULL OR "startsAt" <= $1)
       AND ("endsAt" IS NULL OR "endsAt" >= $1)
     ORDER BY "createdAt" DESC LIMIT 10`,
    now
  )) as PlatformAnnouncementRow[];
  return rows.filter(row=>{
    if(row.audienceType==="all")return true;
    if(row.audienceType==="organization")return row.audienceValue===organizationId;
    if(row.audienceType==="plan")return row.audienceValue===planTier;
    return false;
  });
}

export async function platformFeatureEnabled(key:string,organizationId:string,planTier:string,defaultValue=true){
  const rows=(await prisma.$queryRawUnsafe(
    `SELECT * FROM "PlatformFeatureFlag" WHERE "key"=$1 LIMIT 1`,
    key
  )) as PlatformFeatureFlagRow[];
  const flag=rows[0];
  if(!flag)return defaultValue;
  if(flag.enabledGlobally)return true;
  if(stringArray(flag.organizationIds).includes(organizationId))return true;
  if(stringArray(flag.planTiers).includes(planTier))return true;
  return false;
}

export async function getPlatformSetting<T>(key:string,fallback:T):Promise<T>{
  const rows=(await prisma.$queryRawUnsafe(
    `SELECT "value" FROM "PlatformSetting" WHERE "key"=$1 LIMIT 1`,
    key
  )) as {value:T}[];
  return rows[0]?.value??fallback;
}
