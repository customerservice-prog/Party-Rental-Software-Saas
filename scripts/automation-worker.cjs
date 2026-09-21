// Railway cron entry point. One bounded pass, then close the DB and exit.
// Does not process deletion requests, replay legacy queued messages, or opt in
// any tenant. Only owners can enable their own scheduled delivery policy.
const {PrismaClient}=require('@prisma/client'),{randomUUID}=require('node:crypto');
const {runBookingBatch}=require('../lib/automationEngine.cjs');
async function tick(db,{send,now=()=>Date.now()}={}){
 const started=now(),id=randomUUID(),summary={tenantsChecked:0,attempted:0,accepted:0,failed:0,unknown:0,errors:0};
 await db.$executeRawUnsafe(`INSERT INTO "PlatformOperationRun" ("id","kind","actorId","state") VALUES ($1,'automation.scheduler','scheduled_worker','running')`,id);
 try{
  await db.$executeRawUnsafe(`UPDATE "AutomationDelivery" SET "state"='unknown',"errorCode"='interrupted_send_review_required',"finishedAt"=CURRENT_TIMESTAMP WHERE "state"='sending' AND "attemptedAt"<CURRENT_TIMESTAMP-INTERVAL '10 minutes'`);
  const tenants=await db.$queryRawUnsafe(`SELECT p."organizationId" FROM "AutomationSchedulePolicy" p JOIN "Organization" o ON o."id"=p."organizationId" WHERE p."enabled"=true AND o."status" IN ('active','trial') AND o."slug"<>'_platform_internal' ORDER BY p."lastCheckedAt" ASC NULLS FIRST,p."organizationId" LIMIT 10`);
  for(const t of tenants){if(now()-started>150000)break;summary.tenantsChecked++;try{const result=await runBookingBatch(db,t.organizationId,{source:'scheduled',...(send?{send}:{})});summary.attempted+=result.attempted;summary.accepted+=result.acceptedDeliveries;summary.failed+=result.failed;summary.unknown+=result.unknown;}catch{summary.errors++;}}
  await db.$executeRawUnsafe(`UPDATE "PlatformOperationRun" SET "state"=$2,"summary"=$3::jsonb,"finishedAt"=CURRENT_TIMESTAMP WHERE "id"=$1`,id,summary.errors?'partial':'completed',JSON.stringify(summary));
  return summary;
 }catch(error){await db.$executeRawUnsafe(`UPDATE "PlatformOperationRun" SET "state"='failed',"summary"='{"error":"scheduler_failed"}'::jsonb,"finishedAt"=CURRENT_TIMESTAMP WHERE "id"=$1`,id).catch(()=>{});throw error;}
}
module.exports={tick};
if(require.main===module){const db=new PrismaClient();const watchdog=setTimeout(()=>{console.error('Scheduler exceeded its bounded runtime; unfinished sends require review.');process.exit(1);},230000);tick(db).then(result=>console.log('Scheduled booking automation:',JSON.stringify(result))).catch(()=>{console.error('Scheduled booking automation failed; inspect operation history.');process.exitCode=1;}).finally(async()=>{clearTimeout(watchdog);await db.$disconnect();});}
