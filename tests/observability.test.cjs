const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const {createRequire}=require('node:module');
function load(file,mocks={}){const filename=path.resolve(file),module={exports:{}},native=createRequire(filename);const code=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;const req=n=>Object.hasOwn(mocks,n)?mocks[n]:n.startsWith('@/')?load(n.slice(2)+'.ts',mocks):n.startsWith('./')?load(path.join(path.dirname(filename),n+'.ts'),mocks):native(n);vm.runInThisContext('(function(require,module,exports){'+code+'\n})',{filename})(req,module,module.exports);return module.exports;}
const f=load('lib/featureUsage.ts');
test('feature names are a fixed catalog and do not expose record URLs',()=>{assert.equal(f.featureForPath('/dashboard/orders/private-order-id'),'orders');assert.equal(f.featureForPath('/dashboard/inventory'),'inventory');assert.equal(f.featureForPath('/admin/organizations'),null);assert.equal(f.isTrackedFeature('arbitrary-customer-content'),false)});
test('cohorts exclude pre-coverage tenants and immature return windows',()=>{
 const coverage=new Date('2026-01-01T12:00:00Z'),now=new Date('2026-02-20T15:00:00Z');
 const accounts=[{id:'old',createdAt:new Date('2025-12-01')},{id:'mature',createdAt:new Date('2026-01-02T22:00:00Z')},{id:'young',createdAt:new Date('2026-02-15')}];
 const days=[{organizationId:'mature',day:new Date('2026-01-09')},{organizationId:'mature',day:new Date('2026-02-01')}];
 const rows=f.observedReturnCohorts(accounts,days,coverage,now);assert.equal(rows.length,2);assert.equal(rows[0].accounts,1);assert.equal(rows[0].week2Eligible,1);assert.equal(rows[0].week2Returned,1);assert.equal(rows[0].month2Returned,1);assert.equal(rows[1].week2Eligible,0);assert.equal(rows[1].month2Eligible,0);
});
test('return windows use complete UTC days and exclusive end boundaries',()=>{
 const a=[{id:'t1',createdAt:new Date('2026-01-01T23:59:59Z')}],coverage=new Date('2026-01-01');
 const days=[{organizationId:'t1',day:new Date('2026-01-15')}];
 assert.equal(f.observedReturnCohorts(a,days,coverage,new Date('2026-01-14T23:59:59Z'))[0].week2Eligible,0);
 const row=f.observedReturnCohorts(a,days,coverage,new Date('2026-01-15T00:00:00Z'))[0];assert.equal(row.week2Eligible,1);assert.equal(row.week2Returned,0);
});
const responseMock={NextResponse:class extends Response{static json(body,init){return new Response(JSON.stringify(body),init)}}};
function api(user,extra={}){return load('app/api/usage/route.ts',{'next/server':responseMock,'next-auth':{getServerSession:async()=>user?{user}:null},'@/lib/auth':{authOptions:{}},'@/lib/tenant':{requireCurrentOrganization:async()=>({id:'resolved-tenant',slug:'example',customDomain:null})},'@/lib/authz':{requirePermission:async()=>({id:'owner'}),authzErrorResponse:()=>new Response(null,{status:403})},'@/lib/prisma':{prisma:{}},...extra})}
const request=body=>new Request('http://localhost:3000/api/usage',{method:'POST',headers:{origin:'http://localhost:3000'},body:JSON.stringify(body)});
test('anonymous and revoked sessions cannot record usage',async()=>{for(const user of [null,{id:'u1',revoked:true}])assert.equal((await api(user).POST(request({feature:'inventory'}))).status,401)});
test('support-view activity is excluded before any tenant or record access',async()=>{const r=await api({id:'admin',role:'platform_admin'},{'@/lib/tenant':{requireCurrentOrganization:async()=>{throw Error('should not query')}}}).POST(request({feature:'inventory'}));assert.equal(r.status,204)});
test('usage permission denial prevents a record write',async()=>{let writes=0;const r=await api({id:'staff',role:'staff'},{'@/lib/authz':{requirePermission:async()=>{throw Error('denied')},authzErrorResponse:()=>new Response(null,{status:403})},'@/lib/prisma':{prisma:{$executeRawUnsafe:async()=>{writes++}}}}).POST(request({feature:'reports'}));assert.equal(r.status,403);assert.equal(writes,0)});
test('usage ignores a supplied tenant and stores no personal browsing details',async()=>{let args;const r=await api({id:'owner',role:'owner'},{'@/lib/prisma':{prisma:{$executeRawUnsafe:async(...a)=>{args=a}}}}).POST(request({feature:'orders',organizationId:'other-tenant',url:'private',customer:'PRIVATE'}));assert.equal(r.status,204);assert.equal(args[1],'resolved-tenant');assert.equal(args[2],'orders');assert.equal(args.length,3);assert.match(args[0],/DO NOTHING/)});
test('unsupported feature names do not reach storage',async()=>{assert.equal((await api({id:'owner',role:'owner'}).POST(request({feature:'customer-secret'}))).status,400)});
