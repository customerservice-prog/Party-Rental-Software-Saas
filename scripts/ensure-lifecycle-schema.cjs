// Additive lifecycle metadata. No tenant rows, credentials or provider settings are changed.
const {PrismaClient}=require('@prisma/client');
async function ensure(db){
 const sql=[
  `CREATE TABLE IF NOT EXISTS "AuthSessionRegistry" ("id" TEXT PRIMARY KEY,"keyHash" TEXT NOT NULL UNIQUE,"userId" TEXT NOT NULL,"organizationId" TEXT NOT NULL,"sessionVersion" INTEGER NOT NULL,"device" TEXT NOT NULL,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"expiresAt" TIMESTAMP(3) NOT NULL,"revokedAt" TIMESTAMP(3),"revokedBy" TEXT)`,
  `CREATE INDEX IF NOT EXISTS "AuthSessionRegistry_user_time" ON "AuthSessionRegistry" ("userId","createdAt")`,
  `CREATE INDEX IF NOT EXISTS "AuthSessionRegistry_org_time" ON "AuthSessionRegistry" ("organizationId","createdAt")`,
  `CREATE TABLE IF NOT EXISTS "TenantErasureRequest" ("organizationId" TEXT PRIMARY KEY,"requestId" TEXT NOT NULL UNIQUE,"slug" TEXT,"requestedBy" TEXT NOT NULL,"requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"eligibleAt" TIMESTAMP(3) NOT NULL,"state" TEXT NOT NULL DEFAULT 'pending',"hold" BOOLEAN NOT NULL DEFAULT FALSE,"completedAt" TIMESTAMP(3))`,
  `CREATE TABLE IF NOT EXISTS "SecurityStepUpAttempt" ("userId" TEXT PRIMARY KEY,"attempts" INTEGER NOT NULL DEFAULT 0,"windowStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS "AutomationSchedulePolicy" ("organizationId" TEXT PRIMARY KEY,"enabled" BOOLEAN NOT NULL DEFAULT FALSE,"enabledAt" TIMESTAMP(3),"emailEnabled" BOOLEAN NOT NULL DEFAULT TRUE,"smsEnabled" BOOLEAN NOT NULL DEFAULT FALSE,"dailyLimit" INTEGER NOT NULL DEFAULT 25 CHECK ("dailyLimit" BETWEEN 1 AND 100),"startHour" INTEGER NOT NULL DEFAULT 9 CHECK ("startHour" BETWEEN 0 AND 23),"endHour" INTEGER NOT NULL DEFAULT 19 CHECK ("endHour" BETWEEN 1 AND 24),"lastCheckedAt" TIMESTAMP(3),"leaseToken" TEXT,"leaseUntil" TIMESTAMP(3),"updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CHECK ("endHour">"startHour"))`,
  `CREATE TABLE IF NOT EXISTS "AutomationDelivery" ("id" TEXT PRIMARY KEY,"organizationId" TEXT NOT NULL,"orderId" TEXT NOT NULL,"kind" TEXT NOT NULL,"channel" TEXT NOT NULL,"recipientHash" TEXT NOT NULL,"state" TEXT NOT NULL,"providerId" TEXT,"errorCode" TEXT,"attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"finishedAt" TIMESTAMP(3),UNIQUE ("organizationId","orderId","kind","channel"))`,
  `CREATE INDEX IF NOT EXISTS "AutomationDelivery_org_time" ON "AutomationDelivery" ("organizationId","attemptedAt")`,
  `CREATE INDEX IF NOT EXISTS "AutomationDelivery_recipient_time" ON "AutomationDelivery" ("organizationId","recipientHash","channel","attemptedAt")`
 ];
 for(const statement of sql)await db.$executeRawUnsafe(statement);
}
module.exports={ensure};
if(require.main===module){const db=new PrismaClient();ensure(db).then(()=>console.log('Lifecycle metadata ready; existing records preserved.')).catch(()=>{console.error('Lifecycle schema preparation failed.');process.exitCode=1;}).finally(()=>db.$disconnect());}
