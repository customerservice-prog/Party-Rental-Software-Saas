// Additive operational metadata only. Never edits tenant inventory or credentials.
const {PrismaClient}=require('@prisma/client');
async function ensure(db){
 const statements=[
  `CREATE TABLE IF NOT EXISTS "PlatformBillingSnapshot" ("organizationId" TEXT PRIMARY KEY, "subscriptionId" TEXT NOT NULL, "status" TEXT NOT NULL, "liveMode" BOOLEAN NOT NULL, "currency" TEXT, "grossMonthlyCents" DOUBLE PRECISION, "netMonthlyCents" DOUBLE PRECISION, "exclusion" TEXT, "priceSummary" JSONB NOT NULL DEFAULT '[]', "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "periodEnd" TIMESTAMP(3))`,
  `CREATE TABLE IF NOT EXISTS "PlatformBillingHistory" ("id" TEXT PRIMARY KEY, "organizationId" TEXT NOT NULL, "subscriptionId" TEXT NOT NULL, "status" TEXT NOT NULL, "liveMode" BOOLEAN NOT NULL, "currency" TEXT, "netMonthlyCents" DOUBLE PRECISION, "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE INDEX IF NOT EXISTS "PlatformBillingHistory_org_time" ON "PlatformBillingHistory" ("organizationId","recordedAt")`,
  `CREATE TABLE IF NOT EXISTS "PlatformWebhookReceipt" ("eventId" TEXT PRIMARY KEY, "eventType" TEXT NOT NULL, "subscriptionId" TEXT, "organizationId" TEXT, "liveMode" BOOLEAN NOT NULL, "providerCreatedAt" TIMESTAMP(3) NOT NULL, "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "processedAt" TIMESTAMP(3), "state" TEXT NOT NULL DEFAULT 'received', "attempts" INTEGER NOT NULL DEFAULT 0, "errorCode" TEXT)`,
  `CREATE INDEX IF NOT EXISTS "PlatformWebhookReceipt_state_time" ON "PlatformWebhookReceipt" ("state","receivedAt")`,
  `CREATE TABLE IF NOT EXISTS "PlatformOperationRun" ("id" TEXT PRIMARY KEY, "kind" TEXT NOT NULL, "actorId" TEXT NOT NULL, "organizationId" TEXT, "state" TEXT NOT NULL, "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "finishedAt" TIMESTAMP(3), "summary" JSONB NOT NULL DEFAULT '{}')`,
  `CREATE INDEX IF NOT EXISTS "PlatformOperationRun_time" ON "PlatformOperationRun" ("startedAt")`,
  `CREATE TABLE IF NOT EXISTS "PlatformAdminGrant" ("userId" TEXT PRIMARY KEY, "accessRole" TEXT NOT NULL, "updatedBy" TEXT NOT NULL, "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS "PlatformDomainCheck" ("organizationId" TEXT PRIMARY KEY, "hostname" TEXT NOT NULL, "state" TEXT NOT NULL, "detail" TEXT NOT NULL, "certificateExpiresAt" TIMESTAMP(3), "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS "PlatformFeatureUsage" ("organizationId" TEXT NOT NULL, "feature" TEXT NOT NULL, "day" DATE NOT NULL, "count" INTEGER NOT NULL DEFAULT 1, PRIMARY KEY ("organizationId","feature","day"))`
 ];
 for(const sql of statements)await db.$executeRawUnsafe(sql);
}
module.exports={ensure};
if(require.main===module){const db=new PrismaClient();ensure(db).then(()=>console.log('Operational metadata schema ready; existing tenant data preserved.')).catch(e=>{console.error(e);process.exitCode=1}).finally(()=>db.$disconnect());}
