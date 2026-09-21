// One-time source-only integration, restricted to the review branch. No DB,
// provider calls, secrets, tenant mutations or workflow edits occur here.
const fs=require('node:fs');
if(process.env.CI!=='true'||process.env.GITHUB_REF!=='refs/heads/admin/lifecycle-sessions-worker-20260921')throw Error('Review-branch source integration only.');
const marker='docs/lifecycle-finalization-applied.txt';
if(fs.existsSync(marker)){console.log('Already applied.');process.exit(0);}
function change(file,before,after){const text=fs.readFileSync(file,'utf8');if(!text.includes(before))throw Error('Expected source not found: '+file+' / '+before.slice(0,70));fs.writeFileSync(file,text.replace(before,after));}
change('lib/sessionRegistry.cjs','async function listRegisteredSessions(db,','/** @param {any} db @param {{userId?:string|null,q?:string,page?:number}} [options] */\nasync function listRegisteredSessions(db,');
change('lib/sessionRegistry.cjs','async function revokeRegisteredSession(db,','/** @param {any} db @param {{id:string,actorId:string,ownUserId?:string|null}} options */\nasync function revokeRegisteredSession(db,');
change('app/api/account/sessions/route.ts',"u.role!=='platform_admin'?u:null;","u.role!=='platform_admin'?{...u,id:u.id}:null;");
change('scripts/ensure-lifecycle-schema.cjs',' ];\n for(const statement', ' ];\n sql.push(`ALTER TABLE "AutomationSchedulePolicy" ADD COLUMN IF NOT EXISTS "scanCursor" TEXT`);\n for(const statement');
change('lib/automationEngine.cjs','!policy.emailEnabled||!org.resendApiKey',"(source==='scheduled'&&!policy.emailEnabled)||!org.resendApiKey");
change('lib/automationEngine.cjs','!policy.smsEnabled||!org.twilioAccountSid',"(source==='scheduled'&&!policy.smsEnabled)||!org.twilioAccountSid");
change('lib/automationEngine.cjs','attempted:0,failed:0,unknown:0','attempted:0,acceptedDeliveries:0,failed:0,unknown:0');
const before="  const orders=await db.order.findMany({where:{organizationId:orgId,status:{in:['confirmed','active']},eventDate:{gte:today},...(source==='scheduled'?{createdAt:{gte:new Date(policy.enabledAt)}}:{}),OR:filters},include:{customer:true},orderBy:[{eventDate:'asc'},{createdAt:'asc'},{id:'asc'}],take:100});";
const after="  const where={organizationId:orgId,status:{in:['confirmed','active']},eventDate:{gte:today},...(source==='scheduled'?{createdAt:{gte:new Date(policy.enabledAt)}}:{}),OR:filters};\n  const orders=await scanOrders(db,where,policy.scanCursor);";
change('lib/automationEngine.cjs',before,after);
change('lib/automationEngine.cjs','async function runBookingBatch',`// Cursor rotation prevents an old blocked batch from starving later bookings.
async function scanOrders(db,where,cursor){
 const read=after=>db.order.findMany({where:{...where,...(after?{id:{gt:after}}:{})},include:{customer:true},orderBy:{id:'asc'},take:100});
 let rows=await read(cursor);if(!rows.length&&cursor)rows=await read(null);return rows;
}
async function runBookingBatch`);
change('lib/automationEngine.cjs',"  result.ran=true;const counted=new Set();\n  for(const order of orders)for(const kind of ['booking_confirmation','balance_due','event_reminder']){", "  result.ran=true;const counted=new Set();let lastScanned=null;\n  outer: for(const order of orders){\n   if(result.attempted>=MAX_BATCH||Date.now()-started>60000)break;\n   lastScanned=order.id;\n   for(const kind of ['booking_confirmation','balance_due','event_reminder']){");
change('lib/automationEngine.cjs','if(result.attempted>=MAX_BATCH||Date.now()-started>60000)break;\n    const delivery','if(result.attempted>=MAX_BATCH||Date.now()-started>60000)break outer;\n    const delivery');
change('lib/automationEngine.cjs',"if(outcome.state==='accepted'){const key", "if(outcome.state==='accepted'){result.acceptedDeliveries++;const key");
change('lib/automationEngine.cjs','  await db.organization.update({where:{id:orgId}', '  }\n  await db.$executeRawUnsafe(`UPDATE "AutomationSchedulePolicy" SET "scanCursor"=$2 WHERE "organizationId"=$1 AND "leaseToken"=$3`,orgId,lastScanned,lease);\n  await db.organization.update({where:{id:orgId}');
change('lib/automationEngine.cjs','phone,message,claim,finishDelivery};','phone,message,claim,finishDelivery,scanOrders};');
change('scripts/automation-worker.cjs','summary.accepted+=result.confirmationsSent+result.remindersSent+result.balanceRemindersSent','summary.accepted+=result.acceptedDeliveries');
change('lib/tenantErasure.cjs',"eventDate:{gte:new Date()},status:{notIn:","status:{notIn:");
for(const f of ['lib/tenantErasure.cjs','scripts/lifecycle-database-qa.cjs'])change(f,'future_orders_require_resolution','unresolved_orders_require_resolution');
change('app/api/admin/erasure/route.ts',' if(local.stripeSubId){',' let customerId=local.stripeCustomerId;\n if(local.stripeSubId){');
change('app/api/admin/erasure/route.ts',"throw new ErasureError('billing_link_mismatch');if(!", "throw new ErasureError('billing_link_mismatch');customerId=customer;if(!");
change('app/api/admin/erasure/route.ts','if(local.stripeCustomerId){const rows=await stripe.subscriptions.list({customer:local.stripeCustomerId', 'if(customerId){const rows=await stripe.subscriptions.list({customer:customerId');
change('app/api/automations/schedule/route.ts','body.smsEnabled&&body.smsPermissionConfirmed!==true','body.enabled&&body.smsEnabled&&body.smsPermissionConfirmed!==true');
change('app/dashboard/automations/schedule/page.tsx','policy.smsEnabled&&!smsConfirm','policy.enabled&&policy.smsEnabled&&!smsConfirm');
change('app/dashboard/DashboardNav.tsx','item("/settings","Settings","settings",true)', 'item("/settings","Settings","settings",true),item("/sessions","Sign-in sessions","shield")');
change('app/dashboard/DashboardNav.tsx','item("/automations","Automations","clock")','item("/automations","Automations","clock"),item("/automations/schedule","Scheduled delivery","clock",true)');
change('app/admin/data/DataAdminTable.tsx','Hard deletion is intentionally not exposed here; archive preserves recovery and auditability.','Archive preserves recovery and auditability. Permanent database deletion has a separate review workflow.');
change('app/admin/data/erasure/ErasureCenter.tsx','Active subscriptions, future orders, retention holds','Active subscriptions, unresolved orders, retention holds');
const extra="'AuthSessionRegistry','TenantErasureRequest','SecurityStepUpAttempt','AutomationSchedulePolicy','AutomationDelivery'";
change('scripts/redeploy-safety-qa.cjs',"'PlatformSetting'];","'PlatformSetting',"+extra+"];");
change('scripts/redeploy-safety-qa.cjs','across 13 populated tables','across 18 populated tables');
change('scripts/restore-drill.sh','PlatformFeatureUsage PlatformSetting; do','PlatformFeatureUsage PlatformSetting AuthSessionRegistry TenantErasureRequest SecurityStepUpAttempt AutomationSchedulePolicy AutomationDelivery; do');
change('scripts/restore-drill.sh','across 13 populated tables','across 18 populated tables');
change('lib/tenantErasure.cjs','async function inspectSchema(db,id){',`async function inspectRawReferences(db,id){
 const links={orderId:'Order',customerId:'Customer',itemId:'Item',packageItemId:'Item',componentItemId:'Item',itemUnitId:'ItemUnit',fulfillmentId:'RentalFulfillment',orderItemId:'OrderItem',driverId:'Driver',categoryId:'Category',driverRunId:'DriverRun'};
 const fields=await db.$queryRawUnsafe(\`SELECT table_name,column_name FROM information_schema.columns WHERE table_schema=current_schema()\`);
 for(const field of fields){const parent=links[field.column_name],child=field.table_name;if(!parent)continue;const co=ownership(child,'c'),po=ownership(parent,'p');if(!co||!po)continue;
  const bad=await db.$queryRawUnsafe(\`SELECT 1 FROM \${safeIdentifier(child)} c JOIN \${safeIdentifier(parent)} p ON c.\${safeIdentifier(field.column_name)}=p."id" WHERE (\${co}=$1 OR \${po}=$1) AND \${co} IS DISTINCT FROM \${po} LIMIT 1\`,id);
  if(bad.length)throw new ErasureError('cross_tenant_or_unreviewed_reference');
 }
}
async function inspectSchema(db,id){
 await inspectRawReferences(db,id);`);
change('scripts/lifecycle-database-qa.cjs'," const exported=await erasure.exportTenant",` const rawCrossId='ci-raw-package-reference';
 await db.$executeRawUnsafe(\`INSERT INTO "PackageComponent" ("id","organizationId","packageItemId","componentItemId") VALUES ($1,$2,$3,$3)\`,rawCrossId,keeper.id,item.id);
 await reject(erasure.exportTenant(db,target.id,user.id),'cross_tenant_or_unreviewed_reference');
 await db.$executeRawUnsafe(\`DELETE FROM "PackageComponent" WHERE "id"=$1 AND "organizationId"=$2\`,rawCrossId,keeper.id);pass('Non-ORM package references also block cross-tenant erasure');
 const exported=await erasure.exportTenant`);
change('scripts/lifecycle-database-qa.cjs',' report.pass=true;',` const fair=await org('ci-lifecycle-fairness',{autoConfirmationEnabled:true,timezone:'UTC',resendApiKey:'SYNTHETIC-NOT-A-KEY',senderEmail:'sender@example.invalid'});
 const deny=await db.customer.create({data:{organizationId:fair.id,firstName:'Blocked',lastName:'Fixture',email:'blocked@example.invalid'}}),allow=await db.customer.create({data:{organizationId:fair.id,firstName:'Allowed',lastName:'Fixture',email:'allowed@example.invalid'}});
 await db.doNotRentRestriction.create({data:{organizationId:fair.id,email:deny.email,reason:'Isolated fixture'}});
 await db.$executeRawUnsafe(\`INSERT INTO "AutomationSchedulePolicy" ("organizationId","enabled","enabledAt","startHour","endHour") VALUES ($1,true,CURRENT_TIMESTAMP-INTERVAL '1 minute',0,24)\`,fair.id);
 await db.order.createMany({data:Array.from({length:101},(_,i)=>({id:'ci-fair-'+String(i).padStart(4,'0'),organizationId:fair.id,customerId:i<100?deny.id:allow.id,orderNumber:'FAIR-'+i,eventDate:new Date(Date.now()+86400000),status:'confirmed',totalAmount:20}))});
 await db.$executeRawUnsafe(\`UPDATE "PlatformSetting" SET "value"='false'::jsonb WHERE "key"='scheduled_automations_paused'\`);
 const oldCalls=calls;await engine.runBookingBatch(db,fair.id,{source:'scheduled',send});assert.equal(calls,oldCalls);await engine.runBookingBatch(db,fair.id,{source:'scheduled',send});assert.equal(calls,oldCalls+1);pass('A full batch of 100 blocked orders cannot starve the next eligible booking');
 await db.$executeRawUnsafe(\`UPDATE "PlatformSetting" SET "value"='true'::jsonb WHERE "key"='scheduled_automations_paused'\`);
 report.pass=true;`);
fs.appendFileSync('tests/lifecycle.test.cjs',`\ntest('candidate scanning uses a bounded cursor and wraps after the end',async()=>{
 const queries=[];const db={order:{findMany:async q=>{queries.push(q);return q.where.id?[]:[{id:'new'}];}}};
 const rows=await engine.scanOrders(db,{organizationId:'one-tenant'},'old');assert.equal(rows[0].id,'new');assert.equal(queries.length,2);assert.equal(queries[0].where.organizationId,'one-tenant');assert.equal(queries[0].take,100);assert.deepEqual(queries[0].where.id,{gt:'old'});assert.equal(queries[1].where.id,undefined);
});\n`);
fs.writeFileSync(marker,'Applied source-only session typing, round-robin scanning, raw-reference erasure checks, navigation and 18-table preservation coverage. Validate exact resulting commit before rollout.\n');
console.log('Source finalization complete. No database or provider was contacted.');
