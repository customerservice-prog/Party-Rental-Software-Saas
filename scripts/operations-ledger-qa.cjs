// Real disposable PostgreSQL, fake in-process Stripe adapter. Never uses a
// provider key or performs a network request. Exercises the shipped ledger.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const {createRequire}=require('node:module'),{PrismaClient}=require('@prisma/client');
if(process.env.CI!=='true'||process.env.DATABASE_URL!=='postgresql://test:test@localhost:5432/test'||process.env.STRIPE_SECRET_KEY)throw Error('Disposable provider-free CI only.');
const db=new PrismaClient(),out='test-results/operations-ledger',report={environment:'Real isolated database, in-process fake Stripe responses, no network/provider key',checks:[]};fs.mkdirSync(out,{recursive:true});
function load(file,mocks){const filename=path.resolve(file),module={exports:{}},native=createRequire(filename);const code=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;const req=n=>Object.hasOwn(mocks,n)?mocks[n]:n.startsWith('@/')?load(n.slice(2)+'.ts',mocks):native(n);vm.runInThisContext('(function(require,module,exports){'+code+'\n})',{filename})(req,module,module.exports);return module.exports;}
async function main(){
 const organization=await db.organization.create({data:{name:'CI Ledger Fixture',slug:'ci-ledger-fixture',autoConfirmationEnabled:false,autoReminderEnabled:false,autoBalanceReminderEnabled:false,subscription:{create:{stripeSubId:'sub_QA1',stripeCustomerId:'cus_QA1',status:'trialing'}}}});
 let remote={id:'sub_QA1',customer:'cus_QA1',metadata:{organizationId:organization.id},status:'active',livemode:true,current_period_end:Math.floor(Date.now()/1000)+86400,discounts:[],items:{has_more:false,data:[{quantity:2,price:{id:'price_QA1',lookup_key:'growth_monthly',unit_amount:10000,currency:'usd',billing_scheme:'per_unit',product:'prod_QA1',recurring:{interval:'month',interval_count:1,usage_type:'licensed'}}}]}};
 let calls=0,inFlight=0,maximum=0,fail=false;
 const adapter={subscriptions:{retrieve:async()=>{calls++;inFlight++;maximum=Math.max(maximum,inFlight);try{await new Promise(r=>setTimeout(r,30));if(fail)throw Error('fixture provider outage');return structuredClone(remote);}finally{inFlight--;}}}};
 process.env.STRIPE_SECRET_KEY='not-a-key-adapter-is-stubbed';
 const ledger=load('lib/platformBillingLedger.ts',{'@/lib/prisma':{prisma:db},'@/lib/stripe':{stripe:adapter}});
 const event=(id,type='invoice.paid',sub='sub_QA1',live=true)=>({id,type,livemode:live,created:Math.floor(Date.now()/1000)-3600,data:{object:{customer:'cus_QA1',subscription:sub}}});
 await ledger.reconcileTenantBilling(organization.id);
 assert.equal((await db.platformSubscription.findUnique({where:{organizationId:organization.id}})).status,'trialing');
 const snapshot=(await db.$queryRawUnsafe('SELECT * FROM "PlatformBillingSnapshot" WHERE "organizationId"=$1',organization.id))[0];assert.equal(snapshot.netMonthlyCents,20000);
 report.checks.push('Manual snapshot records current contractual price without changing tenant access');
 await ledger.acceptBillingEvent(event('evt_QA1','invoice.payment_failed'));
 assert.equal((await db.platformSubscription.findUnique({where:{organizationId:organization.id}})).status,'active');
 report.checks.push('Old invoice failure cannot override the current active Stripe subscription');
 const count=calls;await ledger.acceptBillingEvent(event('evt_QA1','invoice.payment_failed'));assert.equal(calls,count);
 report.checks.push('Completed duplicate event does not repeat provider reconciliation');
 const outcomes=await Promise.allSettled([ledger.acceptBillingEvent(event('evt_QA2')),ledger.acceptBillingEvent(event('evt_QA2'))]);assert.ok(outcomes.some(r=>r.status==='fulfilled'));
 assert.equal((await db.$queryRawUnsafe('SELECT attempts FROM "PlatformWebhookReceipt" WHERE "eventId"=$1','evt_QA2'))[0].attempts,1);
 report.checks.push('Concurrent duplicate deliveries claim one processing attempt');
 await Promise.all([ledger.reconcileTenantBilling(organization.id),ledger.reconcileTenantBilling(organization.id)]);assert.equal(maximum,1);
 report.checks.push('PostgreSQL tenant lock serializes simultaneous Stripe snapshot writes');
 remote.status='canceled';await ledger.acceptBillingEvent(event('evt_QA3','invoice.paid'));
 assert.equal((await db.platformSubscription.findUnique({where:{organizationId:organization.id}})).status,'canceled');
 report.checks.push('Old paid invoice cannot reactivate a currently canceled subscription');
 fail=true;await assert.rejects(()=>ledger.acceptBillingEvent(event('evt_QA4')));assert.equal((await db.$queryRawUnsafe('SELECT state FROM "PlatformWebhookReceipt" WHERE "eventId"=$1','evt_QA4'))[0].state,'failed');
 fail=false;remote.status='active';await ledger.reconcileBillingReceipt('evt_QA4');const retry=(await db.$queryRawUnsafe('SELECT state,attempts FROM "PlatformWebhookReceipt" WHERE "eventId"=$1','evt_QA4'))[0];assert.equal(retry.state,'completed');assert.equal(retry.attempts,2);
 report.checks.push('Provider failure persists and a later explicit recovery completes the receipt');
 const before=calls;await ledger.acceptBillingEvent(event('evt_TEST','invoice.paid','sub_QA1',false));assert.equal(calls,before);
 report.checks.push('Test-mode events are recorded as ignored and never alter production-style access');
 await db.platformSubscription.update({where:{organizationId:organization.id},data:{stripeSubId:'sub_QA2'}});await ledger.acceptBillingEvent(event('evt_SUPERSEDED'));
 assert.equal((await db.platformSubscription.findUnique({where:{organizationId:organization.id}})).stripeSubId,'sub_QA2');assert.equal(calls,before);
 report.checks.push('A superseded subscription event cannot replace the tenant current linkage');
 // Remove only this explicitly synthetic fixture before the browser suite;
 // existing browser fixtures and all production data remain untouched.
 for(const table of ['PlatformBillingSnapshot','PlatformBillingHistory','PlatformWebhookReceipt'])await db.$executeRawUnsafe(`DELETE FROM "${table}" WHERE "organizationId"=$1`,organization.id);
 await db.$executeRawUnsafe('DELETE FROM "PlatformWebhookReceipt" WHERE "eventId"=$1','evt_TEST');
 await db.platformSubscription.delete({where:{organizationId:organization.id}});await db.organization.delete({where:{id:organization.id}});
 delete process.env.STRIPE_SECRET_KEY;
}
main().catch(e=>{report.error=e.stack;process.exitCode=1}).finally(async()=>{fs.writeFileSync(out+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await db.$disconnect()});
