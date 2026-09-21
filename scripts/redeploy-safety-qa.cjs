const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const {PrismaClient}=require('@prisma/client');
if(process.env.CI!=='true'||process.env.DATABASE_URL!=='postgresql://test:test@localhost:5432/test'||process.env.STRIPE_SECRET_KEY)throw Error('Disposable CI only.');
const db=new PrismaClient(),out='test-results/redeploy';fs.mkdirSync(out,{recursive:true});
const tables=['Organization','User','Item','Category','CatalogTemplate','PlatformOperationRun','PlatformAdminGrant','PlatformBillingSnapshot','PlatformBillingHistory','PlatformWebhookReceipt','PlatformDomainCheck','PlatformFeatureUsage','PlatformSetting','AuthSessionRegistry','TenantErasureRequest','SecurityStepUpAttempt','AutomationSchedulePolicy','AutomationDelivery'];
async function fingerprint(){const result={};for(const table of tables){const rows=await db.$queryRawUnsafe(`SELECT row_to_json(t)::text AS data FROM "${table}" t ORDER BY row_to_json(t)::text`);result[table]={count:rows.length,hash:crypto.createHash('sha256').update(rows.map(r=>r.data).join('\n')).digest('hex')};}return result;}
async function main(){
 // Populate operational history explicitly: an empty table would not prove
 // that an established billing snapshot or recovery record survives redeploy.
 // This fixture executes only after browser tests in the disposable CI database.
 const tenant=await db.organization.findUniqueOrThrow({where:{slug:'ci-demo-27'}});
 await db.$executeRawUnsafe(`INSERT INTO "PlatformBillingSnapshot" ("organizationId","subscriptionId","status","liveMode","currency","grossMonthlyCents","netMonthlyCents","exclusion") VALUES ($1,'sub_REDEPLOY_FIXTURE','active',false,'usd',10000,NULL,'Test-mode fixture')`,tenant.id);
 await db.$executeRawUnsafe(`INSERT INTO "PlatformBillingHistory" ("id","organizationId","subscriptionId","status","liveMode","currency","netMonthlyCents") VALUES ('redeploy-history-fixture',$1,'sub_REDEPLOY_FIXTURE','active',false,'usd',NULL)`,tenant.id);
 await db.$executeRawUnsafe(`INSERT INTO "PlatformWebhookReceipt" ("eventId","eventType","subscriptionId","organizationId","liveMode","providerCreatedAt","state","attempts","errorCode") VALUES ('evt_REDEPLOY_FIXTURE','invoice.paid','sub_REDEPLOY_FIXTURE',$1,false,CURRENT_TIMESTAMP,'failed',2,'fixture_error')`,tenant.id);
 await db.$executeRawUnsafe(`INSERT INTO "PlatformDomainCheck" ("organizationId","hostname","state","detail") VALUES ($1,'fixture.invalid','unverified','Synthetic preservation fixture; no DNS or network call performed')`,tenant.id);
 const before=await fingerprint();
 for(const table of tables)assert.ok(before[table].count>0,'Preservation test requires populated table: '+table);
 execFileSync(process.execPath,[path.join(__dirname,'prepare-production.cjs')],{stdio:'inherit',env:process.env,timeout:120000});
 assert.deepEqual(await fingerprint(),before,'Repeat production preparation changed existing records');
 execFileSync(process.execPath,[path.join(__dirname,'prepare-production.cjs')],{stdio:'inherit',env:process.env,timeout:120000});
 assert.deepEqual(await fingerprint(),before,'Third production preparation changed existing records');
 fs.writeFileSync(out+'/report.json',JSON.stringify({environment:'Disposable local database only; explicitly synthetic test-mode billing and domain rows',passed:true,checks:['Two repeated additive preparations preserve all checked row contents across 18 populated tables','Administrator credentials and grants remain unchanged','Populated billing snapshots/history, recovery receipts, domain checks, usage and job history remain unchanged'],tableCounts:Object.fromEntries(Object.entries(before).map(([k,v])=>[k,v.count]))},null,2));
 console.log('Repeat-deployment preservation checks passed across '+tables.length+' populated tables; no credential values emitted.');
}
main().catch(e=>{console.error(e.message);process.exitCode=1}).finally(()=>db.$disconnect());
