const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {createRequire}=require('node:module');
const ts=require('typescript');
const root=path.resolve(__dirname,'..');
function load(file,mocks={}){
 const filename=path.join(root,file),mod={exports:{}};
 const code=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
 const native=createRequire(filename);
 const req=name=>Object.hasOwn(mocks,name)?mocks[name]:name.startsWith('@/')?load(name.slice(2)+'.ts',mocks):native(name);
 vm.runInThisContext('(function(require,module,exports){'+code+'\n})',{filename})(req,mod,mod.exports);return mod.exports;
}
const r=load('lib/adminReadiness.ts');
test('saved configuration is never marked verified',()=>{
 assert.equal(r.configurationState([null,'',' ']),'not configured');
 assert.equal(r.configurationState(['key',null]),'incomplete');
 assert.equal(r.configurationState(['key','sender']),'configured · not checked');
});
test('pagination rejects malformed values and bounds query input',()=>{
 for(const page of ['Infinity','-1','3.1','10000000','x'])assert.equal(r.directoryParams({page}).page,1);
 assert.equal(r.directoryParams({page:'20',q:'a'.repeat(101)}).q.length,100);
 assert.equal(r.directoryParams({q:['one','two']}).q,'');
});
test('catalog estimates exclude unknown, founding and custom pricing instead of inventing zero',()=>{
 const p={isCustomPricing:false,monthlyPrice:65,annualMonthlyPrice:50};
 const s={planTier:'starter',billingInterval:'monthly',foundingCustomer:false};
 assert.equal(r.catalogMonthlyValue(s,p),65);
 assert.equal(r.catalogMonthlyValue({...s,billingInterval:'annual'},p),50);
 for(const changed of [{planTier:'missing'},{foundingCustomer:true},{billingInterval:'weekly'}])assert.equal(r.catalogMonthlyValue({...s,...changed},p),null);
 assert.equal(r.catalogMonthlyValue(s,{...p,isCustomPricing:true}),null);
 assert.equal(r.catalogMonthlyValue(s,{...p,monthlyPrice:NaN}),null);
 assert.equal(r.catalogMonthlyValue(s,{...p,monthlyPrice:0}),0);
 assert.equal(r.knownPlanCode('standard'),'growth');
});
test('core onboarding does not require optional SMS or a custom domain',()=>{
 const o={website:{publishedAt:new Date()},_count:{items:1,orders:1}};
 assert.equal(r.setupProgress(o).percent,100);
 assert.equal(r.setupProgress({website:null,_count:{items:0,orders:0}}).next,'Inventory added');
});
test('automation watch excludes disabled tenants and distinguishes missing heartbeat',()=>{
 const now=Date.now(),o={status:'active',autoConfirmationEnabled:true,autoReminderEnabled:false,autoBalanceReminderEnabled:false,automationsLastRunAt:null};
 assert.equal(r.automationState(o,now),'never recorded');
 assert.equal(r.automationState({...o,status:'suspended'},now),'disabled');
 assert.equal(r.automationState({...o,autoConfirmationEnabled:false},now),'disabled');
 assert.equal(r.automationState({...o,automationsLastRunAt:new Date(now-1000)},now),'recent run');
 assert.equal(r.automationState({...o,automationsLastRunAt:new Date(now-86400001)},now),'stale');
 assert.equal(r.automationState({...o,automationsLastRunAt:new Date(now+86400000)},now),'invalid timestamp');
});
const providers=load('lib/adminIntegrationChecks.ts');
const blank={stripeAccountId:null,resendApiKey:null,senderEmail:null,twilioAccountSid:null,twilioAuthToken:null,twilioFromNumber:null,customDomain:null};
test('unconfigured providers never initiate external calls',async()=>{
 const fail=async()=>{throw Error('external call forbidden')};
 const checks=await providers.inspectTenantConnections(blank,{fetch:fail,account:fail,stripeConfigured:false});
 assert.ok(checks.every(c=>c.state==='not configured'));
});
test('provider checks use only fixed-host GET requests and redact credentials',async()=>{
 const seen=[];
 const o={...blank,stripeAccountId:'acct_123',resendApiKey:'PRIVATE-EMAIL-KEY',senderEmail:'owner@example.com',twilioAccountSid:'AC'+'a'.repeat(32),twilioAuthToken:'PRIVATE-SMS-TOKEN',twilioFromNumber:'+15555550123',customDomain:'localhost'};
 const checks=await providers.inspectTenantConnections(o,{stripeConfigured:true,account:async()=>({charges_enabled:true,payouts_enabled:false,details_submitted:true}),fetch:async(url,options)=>{
   seen.push(url);assert.equal(options.method,'GET');assert.equal(options.redirect,'error');assert.ok(options.signal);
   return new Response(JSON.stringify(String(url).includes('resend')?{data:[{name:'example.com',status:'verified'}]}:{status:'active'}),{status:200});
 }});
 assert.equal(seen.length,2);assert.ok(seen.every(u=>u.startsWith('https://api.resend.com/')||u.startsWith('https://api.twilio.com/')));
 assert.equal(checks[0].state,'attention');assert.equal(checks[1].state,'verified');assert.equal(checks[2].state,'verified');assert.equal(checks[3].state,'unverified');
 for(const secret of ['PRIVATE-EMAIL-KEY','PRIVATE-SMS-TOKEN',o.twilioAccountSid])assert.ok(!JSON.stringify(checks).includes(secret));
});
test('sending-only Resend credentials produce unverified, not an invented outage',async()=>{
 const checks=await providers.inspectTenantConnections({...blank,resendApiKey:'key',senderEmail:'a@example.com'},{stripeConfigured:false,account:async()=>{},fetch:async()=>new Response('{}',{status:403})});
 assert.equal(checks[1].state,'unverified');assert.match(checks[1].detail,/Sending-only/);
});
test('invalid provider identifiers cannot change request destinations',async()=>{
 let calls=0;const external=async()=>{calls++;throw Error('must not call')};
 const checks=await providers.inspectTenantConnections({...blank,stripeAccountId:'../bad',twilioAccountSid:'../../bad',twilioAuthToken:'secret',twilioFromNumber:'number'},{stripeConfigured:true,account:external,fetch:external});
 assert.equal(calls,0);assert.equal(checks[0].state,'attention');assert.equal(checks[2].state,'attention');
});
const responseMock={NextResponse:{json:(body,init)=>new Response(JSON.stringify(body),{...init,headers:{'Content-Type':'application/json',...init?.headers}})}};
function api(file,db,extra={}){return load(file,{'next/server':responseMock,'@/lib/admin':{requirePlatformAdmin:async()=>({user:{id:'test-admin'}})},'@/lib/prisma':{prisma:db},'@/lib/stripe':{stripe:{}},...extra})}
const req=origin=>new Request('http://localhost/api/admin/test',{method:'POST',...(origin?{headers:{origin}}:{})});
const billing='app/api/admin/organizations/[id]/billing/route.ts';
const integration='app/api/admin/organizations/[id]/integrations/route.ts';
test('inspection endpoints enforce admin access before touching data',async()=>{
 for(const file of [billing,integration]){
  const handler=api(file,{}, {'@/lib/admin':{requirePlatformAdmin:async()=>{throw Error('DENIED')}}});
  await assert.rejects(()=>handler.POST(req(),{params:{id:'t1'}}),/DENIED/);
 }
});
test('cross-origin inspection is rejected before database or provider traffic',async()=>{
 for(const file of [billing,integration])assert.equal((await api(file,{}).POST(req('https://external.example'),{params:{id:'t1'}})).status,403);
});
test('missing subscription linkage does not produce a fake billing result',async()=>{
 const handler=api(billing,{platformSubscription:{findFirst:async args=>{assert.equal(args.where.organization.slug.not,'_platform_internal');return {stripeSubId:null}}}});
 assert.equal((await handler.POST(req(),{params:{id:'t1'}})).status,409);
});
test('provider inspection responses and audit records exclude tenant secrets',async()=>{
 let audit;
 const handler=api(integration,{organization:{findFirst:async args=>{assert.equal(args.where.slug.not,'_platform_internal');return {id:'t1',...blank,resendApiKey:'PRIVATE'}}},auditLog:{create:async args=>{audit=args.data}}},{'@/lib/adminIntegrationChecks':{inspectTenantConnections:async()=>[{provider:'Resend',state:'unverified',detail:'Check credentials'}]}});
 const response=await handler.POST(req(),{params:{id:'t1'}});
 assert.equal(response.headers.get('cache-control'),'no-store');
 assert.ok(!(await response.text()).includes('PRIVATE'));assert.ok(!JSON.stringify(audit).includes('PRIVATE'));assert.equal(audit.performedBy,'test-admin');
});
test('Stripe billing reads invoices without modifying subscriptions or charging',async()=>{
 process.env.STRIPE_SECRET_KEY='test-only';let audit,calls=0;
 const stripe={subscriptions:{retrieve:async()=>({id:'sub_test',customer:'cus_test',status:'active',livemode:false,cancel_at_period_end:false,current_period_end:123,items:{data:[]}})},invoices:{list:async params=>{calls++;assert.equal(params.subscription,'sub_test');assert.equal(params.limit,12);return {data:[{id:'in_1',created:1,status:'paid',currency:'usd',amount_paid:100,amount_remaining:0,attempt_count:1,customer_email:'PRIVATE-CUSTOMER'}],has_more:true}}}};
 const handler=api(billing,{platformSubscription:{findFirst:async()=>({stripeSubId:'sub_test',stripeCustomerId:'cus_test',status:'trialing'})},auditLog:{create:async args=>{audit=args.data}}},{'@/lib/stripe':{stripe}});
 const response=await handler.POST(req(),{params:{id:'t1'}});const data=await response.json();
 assert.equal(data.subscription.liveMode,false);assert.equal(data.localStatus,'trialing');assert.equal(data.moreInvoices,true);assert.equal(calls,1);assert.equal(audit.action,'platform.billing.inspected');assert.ok(!JSON.stringify(data).includes('PRIVATE-CUSTOMER'));
});
test('mismatched Stripe customer linkage blocks invoice access',async()=>{
 const handler=api(billing,{platformSubscription:{findFirst:async()=>({stripeSubId:'sub_test',stripeCustomerId:'cus_right',status:'active'})}},{'@/lib/stripe':{stripe:{subscriptions:{retrieve:async()=>({customer:'cus_wrong'})}}}});
 assert.equal((await handler.POST(req(),{params:{id:'t1'}})).status,409);
});
