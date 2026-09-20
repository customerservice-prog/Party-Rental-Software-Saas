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
  const cookie=support.createSupportSession('tenant-1','admin-1');
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
    const cookie=support.createSupportSession('tenant-1','admin-1');
    Date.now=()=>start+support.SUPPORT_SECONDS*1000-1;
    assert.equal(support.readSupportSession(cookie,'admin-1'),'tenant-1');
    Date.now=()=>start+support.SUPPORT_SECONDS*1000;
    assert.equal(support.readSupportSession(cookie,'admin-1'),null);
  } finally {Date.now=now;}
});

test('expired support session cannot fall back to a tenant host or internal organization', async () => {
  const tenant=load('lib/tenant.ts',{
    'next-auth':{getServerSession:async()=>adminSession},'next/headers':{cookies:()=>({get:()=>undefined}),headers:()=>({get:()=> 'other-tenant'})},
    './auth':{authOptions:{}},'./prisma':{prisma:{organization:{findFirst:async()=>{throw Error('must not read tenant');}}}},'./supportSession':support,
  });
  assert.equal(await tenant.getCurrentOrganization(),null);
});

test('temporary passwords cannot access staff APIs before being changed', async () => {
  const authz=load('lib/authz.ts',{
    'next-auth':{getServerSession:async()=>({user:{id:'u1',role:'owner',organizationId:'tenant-1'}})},
    'next/headers':{cookies:()=>({get:()=>undefined})},'./auth':{authOptions:{}},
    './prisma':{prisma:{user:{findUnique:async()=>({forcePasswordReset:true})}}},'./permissions':{},'./supportSession':support,
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
    './DashboardNav':{__esModule:true,default:()=>null},'./PlatformSupportBanner':{__esModule:true,default:()=>null},
  });
  await layout.default({children:null});assert.equal(runs,0);
});
