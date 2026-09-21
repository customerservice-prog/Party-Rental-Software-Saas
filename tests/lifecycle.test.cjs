const {test}=require('node:test'),assert=require('node:assert/strict');
const registry=require('../lib/sessionRegistry.cjs');
const engine=require('../lib/automationEngine.cjs');
const erasure=require('../lib/tenantErasure.cjs');
test('session records store a digest, not a usable session key or full user agent',async()=>{
 let values;const db={$executeRawUnsafe:async(...args)=>{values=args;}};
 const session=await registry.createRegisteredSession(db,{id:'u',organizationId:'o',sessionVersion:3},{'user-agent':'Mozilla Chrome/123 Windows PRIVATE-USER-AGENT'});
 assert.match(session.key,/^[A-Za-z0-9_-]{43}$/);assert.ok(!JSON.stringify(values).includes(session.key));assert.match(values[2],/^[a-f0-9]{64}$/);assert.equal(values[6],'Chrome · Windows');assert.ok(!JSON.stringify(values).includes('PRIVATE-USER-AGENT'));
});
test('malformed registry keys never touch the database',async()=>{
 const fail=async()=>{throw Error('must not query');};for(const key of [null,'short','../key'])assert.equal(await registry.validateRegisteredSession({$queryRawUnsafe:fail},key,'u',1),false);
});
test('session directory selects no credential material',async()=>{
 let sql;const result=await registry.listRegisteredSessions({$queryRawUnsafe:async query=>{sql=query;return[];}},{userId:'u',q:'test'});
 assert.ok(!/keyHash|password|mfaSecret/.test(sql));assert.equal(result.hasMore,false);
});
test('session revocation and its audit are in one transaction and scoped to the caller',async()=>{
 let args,audit;const db={$transaction:async fn=>fn({$queryRawUnsafe:async(...a)=>{args=a;return[{id:'s',organizationId:'o'}];},auditLog:{create:async a=>{audit=a.data;}}})};
 assert.equal(await registry.revokeRegisteredSession(db,{id:'s',actorId:'u',ownUserId:'u'}),true);assert.equal(args[3],'u');assert.equal(audit.action,'security.session.revoked');assert.ok(!JSON.stringify(audit).includes('keyHash'));
});
test('recipient normalization rejects unsupported phone formats',()=>{
 assert.equal(engine.phone('(315) 555-1234'),'+13155551234');assert.equal(engine.phone('+44 20 7946 0958'),'+442079460958');assert.equal(engine.phone('123'),'');
});
test('automation hours use tenant local time and fail closed on invalid zones',()=>{
 const p={startHour:9,endHour:19};assert.equal(engine.windowOpen(p,'America/New_York',new Date('2026-09-21T15:00:00Z')),true);assert.equal(engine.windowOpen(p,'America/New_York',new Date('2026-09-21T02:00:00Z')),false);assert.equal(engine.windowOpen(p,'invalid-zone'),false);
});
test('inactive, canceled, paid and past-event orders cannot become eligible reminders',()=>{
 const now=new Date('2026-09-21T12:00:00Z'),org={status:'active',autoConfirmationEnabled:true,autoBalanceReminderEnabled:true,autoReminderEnabled:true,reminderDaysBefore:3,balanceReminderDaysBefore:3},order={status:'confirmed',eventDate:'2026-09-22',totalAmount:100,amountPaid:0};
 assert.equal(engine.eligible(order,org,'booking_confirmation',now),true);assert.equal(engine.eligible({...order,status:'canceled'},org,'booking_confirmation',now),false);assert.equal(engine.eligible(order,{...org,status:'suspended'},'booking_confirmation',now),false);assert.equal(engine.eligible({...order,amountPaid:100},org,'balance_due',now),false);assert.equal(engine.eligible({...order,eventDate:'2026-09-20'},org,'event_reminder',now),false);
});
const delivery={id:'test-id',channel:'email',to:'test@example.invalid',subject:'Test',body:'<unsafe>\ntext',org:{name:'Example',senderEmail:'sender@example.invalid',resendApiKey:'SYNTHETIC-TEST-KEY'}};
test('email transport uses fixed provider origin, timeout and idempotency header',async()=>{
 let options;const result=await engine.providerSend(delivery,async(url,o)=>{assert.equal(url,'https://api.resend.com/emails');options=o;return new Response(JSON.stringify({id:'provider-1'}),{status:200});});
 assert.equal(result.state,'accepted');assert.equal(options.headers['Idempotency-Key'],'crm-booking/test-id');assert.equal(options.redirect,'error');assert.ok(options.signal);assert.match(options.body,/&lt;unsafe&gt;/);assert.ok(!JSON.stringify(result).includes('SYNTHETIC-TEST-KEY'));
});
test('ambiguous provider successes, server errors and network timeouts are never reported sent',async()=>{
 for(const fetcher of [async()=>new Response('{}',{status:200}),async()=>new Response('{}',{status:503}),async()=>{throw Error('synthetic timeout');}]){const result=await engine.providerSend(delivery,fetcher);assert.equal(result.state,'unknown');}
 assert.equal((await engine.providerSend(delivery,async()=>new Response('{}',{status:401}))).state,'failed');
});
test('an invalid Twilio SID cannot change the HTTP destination',async()=>{
 const result=await engine.providerSend({...delivery,channel:'sms',org:{twilioAccountSid:'invalid-fixture'}},async()=>{throw Error('should never fetch');});assert.equal(result.state,'failed');
});
test('failed and uncertain sends do not stamp an order as successfully sent',async()=>{
 for(const state of ['failed','unknown']){let changed=false;await engine.finishDelivery({$transaction:async fn=>fn({$executeRawUnsafe:async()=>1,sentMessage:{create:async()=>{}},order:{updateMany:async()=>{changed=true;}}})},{...delivery,organizationId:'o',orderId:'order',customerId:'c',kind:'booking_confirmation',toName:'Test'},{state,errorCode:'fixture'});assert.equal(changed,false);}
});
test('tenant exports redact private keys, tokens, passwords and driver PINs',()=>{
 const out=erasure.redact({password:'P',resendApiKey:'R',twilioAuthToken:'T',mfaSecret:'M',keyHash:'H',pin:'1234',name:'Keep me',nested:[{token:'placeholder',description:'Keep this too'}]});assert.deepEqual(out,{name:'Keep me',nested:[{description:'Keep this too'}]});
});
test('complete tenant table inventory includes operational and session metadata',()=>{
 for(const table of ['AuthSessionRegistry','AutomationDelivery','AutomationSchedulePolicy','PlatformBillingHistory','CustomerPortalAccess','StoreCreditTransaction'])assert.ok(erasure.DIRECT.includes(table));assert.deepEqual(erasure.CHILD.OrderItem,['Order','orderId']);
});

test('candidate scanning uses a bounded cursor and wraps after the end',async()=>{
 const queries=[];const db={order:{findMany:async q=>{queries.push(q);return q.where.id?[]:[{id:'new'}];}}};
 const rows=await engine.scanOrders(db,{organizationId:'one-tenant'},'old');assert.equal(rows[0].id,'new');assert.equal(queries.length,2);assert.equal(queries[0].where.organizationId,'one-tenant');assert.equal(queries[0].take,100);assert.deepEqual(queries[0].where.id,{gt:'old'});assert.equal(queries[1].where.id,undefined);
});
