const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {createRequire}=require('node:module');
const ts=require('typescript');
const root=path.resolve(__dirname,'..');
function load(file,mocks={}){
 const filename=path.join(root,file),mod={exports:{}};
 const code=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
 const native=createRequire(filename),req=name=>Object.hasOwn(mocks,name)?mocks[name]:name.startsWith('@/')?load(name.slice(2)+'.ts',mocks):native(name);
 vm.runInThisContext('(function(require,module,exports){'+code+'\n})',{filename})(req,mod,mod.exports);return mod.exports;
}
const rules=load('lib/catalogSelection.ts');
test('blank catalog inputs remain unspecified, not suggested values',()=>{
 assert.equal(rules.parseCatalogInput('','price'),undefined);assert.equal(rules.parseCatalogInput('  ','quantity'),undefined);
 assert.equal(rules.parseCatalogInput('0','quantity'),0);assert.equal(rules.parseCatalogInput('17.50','price'),17.5);
});
test('fractional, malformed and negative stock is rejected',()=>{
 for(const value of ['-1','1.5','5x','1e3','2147483648','Infinity'])assert.throws(()=>rules.parseCatalogInput(value,'quantity'));
 for(const value of ['-1','abc','1.005','NaN'])assert.throws(()=>rules.parseCatalogInput(value,'price'));
});
test('catalog batch bounds do not silently drop selections',()=>{
 assert.equal(rules.validCatalogChoices([]),false);assert.equal(rules.validCatalogChoices(Array.from({length:201},(_,n)=>({templateId:String(n)}))),false);
 assert.equal(rules.validCatalogChoices([{templateId:'a'},{templateId:'a'}]),false);
 assert.equal(rules.validCatalogChoices([{templateId:'a',quantity:-1}]),false);
 assert.equal(rules.validCatalogChoices([{templateId:'a',price:Infinity}]),false);
 assert.equal(rules.validCatalogChoices([{templateId:'a',quantity:0,price:0}]),true);
});
const responseMock={NextResponse:{json:(body,init)=>new Response(JSON.stringify(body),{...init,headers:{'Content-Type':'application/json'}})}};
function fixture(existing=false){
 const writes=[],audits=[];const template={id:'template-a',name:'White Rental Chair',categoryKey:'chairs',type:'rental',description:'Stored template description',imageUrl:'/logo.png'};
 const db={catalogTemplate:{findMany:async()=>[template]},category:{findMany:async()=>existing?[{id:'existing-category',name:'Chairs',picture:'/keep-my-photo.png'}]:[],create:async({data})=>{writes.push(['category',data]);return {id:'new-category',...data}}},item:{findFirst:async()=>null,create:async({data})=>{writes.push(['item',data]);return{id:'new-item',...data}}}};
 const mocks={'next/server':responseMock,'@/lib/tenant':{requireCurrentOrganization:async()=>({id:'tenant-from-session'})},'@/lib/authz':{requirePermission:async(id,permission)=>{assert.equal(id,'tenant-from-session');assert.equal(permission,'inventory.manage');return{id:'actor'}}},'@/lib/audit':{logActivity:async data=>audits.push(data)},'@/lib/prisma':{prisma:db},'@/lib/catalogTemplates':{catalogCategoryLabel:()=> 'Chairs',UNLIMITED_QUANTITY_SENTINEL:999999}};
 return{writes,audits,db,mocks,handler:()=>load('app/api/catalog-templates/add/route.ts',mocks)};
}
const request=body=>new Request('http://localhost/api/catalog-templates/add',{method:'POST',body:JSON.stringify(body)});
test('copy includes photo/description but never a guessed price, stock, or public item',async()=>{
 const f=fixture();const response=await f.handler().POST(request({organizationId:'wrong-tenant',selections:[{templateId:'template-a'}]}));
 assert.equal(response.status,200);
 const item=f.writes.find(([type])=>type==='item')[1];
 assert.equal(item.picture,'/logo.png');assert.equal(item.description,'Stored template description');assert.equal(item.organizationId,'tenant-from-session');
 assert.equal(item.quantity,0);assert.equal(item.cost,0);assert.equal(item.displayToCustomer,false);assert.equal(item.sourceTemplateId,'template-a');
 assert.equal(f.writes.find(([type])=>type==='category')[1].picture,'/logo.png');assert.equal(f.audits[0].performedBy,'actor');
});
test('existing category branding is preserved and explicit stock/price is used',async()=>{
 const f=fixture(true);await f.handler().POST(request({selections:[{templateId:'template-a',quantity:5,price:17.5}]}));
 assert.equal(f.writes.length,1);assert.equal(f.writes[0][1].quantity,5);assert.equal(f.writes[0][1].cost,17.5);assert.equal(f.writes[0][1].categoryId,'existing-category');
});
test('existing inventory is skipped rather than overwritten',async()=>{
 const f=fixture();f.db.item.findFirst=async()=>({id:'owned-item'});
 const data=await(await f.handler().POST(request({selections:[{templateId:'template-a'}]}))).json();
 assert.equal(f.writes.length,0);assert.equal(data.created.length,0);assert.equal(data.skipped[0].reason,'Already in your inventory');
});
test('invalid catalog input is rejected before any inventory write',async()=>{
 const f=fixture();const response=await f.handler().POST(request({selections:[{templateId:'template-a',quantity:2.2}]}));
 assert.equal(response.status,400);assert.equal(f.writes.length,0);
});
test('catalog permission denial prevents reads or writes',async()=>{
 const f=fixture();f.mocks['@/lib/authz']={requirePermission:async()=>{throw Error('DENIED')},authzErrorResponse:()=>new Response(null,{status:403})};
 assert.equal((await f.handler().POST(request({selections:[{templateId:'template-a'}]}))).status,403);assert.equal(f.writes.length,0);
});
