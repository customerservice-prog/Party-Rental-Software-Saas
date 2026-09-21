const assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto'),path=require('node:path');
const {PrismaClient}=require('@prisma/client'),{chromium}=require('playwright');
if(process.env.CI!=='true'||process.env.DATABASE_URL!=='postgresql://test:test@localhost:5432/test'||process.env.STRIPE_SECRET_KEY)throw Error('Disposable CI database only.');
const db=new PrismaClient(),out='test-results/observability',report={environment:'Local test tenants only; no payment or messaging provider configured',checks:[],errors:[]};fs.mkdirSync(out,{recursive:true});
async function main(){
 const manifest=require('../lib/catalogPhotoManifest.json');assert.equal(manifest.items.length,15);assert.equal(manifest.unavailable.length,0);
 for(const item of manifest.items){const file=path.join(__dirname,'../public',item.imageUrl);assert.equal(crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),item.assetSha256);const stored=await db.catalogTemplate.findUniqueOrThrow({where:{slug:item.slug}});assert.equal(stored.imageUrl,item.imageUrl);assert.equal(stored.description,item.description);}
 report.checks.push('All 15 reviewed photo files match their manifest hashes and initialized templates');
 const first=await db.catalogTemplate.findUniqueOrThrow({where:{slug:manifest.items[0].slug}});
 await db.catalogTemplate.update({where:{id:first.id},data:{imageUrl:'/custom-photo.jpg',description:'Keep administrator custom description',suggestedPrice:123}});
 const inventoryBefore=await db.item.count();await require('./apply-catalog-media.cjs').apply(db);
 const preserved=await db.catalogTemplate.findUniqueOrThrow({where:{id:first.id}});assert.equal(preserved.imageUrl,'/custom-photo.jpg');assert.equal(preserved.description,'Keep administrator custom description');assert.equal(preserved.suggestedPrice,123);assert.equal(await db.item.count(),inventoryBefore);
 await db.catalogTemplate.update({where:{id:first.id},data:{imageUrl:first.imageUrl,description:first.description,suggestedPrice:first.suggestedPrice}});
 report.checks.push('Media reinitialization preserves customized global content and does not create tenant inventory');
 assert.equal((await db.$queryRawUnsafe('SELECT count(*)::int AS n FROM "PlatformFeatureUsage"'))[0].n,0,'Prior support-view tests must not record customer usage');
 const browser=await chromium.launch();try{
  const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
  await page.goto('http://localhost:3000/login?business=ci-demo-27');await page.getByPlaceholder('yourbusiness').fill('ci-demo-27');await page.getByLabel('Username',{exact:true}).fill('ci-owner-27');await page.getByLabel('Password',{exact:true}).fill('fixture-owner-password');await page.getByRole('button',{name:'Sign in to my business'}).click();await page.waitForURL('**/dashboard');
  const event=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/usage'&&r.request().method()==='POST');await page.goto('http://localhost:3000/dashboard/inventory');assert.equal((await event).status(),204);
  const tenant=await db.organization.findUniqueOrThrow({where:{slug:'ci-demo-27'}});
  const count=async()=> (await db.$queryRawUnsafe('SELECT count(*)::int AS n FROM "PlatformFeatureUsage" WHERE "organizationId"=$1 AND feature=$2',tenant.id,'inventory'))[0].n;
  assert.equal(await count(),1);await context.request.post('http://localhost:3000/api/usage',{data:{feature:'inventory',organizationId:'other-tenant'}});assert.equal(await count(),1);
  report.checks.push('Actual tenant login records one authorized feature-day and repeated requests remain deduplicated');
  await page.getByRole('button',{name:'Add from catalog',exact:true}).click();const modal=page.getByRole('dialog',{name:'Find your first rentals. Or your next ones.'});await modal.waitFor();await modal.getByRole('img',{name:'White Plastic Folding Chair template photo'}).waitFor();await page.waitForFunction(()=>Array.from(document.querySelectorAll('dialog img')).some(i=>i.complete&&i.naturalWidth>0));await page.screenshot({path:out+'/tenant-real-photo-library-phone.png',fullPage:true});await page.keyboard.press('Escape');
  await context.close();
  const admin=await browser.newContext({viewport:{width:390,height:844}}),p=await admin.newPage();p.on('pageerror',e=>report.errors.push(e.message));
  await p.goto('http://localhost:3000/platform-login');await p.getByPlaceholder('Platform admin username').fill(process.env.PLATFORM_ADMIN_USERNAME);await p.locator('input[type=password]').fill(process.env.PLATFORM_ADMIN_PASSWORD);await p.getByRole('button',{name:'Enter Platform Control Center'}).click();await p.waitForURL('**/admin');
  for(const route of ['/admin/insights','/admin/catalog-readiness']){await p.goto('http://localhost:3000'+route);await p.locator('h1').waitFor();await p.waitForTimeout(300);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);await p.screenshot({path:out+'/'+route.split('/').at(-1)+'-phone.png',fullPage:true});report.checks.push(route+' renders at phone width with real initialized photo/usage fixtures');}
  await p.goto('http://localhost:3000/admin/catalog-readiness?status=ready');const link=p.getByRole('link',{name:'Edit template',exact:true}).first();const href=await link.getAttribute('href');const expected=new URL(href,'http://localhost:3000').searchParams.get('q');await link.click();await p.waitForURL('**/admin/catalog-templates?**');await p.waitForFunction(value=>Array.from(document.querySelectorAll('input')).some(i=>i.value===value),expected);report.checks.push('Readiness edit link opens the matching filtered global catalog editor');
  await admin.close();assert.equal(await db.sentMessage.count(),0);assert.deepEqual(report.errors,[]);
 }finally{await browser.close()}
}
main().catch(e=>{report.errors.push(e.stack);process.exitCode=1}).finally(async()=>{fs.writeFileSync(out+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await db.$disconnect()});
