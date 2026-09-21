// Test-only integration runner. It requires the disposable GitHub Actions
// database and an additional explicit fixture-test switch. Never production.
const assert=require('node:assert/strict'),fs=require('node:fs');
const {PrismaClient}=require('@prisma/client');
const registry=require('../lib/sessionRegistry.cjs'),erasure=require('../lib/tenantErasure.cjs'),engine=require('../lib/automationEngine.cjs'),{tick}=require('./automation-worker.cjs');
if(process.env.CI!=='true'||process.env.DATABASE_URL!=='postgresql://test:test@localhost:5432/test'||process.env.LIFECYCLE_FIXTURE_TEST!=='enabled'||process.env.STRIPE_SECRET_KEY)throw Error('Explicit isolated lifecycle fixture test required.');
const db=new PrismaClient(),out='test-results/lifecycle-database',report={environment:'Ephemeral localhost test database; fake in-process providers; synthetic fixture accounts only',checks:[]};fs.mkdirSync(out,{recursive:true});
const pass=message=>report.checks.push(message),reject=async(promise,code)=>assert.rejects(promise,e=>e.code===code);
async function org(slug,extra={}){return db.organization.create({data:{name:'CI '+slug,slug,autoConfirmationEnabled:false,autoReminderEnabled:false,autoBalanceReminderEnabled:false,...extra}});}
async function main(){
 assert.equal((await db.$queryRawUnsafe('SELECT current_database() AS name'))[0].name,'test');
 const keeper=await org('ci-lifecycle-keeper'),target=await org('ci-lifecycle-delete-fixture',{status:'suspended',resendApiKey:'SYNTHETIC-PRIVATE-KEY',subscription:{create:{status:'canceled'}}});
 const user=await db.user.create({data:{organizationId:keeper.id,name:'Registry fixture',username:'registry',password:'SYNTHETIC-PRIVATE-PASSWORD',role:'owner'}});
 const a=await registry.createRegisteredSession(db,user,{'user-agent':'Firefox/100 Windows'}),b=await registry.createRegisteredSession(db,user,{});
 const stored=await db.$queryRawUnsafe(`SELECT * FROM "AuthSessionRegistry" WHERE "userId"=$1`,user.id);assert.equal(stored.length,2);assert.ok(!JSON.stringify(stored).includes(a.key));
 assert.equal(await registry.validateRegisteredSession(db,a.key,user.id,0),true);assert.equal(await registry.validateRegisteredSession(db,a.key,'another-user',0),false);
 assert.equal(await registry.revokeRegisteredSession(db,{id:a.id,actorId:'other-user',ownUserId:'other-user'}),false);
 await registry.revokeRegisteredSession(db,{id:a.id,actorId:user.id,ownUserId:user.id});assert.equal(await registry.validateRegisteredSession(db,a.key,user.id,0),false);assert.equal(await registry.validateRegisteredSession(db,b.key,user.id,0),true);
 await registry.signOutRegisteredSession(db,b.key);assert.equal(await registry.validateRegisteredSession(db,b.key,user.id,0),false);pass('Real database registry stores only hashed keys; individual and own-user revocation are enforced');
 const secretUser=await db.user.create({data:{organizationId:target.id,name:'Erasure fixture owner',username:'erase-owner',password:'SYNTHETIC-PRIVATE-PASSWORD',role:'owner'}});
 const category=await db.category.create({data:{organizationId:target.id,name:'Fixture chairs',slug:'fixture-chairs'}}),item=await db.item.create({data:{organizationId:target.id,categoryId:category.id,name:'Fixture chair',slug:'fixture-chair',quantity:2,cost:13}});
 const customer=await db.customer.create({data:{organizationId:target.id,firstName:'Synthetic',lastName:'Recipient',email:'fixture@example.invalid'}});
 const order=await db.order.create({data:{organizationId:target.id,customerId:customer.id,orderNumber:'ERASURE-1',eventDate:new Date('2020-01-01'),status:'completed',items:{create:{itemId:item.id,quantity:1,price:13}}}});
 const targetSession=await registry.createRegisteredSession(db,secretUser,{});
 const confirm={confirmation:'DELETE '+target.slug,retentionReviewed:true,exportSaved:true,externalRecordsReviewed:true};
 // This helper cannot be pointed at any pre-existing or arbitrary tenant.
 async function execute(input=confirm,billing=async()=>{}){assert.equal(target.slug,'ci-lifecycle-delete-fixture');return erasure.executeErasure(db,target.id,user.id,input,billing);}
 await reject(erasure.requestErasure(db,target.id,user.id,'wrong'),'archive_and_confirm_slug_first');await erasure.requestErasure(db,target.id,user.id,target.slug);
 await reject(execute(),'review_period_or_hold_blocks_deletion');
 // Only this newly-created fixture's review date is changed, to exercise the
 // final-action guard without adding a production API that shortens review.
 await db.$executeRawUnsafe(`UPDATE "TenantErasureRequest" SET "eligibleAt"=CURRENT_TIMESTAMP-INTERVAL '1 second' WHERE "organizationId"=$1 AND "slug"='ci-lifecycle-delete-fixture'`,target.id);
 await erasure.changeErasure(db,target.id,user.id,'hold');await reject(execute(),'review_period_or_hold_blocks_deletion');await erasure.changeErasure(db,target.id,user.id,'release_hold');
 await reject(execute({...confirm,confirmation:'wrong'}),'confirm_scope_and_retention');await reject(execute(confirm,async()=>{throw new erasure.ErasureError('billing_fixture_block');}),'billing_fixture_block');await reject(execute(),'recent_complete_export_required');
 pass('Deletion blocks an unfinished review, retention hold, incorrect confirmation, unresolved billing and missing recent export');
 const cross=await db.order.create({data:{organizationId:keeper.id,customerId:customer.id,orderNumber:'CROSS-FIXTURE',eventDate:new Date('2020-01-01'),status:'completed'}});await reject(erasure.exportTenant(db,target.id,user.id),'cross_tenant_or_unreviewed_reference');await db.order.delete({where:{id:cross.id}});pass('Cross-tenant foreign-key references block deletion review');
 const exported=await erasure.exportTenant(db,target.id,user.id);assert.ok(!JSON.stringify(exported).includes('SYNTHETIC-PRIVATE-'));assert.equal(exported.tables.OrderItem.length,1);assert.equal(exported.tables.AuthSessionRegistry.length,1);
 await db.order.update({where:{id:order.id},data:{eventDate:new Date(Date.now()+86400000),status:'active'}});await reject(execute(),'future_orders_require_resolution');await db.order.update({where:{id:order.id},data:{status:'canceled'}});
 const beforeKeeper=await db.organization.findUnique({where:{id:keeper.id}}),catalogCount=await db.catalogTemplate.count();
 const deleted=await execute();assert.equal(deleted.success,true);assert.equal(await db.organization.count({where:{id:target.id}}),0);assert.equal(await db.order.count({where:{organizationId:target.id}}),0);assert.equal(await db.user.count({where:{organizationId:target.id}}),0);assert.equal(await registry.validateRegisteredSession(db,targetSession.key,secretUser.id,0),false);assert.deepEqual(await db.organization.findUnique({where:{id:keeper.id}}),beforeKeeper);assert.equal(await db.catalogTemplate.count(),catalogCount);
 assert.equal((await db.$queryRawUnsafe(`SELECT "state","slug" FROM "TenantErasureRequest" WHERE "organizationId"=$1`,target.id))[0].slug,null);pass('Confirmed fixture erasure removes only its records and sessions; the other tenant and global catalog remain unchanged');
 const automated=await org('ci-lifecycle-scheduler',{autoConfirmationEnabled:true,timezone:'UTC'});let calls=0;const send=async()=>{calls++;return{state:'accepted',providerId:'fixture-provider-'+calls};};
 const c=await db.customer.create({data:{organizationId:automated.id,firstName:'Synthetic',lastName:'Booking',email:'booking@example.invalid'}});
 async function booking(number,customerId=c.id,extra={}){return db.order.create({data:{organizationId:automated.id,customerId,orderNumber:number,eventDate:new Date(Date.now()+2*86400000),status:'confirmed',totalAmount:100,...extra}});}
 const old=await booking('OLD',c.id,{createdAt:new Date('2020-01-01')});
 await engine.runBookingBatch(db,automated.id,{source:'scheduled',send});assert.equal(calls,0);assert.equal((await db.order.findUnique({where:{id:old.id}})).confirmationSentAt,null);
 await db.$executeRawUnsafe(`UPDATE "AutomationSchedulePolicy" SET "enabled"=true,"enabledAt"=CURRENT_TIMESTAMP,"startHour"=0,"endHour"=24 WHERE "organizationId"=$1`,automated.id);
 const fresh=await booking('FRESH');await engine.runBookingBatch(db,automated.id,{source:'scheduled',send});assert.equal(calls,0);assert.equal((await db.order.findUnique({where:{id:fresh.id}})).confirmationSentAt,null);
 await db.organization.update({where:{id:automated.id},data:{resendApiKey:'SYNTHETIC-NOT-A-KEY',senderEmail:'sender@example.invalid'}});
 await Promise.all([engine.runBookingBatch(db,automated.id,{source:'scheduled',send}),engine.runBookingBatch(db,automated.id,{source:'scheduled',send})]);assert.equal(calls,1);assert.ok((await db.order.findUnique({where:{id:fresh.id}})).confirmationSentAt);assert.equal((await db.order.findUnique({where:{id:old.id}})).confirmationSentAt,null);
 await engine.runBookingBatch(db,automated.id,{source:'scheduled',send});assert.equal(calls,1);pass('Missing opt-in or credentials never sends or stamps success; concurrent opted-in passes claim one new-booking delivery');
 await booking('SAME-RECIPIENT');await engine.runBookingBatch(db,automated.id,{source:'scheduled',send});assert.equal(calls,1);pass('A recipient is not messaged again within the rolling 24-hour cooldown');
 const uncertain=await db.customer.create({data:{organizationId:automated.id,firstName:'Timeout',lastName:'Fixture',email:'timeout@example.invalid'}}),unknown=await booking('UNKNOWN',uncertain.id);
 await engine.runBookingBatch(db,automated.id,{source:'scheduled',send:async()=>{calls++;throw Error('synthetic timeout');}});assert.equal(calls,2);assert.equal((await db.order.findUnique({where:{id:unknown.id}})).confirmationSentAt,null);
 await engine.runBookingBatch(db,automated.id,{source:'scheduled',send});assert.equal(calls,2);assert.equal((await db.$queryRawUnsafe(`SELECT "state" FROM "AutomationDelivery" WHERE "orderId"=$1`,unknown.id))[0].state,'unknown');pass('Uncertain delivery persists without a success stamp or automatic replay');
 await db.$executeRawUnsafe(`UPDATE "AutomationSchedulePolicy" SET "dailyLimit"=1 WHERE "organizationId"=$1`,automated.id);const capped=await db.customer.create({data:{organizationId:automated.id,firstName:'Capped',lastName:'Fixture',email:'capped@example.invalid'}});await booking('CAPPED',capped.id);await engine.runBookingBatch(db,automated.id,{source:'scheduled',send});assert.equal(calls,2);pass('Rolling daily attempt limits block additional provider calls');
 await db.$executeRawUnsafe(`INSERT INTO "PlatformSetting" ("key","value","updatedBy","updatedAt") VALUES ('scheduled_automations_paused','true'::jsonb,'fixture',CURRENT_TIMESTAMP) ON CONFLICT ("key") DO UPDATE SET "value"='true'::jsonb`);
 await db.$executeRawUnsafe(`UPDATE "AutomationSchedulePolicy" SET "dailyLimit"=25 WHERE "organizationId"=$1`,automated.id);const summary=await tick(db,{send});assert.equal(summary.attempted,0);assert.equal(calls,2);pass('An emergency pause records a zero-send worker heartbeat without enabling other tenants');
 await db.$executeRawUnsafe(`INSERT INTO "SecurityStepUpAttempt" ("userId","attempts") VALUES ($1,1) ON CONFLICT ("userId") DO NOTHING`,user.id);
 report.pass=true;
}
main().catch(e=>{report.error=e.stack;process.exitCode=1;}).finally(async()=>{fs.writeFileSync(out+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await db.$disconnect();});
