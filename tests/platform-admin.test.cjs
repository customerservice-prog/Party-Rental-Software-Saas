const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const ts = require('typescript');

// Exercise the real route handlers and auth callbacks with an isolated data
// adapter. These tests never connect to production or send customer messages.
const root = path.resolve(__dirname, '..');
function load(file, mocks = {}) {
  const filename = path.join(root, file);
  const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const mod = { exports: {} };
  const nativeRequire = createRequire(filename);
  const localRequire = name => {
    if (Object.hasOwn(mocks, name)) return mocks[name];
    if (name.endsWith('.css')) return {};
    if(name.startsWith('./')||name.startsWith('../')) {
      const resolved=path.resolve(path.dirname(filename),name);
      for(const ext of ['.ts','.tsx'])if(fs.existsSync(resolved+ext))return load(path.relative(root,resolved+ext),mocks);
    }
    if (name.startsWith('@/')) return load(name.slice(2) + '.ts', mocks);
    return nativeRequire(name);
  };
  vm.runInThisContext('(function(require,module,exports){' + output + '\n})', { filename })(localRequire, mod, mod.exports);
  return mod.exports;
}
const adminSession = { user: { id: 'admin-1', role: 'platform_admin', name: 'Test admin' } };
const adminMock = { requirePlatformAdmin: async () => adminSession };
const request = body => new Request('http://localhost/api/admin/test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
function route(file, prisma, extra = {}) {
  return load(file, { '@/lib/admin': adminMock, '@/lib/prisma': { prisma }, ...extra });
}
function select(data, spec) {
  if (!spec) return data;
  return Object.fromEntries(Object.entries(spec).filter(([,v]) => v).map(([k,v]) => [k,
    v === true ? data[k] : Array.isArray(data[k]) ? data[k].map(x => select(x, v.select)) : data[k] ? select(data[k], v.select) : null
  ]));
}
const auditLog = { create: async () => ({}) };

test('login-lock Clear accepts the UI payload without an admin target id', async () => {
  let deleted;
  const api = route('app/api/admin/security/route.ts', {
    loginThrottle: { deleteMany: async args => { deleted = args.where.id; return {count:1}; } }, auditLog,
  });
  const response = await api.POST(request({action:'throttle.clear',throttleId:'lock-1'}));
  assert.equal(response.status,200);
  assert.equal(deleted,'lock-1');
});

test('missing login lock does not report a successful clear', async () => {
  const api=route('app/api/admin/security/route.ts',{ loginThrottle:{deleteMany:async()=>({count:0})},auditLog });
  assert.equal((await api.POST(request({action:'throttle.clear',throttleId:'missing'}))).status,404);
  assert.equal((await api.POST(request({action:'throttle.clear'}))).status,400);
});

test('an existing MFA authenticator cannot be replaced through setup', async () => {
  const api=route('app/api/admin/security/route.ts',{
    organization:{findUnique:async()=>({id:'platform'})},user:{findUnique:async()=>({mfaEnabled:true})},auditLog,
  });
  for(const action of ['mfa.start','mfa.enable']) assert.equal((await api.POST(request({action,secret:'A'.repeat(32),code:'123456'}))).status,409);
});

test('support response excludes passwords, MFA secrets, and provider credentials', async () => {
  const fixture={id:'tenant-1',name:'Example',slug:'example',users:[{id:'u1',name:'User',password:'HASH-MUST-NOT-LEAK',mfaSecret:'MFA-MUST-NOT-LEAK',sessionVersion:7,tenantRole:null}],resendApiKey:'EMAIL-SECRET',senderEmail:'test@example.com',twilioAccountSid:'SID-SECRET',twilioAuthToken:'SMS-SECRET',twilioFromNumber:'123',website:null,_count:{}};
  const api=route('app/api/admin/organizations/[id]/support/route.ts',{
    organization:{findFirst:async args=>select(fixture,args.select)},$queryRawUnsafe:async()=>[],sentMessage:{count:async()=>0},blockedBookingAttempt:{count:async()=>0},
  });
  const response=await api.GET(null,{params:{id:fixture.id}});
  const data=await response.json();
  assert.equal(data.organization.emailConfigured,true);
  assert.equal(data.organization.smsConfigured,true);
  assert.equal(data.organization.users[0].name,'User');
  for(const secret of ['HASH-MUST-NOT-LEAK','MFA-MUST-NOT-LEAK','EMAIL-SECRET','SID-SECRET','SMS-SECRET']) assert.ok(!JSON.stringify(data).includes(secret));
});

test('tenant export preserves driver records without login PINs', async () => {
  const fixture={id:'tenant-1',slug:'example',drivers:[{id:'driver-1',name:'Test Driver',pin:'PIN-MUST-NOT-LEAK',isActive:true}],users:[{id:'u1',name:'User',password:'HASH-MUST-NOT-LEAK',mfaSecret:'MFA-MUST-NOT-LEAK'}]};
  const db={organization:{findFirst:async args=>select(fixture,args.select)},auditLog};
  for(const model of ['order','payment','contract','task','sentMessage','doNotRentRestriction','blockedBookingAttempt']) db[model]={findMany:async()=>[]};
  const api=route('app/api/admin/organizations/[id]/export/route.ts',db);
  const response=await api.GET(null,{params:{id:fixture.id}});
  const data=await response.json();
  assert.equal(data.organization.drivers[0].name,'Test Driver');
  for(const key of ['pin','password','mfaSecret']) assert.ok(!JSON.stringify(data).includes('"'+key+'"'));
});

function authCallbacks(db) {
  return load('lib/auth.ts',{
    './prisma':{prisma:db},'./tenant':{},'./totp':{},'./loginSecurity':{},
    'next-auth/providers/credentials':{__esModule:true,default:options=>options},
  }).authOptions.callbacks;
}

test('ownership transfer invalidates both owners existing sessions', async () => {
  const users=[{id:'old-owner',organizationId:'tenant-1',role:'owner',isActive:true,sessionVersion:0},{id:'new-owner',organizationId:'tenant-1',role:'staff',isActive:true,sessionVersion:0}];
  const db={organization:{findFirst:async()=>({id:'tenant-1',slug:'example'})},auditLog};
  db.user={
    findFirst:async({where})=>users.find(u=>u.id===where.id),
    findUnique:async({where})=>users.find(u=>u.id===where.id),
    updateMany:async({where,data})=>{for(const u of users.filter(u=>u.role===where.role&&u.id!==where.id.not)){Object.assign(u,{role:data.role,sessionVersion:u.sessionVersion+(data.sessionVersion?.increment||0)});}},
    update:async({where,data})=>{const u=users.find(u=>u.id===where.id);Object.assign(u,{role:data.role,isActive:data.isActive,sessionVersion:u.sessionVersion+(data.sessionVersion?.increment||0)});return u;},
  };
  db.$transaction=fn=>fn(db);
  const api=route('app/api/admin/organizations/[id]/support/route.ts',db);
  assert.equal((await api.POST(request({action:'user.transfer_owner',userId:'new-owner'}),{params:{id:'tenant-1'}})).status,200);
  const callbacks=authCallbacks(db);
  for(const id of ['old-owner','new-owner']) assert.equal((await callbacks.jwt({token:{id,role:'owner',sessionVersion:0}})).revoked,true);
  assert.equal(users[0].role,'staff');
  assert.equal(users[1].role,'owner');
});

test('JWT refresh uses current role and tenant and fails closed on revoked accounts', async () => {
  let user={id:'u1',role:'staff',organizationId:'tenant-2',isActive:true,sessionVersion:1};
  const callbacks=authCallbacks({user:{findUnique:async()=>user}});
  const fresh=await callbacks.jwt({token:{id:'u1',role:'owner',organizationId:'tenant-1',sessionVersion:1}});
  assert.equal(fresh.role,'staff');assert.equal(fresh.organizationId,'tenant-2');
  user.isActive=false;
  assert.equal((await callbacks.jwt({token:{id:'u1',sessionVersion:1}})).revoked,true);
});

test('login JWT retains the session version checked with the password', async () => {
  const callbacks=authCallbacks({user:{findUnique:async()=>({sessionVersion:9})}});
  const token=await callbacks.jwt({token:{},user:{id:'u1',role:'staff',organizationId:'tenant-1',sessionVersion:8}});
  assert.equal(token.sessionVersion,8);
});

test('disabled then re-enabled accounts cannot resurrect old sessions', async () => {
  const user={id:'admin-2',role:'platform_admin',isActive:true,sessionVersion:0};
  const db={organization:{findUnique:async()=>({id:'platform'})},auditLog,user:{
    findFirst:async()=>user,findUnique:async()=>user,
    update:async({data})=>{user.isActive=data.isActive;user.sessionVersion+=data.sessionVersion?.increment||0;return user;},
  }};
  const api=route('app/api/admin/security/route.ts',db);
  for(const isActive of [false,true]) assert.equal((await api.POST(request({action:'admin.toggle',id:user.id,isActive}))).status,200);
  assert.equal((await authCallbacks(db).jwt({token:{id:user.id,sessionVersion:0}})).revoked,true);
});

process.env.NEXTAUTH_SECRET='isolated-regression-test-secret-not-used-in-production';
const support=load('lib/supportSession.ts');
test('support session is bound to its admin and rejects tampering and legacy cookies', () => {
  const cookie=support.createSupportSession('tenant-1','admin-1','owner-1',0);
  assert.equal(support.readSupportSession(cookie,'admin-1'),'tenant-1');
  assert.equal(support.readSupportSession(cookie,'admin-2'),null);
  assert.equal(support.readSupportSession(cookie+'x','admin-1'),null);
  assert.equal(support.readSupportSession('tenant-1','admin-1'),null);
});

test('support access expires server-side at exactly 20 minutes', () => {
  const now=Date.now;
  const start=now();
  try {
    Date.now=()=>start;
    const cookie=support.createSupportSession('tenant-1','admin-1','owner-1',0);
    Date.now=()=>start+support.SUPPORT_SECONDS*1000-1;
    assert.equal(support.readSupportSession(cookie,'admin-1'),'tenant-1');
    Date.now=()=>start+support.SUPPORT_SECONDS*1000;
    assert.equal(support.readSupportSession(cookie,'admin-1'),null);
  } finally {Date.now=now;}
});

test('expired support session cannot fall back to a tenant host or internal organization', async () => {
  const tenant=load('lib/tenant.ts',{
    'next-auth':{getServerSession:async()=>adminSession},'next/headers':{cookies:()=>({get:()=>undefined}),headers:()=>({get:()=> 'other-tenant'})},
    './auth':{authOptions:{}},'./prisma':{prisma:{organization:{findFirst:async()=>{throw Error('must not read tenant');}}}},'./supportSession':support,'./tenantViewer':{resolveTenantViewer:async()=>null},
  });
  assert.equal(await tenant.getCurrentOrganization(),null);
});

test('temporary passwords cannot access staff APIs before being changed', async () => {
  const authz=load('lib/authz.ts',{
    'next-auth':{getServerSession:async()=>({user:{id:'u1',role:'owner',organizationId:'tenant-1'}})},
    'next/headers':{cookies:()=>({get:()=>undefined})},'./auth':{authOptions:{}},
    './prisma':{prisma:{user:{findUnique:async()=>({forcePasswordReset:true})}}},'./permissions':{},'./supportSession':support,'./tenantViewer':{resolveTenantViewer:async()=>null},
  });
  await assert.rejects(()=>authz.requireStaffSession('tenant-1'),e=>e.status===403&&/temporary password/.test(e.message));
});

for(const patch of [{monthlyPrice:-1},{annualMonthlyPrice:'NaN'},{trialDays:366},{officeUsers:1.5},{crewUsers:true},{locations:-1}]) {
  test('plan overrides reject invalid input '+JSON.stringify(patch),async()=>{
    let writes=0;
    const api=route('app/api/admin/platform-control/route.ts',{$executeRawUnsafe:async()=>{writes++;},auditLog});
    assert.equal((await api.POST(request({action:'plan.upsert',planCode:'starter',...patch}))).status,400);
    assert.equal(writes,0);
  });
}

test('valid zero-price and empty inherited plan fields are preserved',async()=>{
  let values;
  const api=route('app/api/admin/platform-control/route.ts',{$executeRawUnsafe:async(...args)=>{values=args;},auditLog});
  assert.equal((await api.POST(request({action:'plan.upsert',planCode:'starter',monthlyPrice:0,officeUsers:'',trialDays:0}))).status,200);
  assert.equal(values[2],0);assert.equal(values[4],0);assert.equal(values[5],null);
});

for(const patch of [{startsAt:'bad-date'},{startsAt:'2026-09-21T00:00:00Z',endsAt:'2026-09-20T00:00:00Z'},{audienceType:'plan',audienceValue:''},{audienceType:'plan',audienceValue:'starter, growth'}]) {
  test('announcement validation prevents silent invalid schedules/targets '+JSON.stringify(patch),async()=>{
    const api=route('app/api/admin/platform-control/route.ts',{$executeRawUnsafe:async()=>{throw Error('must not write');}});
    assert.equal((await api.POST(request({action:'announcement.upsert',title:'Test',body:'Draft',...patch}))).status,400);
  });
}

test('announcement audience filtering happens before the ten-message limit',async()=>{
  const rows=Array.from({length:15},(_,i)=>({id:String(i),audienceType:'organization',audienceValue:'other-tenant'})).concat([{id:'relevant',audienceType:'all'}]);
  const control=load('lib/platformControl.ts',{'@/lib/prisma':{prisma:{$queryRawUnsafe:async(sql,now,org,plan)=>{
    const filtered=sql.includes('"audienceValue"=$2')?rows.filter(r=>r.audienceType==='all'||r.audienceValue===org):rows;
    return filtered.slice(0,10);
  }}}});
  assert.deepEqual((await control.getActivePlatformAnnouncements('tenant-1','starter')).map(x=>x.id),['relevant']);
});

test('support dashboard viewing does not trigger customer automations',async()=>{
  let runs=0;
  const layout=load('app/dashboard/layout.tsx',{
    'next-auth':{getServerSession:async()=>adminSession},'next/navigation':{redirect:()=>{throw Error('unexpected redirect');}},
    '@/lib/auth':{authOptions:{}},'@/lib/prisma':{prisma:{}},'@/lib/tenant':{getCurrentOrganization:async()=>({id:'tenant-1',name:'Example',planTier:'starter'})},
    '@/lib/billing':{getBillingStatus:async()=>({})},'@/lib/automations':{runBookingAutomations:async()=>{runs++;}},
    '@/lib/platformControl':{getActivePlatformAnnouncements:async()=>[],getPlatformSetting:async(k,fallback)=>fallback},
    '@/lib/tenantViewer':{resolveTenantViewer:async()=>({id:'owner-1',organizationId:'tenant-1',name:'Tenant owner',role:'owner',organization:{status:'active'}})},
    './DashboardNav':{__esModule:true,default:()=>null},'./PlatformSupportBanner':{__esModule:true,default:()=>null},
  });
  await layout.default({children:null});assert.equal(runs,0);
});

test('admin monitoring uses the same lock thresholds as sign-in enforcement', async()=>{
  const policy=load('lib/loginPolicy.ts');
  let row={failCount:5,failExpiresAt:new Date(Date.now()+60000),burstCount:0,burstExpiresAt:null};
  const security=load('lib/loginSecurity.ts',{'./prisma':{prisma:{loginThrottle:{findUnique:async()=>row}}},'./loginPolicy':policy});
  assert.equal(policy.isThrottleLocked(row),false);
  assert.equal(await security.isLoginLocked('test-ip'),false);
  row.failCount=policy.LOGIN_FAIL_LIMIT;
  assert.equal(policy.isThrottleLocked(row),true);
  assert.equal(await security.isLoginLocked('test-ip'),true);
});

test('admin monitoring includes burst locks and excludes expired locks',async()=>{
  const policy=load('lib/loginPolicy.ts');
  const row={failCount:0,failExpiresAt:null,burstCount:policy.LOGIN_BURST_LIMIT,burstExpiresAt:new Date(Date.now()+60000)};
  assert.equal(policy.isThrottleLocked(row),true);
  row.burstExpiresAt=new Date(Date.now()-1000);
  assert.equal(policy.isThrottleLocked(row),false);
});

function supportFixture() {
  const users=[
    {id:'owner-1',organizationId:'tenant-1',name:'Tenant owner',role:'owner',isActive:true,sessionVersion:0,forcePasswordReset:false,organization:{status:'active'},tenantRole:null},
    {id:'staff-1',organizationId:'tenant-1',name:'Tenant staff',role:'staff',isActive:true,sessionVersion:0,forcePasswordReset:false,organization:{status:'active'},tenantRole:{permissions:['orders.view']}},
    {id:'other-owner',organizationId:'tenant-2',name:'Other owner',role:'owner',isActive:true,sessionVersion:0},
  ];
  const events=[];let cookie;let options;
  const db={
    organization:{findFirst:async()=>({id:'tenant-1',name:'Example',slug:'example',status:'active'})},
    user:{findFirst:async({where})=>users.find(u=>u.organizationId===where.organizationId&&(!where.id||u.id===where.id)&&u.isActive===where.isActive&&(typeof where.role==='string'?u.role===where.role:where.role.in.includes(u.role)))||null,findUnique:async({where})=>users.find(u=>u.id===where.id)},
    auditLog:{create:async({data})=>{events.push(data);}},
  };
  const headers={'next/headers':{cookies:()=>({get:()=>cookie?{value:cookie}:undefined,set:(name,value,opts)=>{assert.equal(name,support.SUPPORT_COOKIE);cookie=value;options=opts;}})}};
  const api=route('app/api/admin/organizations/[id]/support-session/route.ts',db,headers);
  const viewer=load('lib/tenantViewer.ts',{'@/lib/admin':{getPlatformAdminAccess:async()=> 'administrator'},'./prisma':{prisma:db},'./supportSession':support,...headers});
  const authz=load('lib/authz.ts',{'next-auth':{getServerSession:async()=>adminSession},'./auth':{authOptions:{}},'./prisma':{prisma:db},'./permissions':load('lib/permissions.ts'),'./tenantViewer':viewer});
  return {users,events,db,headers,api,viewer,authz,get cookie(){return cookie},get options(){return options},start:body=>api.POST(request(body),{params:{id:'tenant-1'}})};
}

test('tenant view starts as the real owner, preserves admin actor, and clears on exit',async()=>{
  const f=supportFixture();
  assert.equal((await f.start({})).status,200);
  assert.equal(support.readSupportSessionDetails(f.cookie,'admin-1').userId,'owner-1');
  assert.equal(f.options.httpOnly,true);assert.equal(f.options.sameSite,'lax');assert.equal(f.options.maxAge,1200);
  assert.deepEqual(await f.authz.requireOwnerSession('tenant-1'),{id:'admin-1',effectiveUserId:'owner-1',role:'owner',organizationId:'tenant-1'});
  assert.equal(f.events[0].performedBy,'admin-1');assert.equal(JSON.parse(f.events[0].details).viewAsUserId,'owner-1');
  assert.equal((await f.api.DELETE()).status,200);
  assert.equal(f.cookie,'');assert.equal(f.options.maxAge,0);
  assert.equal(f.events[1].action,'platform_support_session.ended');
  await assert.rejects(()=>f.authz.requireStaffSession('tenant-1'),e=>e.status===401);
});

test('staff impersonation has the same permission outcomes as that staff account',async()=>{
  const f=supportFixture();await f.start({userId:'staff-1'});
  const normal=load('lib/authz.ts',{'next-auth':{getServerSession:async()=>({user:f.users[1]})},'./auth':{authOptions:{}},'./prisma':{prisma:f.db},'./permissions':load('lib/permissions.ts'),'./tenantViewer':f.viewer});
  for(const auth of [normal,f.authz]){
    assert.equal((await auth.requirePermission('tenant-1','orders.view')).role,'staff');
    await assert.rejects(()=>auth.requirePermission('tenant-1','orders.manage'),e=>e.status===403);
    await assert.rejects(()=>auth.requireOwnerSession('tenant-1'),e=>e.status===403);
    await assert.rejects(()=>auth.requireStaffSession('tenant-2'),e=>e.status===401);
  }
  f.users[1].tenantRole.permissions.push('orders.manage');
  assert.equal((await f.authz.requirePermission('tenant-1','orders.manage')).id,'admin-1');
});

for(const userId of ['other-owner','missing']) test('cannot impersonate a user outside the selected tenant: '+userId,async()=>{
  const f=supportFixture();assert.equal((await f.start({userId})).status,400);assert.equal(f.cookie,undefined);assert.equal(f.events.length,0);
});

for(const change of ['disabled','deleted','password-reset','role-changed','moved-tenant']) test('existing tenant view is revoked when target is '+change,async()=>{
  const f=supportFixture();await f.start({userId:'staff-1'});
  if(change==='disabled')f.users[1].isActive=false;
  if(change==='deleted')f.users.splice(1,1);
  if(change==='password-reset')f.users[1].sessionVersion++;
  if(change==='role-changed')f.users[1].role='platform_admin';
  if(change==='moved-tenant')f.users[1].organizationId='tenant-2';
  await assert.rejects(()=>f.authz.requireStaffSession('tenant-1'),e=>e.status===401);
});

test('forced reset and suspended tenants stay blocked during impersonation',async()=>{
  const f=supportFixture();await f.start({});
  f.users[0].forcePasswordReset=true;
  await assert.rejects(()=>f.authz.requireStaffSession('tenant-1'),e=>e.status===403&&/password/.test(e.message));
  f.users[0].forcePasswordReset=false;f.users[0].organization.status='suspended';
  await assert.rejects(()=>f.authz.requireStaffSession('tenant-1'),e=>e.status===403&&/suspended/.test(e.message));
});

test('support start fails closed if the administrator audit cannot be recorded',async()=>{
  const f=supportFixture();f.db.auditLog.create=async()=>{throw Error('audit unavailable');};
  await assert.rejects(()=>f.start({}),/audit unavailable/);assert.equal(f.cookie,undefined);
});

test('tenant view cannot accidentally change the administrator password',async()=>{
  const f=supportFixture();await f.start({});
  const api=route('app/api/account/change-password/route.ts',{}, {'next-auth':{getServerSession:async()=>adminSession},'@/lib/auth':{authOptions:{}},...f.headers});
  assert.equal((await api.POST(request({currentPassword:'unused',newPassword:'unused-password'}))).status,403);
});

for(const role of ['owner','staff']) test('dashboard navigation and identity match the selected '+role,async()=>{
  const {renderToStaticMarkup}=require('react-dom/server');
  const React=require('react');
  const target={id:'u1',name:'Actual tenant user',role,organizationId:'tenant-1',isActive:true};
  let signedIn={user:target};let view=null;
  const Nav=({children,supportBanner,...props})=>React.createElement('div',null,React.createElement('nav',null,JSON.stringify(props)),children);
  const layout=load('app/dashboard/layout.tsx',{
    'next-auth':{getServerSession:async()=>signedIn},'next/navigation':{redirect:()=>{throw Error('unexpected redirect');}},
    '@/lib/auth':{authOptions:{}},'@/lib/prisma':{prisma:{user:{findUnique:async()=>target}}},
    '@/lib/tenant':{getCurrentOrganization:async()=>({id:'tenant-1',name:'Example',planTier:'starter',status:'active'})},
    '@/lib/tenantViewer':{resolveTenantViewer:async()=>view},
    '@/lib/billing':{getBillingStatus:async()=>({message:'Trial status',trialDaysLeft:2})},'@/lib/automations':{runBookingAutomations:async()=>{}},
    '@/lib/platformControl':{getActivePlatformAnnouncements:async()=>[{id:'a1',title:'Tenant announcement'}],getPlatformSetting:async(k,f)=>f},
    './DashboardNav':{__esModule:true,default:Nav},'./PlatformSupportBanner':{__esModule:true,default:()=>null},
  });
  const regular=renderToStaticMarkup(await layout.default({children:React.createElement('main',null,'Tenant content')}));
  signedIn=adminSession;view={...target,support:{expiresAt:Date.now()+1200000}};
  const impersonated=renderToStaticMarkup(await layout.default({children:React.createElement('main',null,'Tenant content')}));
  assert.equal(impersonated,regular);
  assert.ok(impersonated.includes('Actual tenant user'));assert.ok(!impersonated.includes('Test admin'));
});

test('overview uses the tenant calendar day and rejects invalid month/year input',()=>{
  const {dashboardDates}=load('lib/dashboardDates.ts');
  const dates=dashboardDates(new Date('2026-09-20T02:00:00Z'),'America/New_York',{year:'NaN',month:'99'});
  assert.equal(dates.today.toISOString(),'2026-09-19T00:00:00.000Z');
  assert.equal(dates.year,2026);assert.equal(dates.month,8);
  assert.equal(dates.weekEnd.toISOString(),'2026-09-26T00:00:00.000Z');
  assert.equal(dashboardDates(new Date('2026-09-20T02:00:00Z'),'bad/timezone').today.toISOString(),'2026-09-20T00:00:00.000Z');
});

test('overview reports all recorded payments less refunds and all eligible balances',async()=>{
  const queries=[];const capture=(kind,value)=>async args=>{queries.push({kind,...args});return value;};
  const totalField={name:'totalAmount'};
  const page=load('app/dashboard/page.tsx',{
    '@/lib/tenant':{requireCurrentOrganization:async()=>({id:'tenant-1',timezone:'America/New_York',contactEmail:null,address:null,city:null,state:null,zip:null})},
    '@/lib/weather':{getOrganizationWeather:async()=>null},
    '@/lib/prisma':{prisma:{item:{count:capture('items',8)},order:{fields:{totalAmount:totalField},findMany:capture('orders',[]),count:capture('count',4),aggregate:capture('balances',{_sum:{totalAmount:2000,amountPaid:1250}})},payment:{groupBy:capture('payments',[{type:'payment',_sum:{amount:1200}},{type:'refund',_sum:{amount:150}}]),findMany:capture('paymentHistory',[])},orderItem:{findMany:capture('popular',[])}}},
    './HomeCalendar':{__esModule:true,default:()=>null},'./HomeTasks':{__esModule:true,default:()=>null},'./HomeWeather':{__esModule:true,default:()=>null},'./HomeScreen':{__esModule:true,default:()=>null},'./HomeMeetings':{__esModule:true,default:()=>null},'./BestSellersChart':{__esModule:true,default:()=>null},'./MonthlyPaymentsChart':{__esModule:true,default:()=>null},
  });
  const html=require('react-dom/server').renderToStaticMarkup(await page.default({searchParams:{}}));
  assert.ok(html.includes('$1,050.00'));assert.ok(html.includes('$750.00'));
  for(const query of queries)assert.equal(query.where.organizationId??query.where.order?.organizationId,'tenant-1');
  const balances=queries.find(q=>q.kind==='balances');assert.equal(balances.take,undefined);assert.deepEqual(balances.where.status.in,['active','confirmed','completed']);assert.equal(balances.where.amountPaid.lt,totalField);
  const payments=queries.find(q=>q.kind==='payments');assert.equal(payments.take,undefined);assert.ok(payments.where.createdAt.gte instanceof Date);
});

test('order search supports full customer names, status, balance, and bounded pagination',async()=>{
  let listing;
  const page=load('app/dashboard/orders/page.tsx',{
    '@/lib/tenant':{requireCurrentOrganization:async()=>({id:'tenant-1'})},
    '@/lib/prisma':{prisma:{order:{fields:{totalAmount:'total-field'},count:async()=>27,findMany:async args=>{listing=args;return [];}}}},
  });
  await page.default({searchParams:{q:'Jane Doe',status:'confirmed',balance:'unpaid',page:'999'}});
  assert.equal(listing.where.organizationId,'tenant-1');assert.equal(listing.where.status,'confirmed');assert.equal(listing.where.AND.length,2);assert.equal(listing.where.amountPaid.lt,'total-field');assert.equal(listing.take,25);assert.equal(listing.skip,25);
  await page.default({searchParams:{status:'invented',page:'-12'}});
  assert.equal(listing.where.status,undefined);assert.equal(listing.skip,0);
});

test('order CSV export preserves the visible search and balance filters',async()=>{
  let listing;
  const api=load('app/api/orders/export/route.ts',{
    '@/lib/tenant':{requireCurrentOrganization:async()=>({id:'tenant-1'})},'@/lib/authz':{requireStaffSession:async()=>({id:'admin-1'}),authzErrorResponse:e=>{throw e;}},'@/lib/audit':{logActivity:async()=>{}},
    '@/lib/prisma':{prisma:{order:{fields:{totalAmount:'total-field'},findMany:async args=>{listing=args;return [];}}}},
  });
  const response=await api.GET(new Request('http://localhost/api/orders/export?q=Jane+Doe&status=active&balance=unpaid'));
  assert.equal(response.status,200);assert.equal(listing.where.organizationId,'tenant-1');assert.equal(listing.where.status,'active');assert.equal(listing.where.AND.length,2);assert.equal(listing.where.amountPaid.lt,'total-field');assert.equal(listing.take,undefined);
});

test('customer CSV export respects the directory full-name and date filters',async()=>{
  let listing;
  const api=load('app/api/customers/export/route.ts',{
    '@/lib/tenant':{requireCurrentOrganization:async()=>({id:'tenant-1'})},'@/lib/authz':{requireStaffSession:async()=>({id:'admin-1'}),authzErrorResponse:e=>{throw e;}},'@/lib/audit':{logActivity:async()=>{}},
    '@/lib/prisma':{prisma:{customer:{findMany:async args=>{listing=args;return [];}}}},
  });
  const response=await api.GET(new Request('http://localhost/api/customers/export?q=Jane+Doe&from=2026-09-01&to=2026-09-19'));
  assert.equal(response.status,200);assert.equal(listing.where.organizationId,'tenant-1');assert.equal(listing.where.AND.length,2);assert.equal(listing.where.createdAt.lte.toISOString(),'2026-09-19T23:59:59.999Z');
});

test('signup field validation always produces readable text instead of a React object error',()=>{
 const {signupErrorMessage,suggestBusinessSlug}=load('lib/signupFeedback.ts');
 assert.equal(signupErrorMessage({error:{formErrors:[],fieldErrors:{slug:['Must be at least 3 characters']}}}),'Business address: Must be at least 3 characters');
 assert.equal(signupErrorMessage({error:'That address is taken'}),'That address is taken');
 assert.equal(typeof signupErrorMessage(null),'string');
 assert.equal(suggestBusinessSlug('Lakeside Events & Rentals!'),'lakeside-events-rentals');
});

test('malformed signup requests return validation errors without creating an account',async()=>{
 let writes=0;const api=load('app/api/signup/route.ts',{'@/lib/prisma':{prisma:{organization:{create:async()=>{writes++;}}}}});
 const response=await api.POST(new Request('http://localhost/api/signup',{method:'POST',body:'invalid json'}));
 assert.equal(response.status,400);assert.equal(writes,0);
});
