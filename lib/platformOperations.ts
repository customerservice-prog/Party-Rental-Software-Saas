import {randomUUID} from 'node:crypto';
import {prisma} from '@/lib/prisma';
export async function beginOperation(kind:string,actorId:string,organizationId:string|null=null){
 const id=randomUUID();
 await prisma.$executeRawUnsafe(`INSERT INTO "PlatformOperationRun" ("id","kind","actorId","organizationId","state") VALUES ($1,$2,$3,$4,'running')`,id,kind,actorId,organizationId);
 return id;
}
export async function finishOperation(id:string,state:'completed'|'failed'|'partial',summary:Record<string,unknown>){
 await prisma.$executeRawUnsafe(`UPDATE "PlatformOperationRun" SET "state"=$2,"summary"=$3::jsonb,"finishedAt"=CURRENT_TIMESTAMP WHERE "id"=$1`,id,state,JSON.stringify(summary));
}
// Deliberately stores only aggregate feature names and dates, never addresses,
// customer content, session tokens or provider credentials.
export async function recordFeatureUse(organizationId:string,feature:string){
 if(!['inventory','orders','customers','website','reports','messages'].includes(feature))return;
 await prisma.$executeRawUnsafe(`INSERT INTO "PlatformFeatureUsage" ("organizationId","feature","day","count") VALUES ($1,$2,CURRENT_DATE,1) ON CONFLICT ("organizationId","feature","day") DO UPDATE SET "count"="PlatformFeatureUsage"."count"+1`,organizationId,feature);
}
