// Full catalog interactions on disposable CI tenants only. No production data.
const assert=require('node:assert/strict'),fs=require('node:fs');
const {PrismaClient}=require('@prisma/client');const {chromium}=require('playwright');
if(process.env.CI!=='true'||process.env.DATABASE_URL!=='postgresql://test:test@localhost:5432/test'||process.env.NEXTAUTH_URL!=='http://localhost:3000'||process.env.STRIPE_SECRET_KEY)throw Error('Catalog fixtures are restricted to local, provider-free CI.');
const db=new PrismaClient(),out='test-results/catalog',report={environment:'Disposable local CI tenants; logo is an explicitly synthetic test photo',checks:[],errors:[]};fs.mkdirSync(out,{recursive:true});
async function main(){
 for(const row of [{slug:'qa-photo-chair',name:'CI Catalog Chair',categoryKey:'chairs',imageUrl:'/logo.png',description:'CI chair description copied from the global template.'},{slug:'qa-photo-table',name:'CI Catalog Table',categoryKey:'tables',imageUrl:'/logo.png',description:'CI table description copied from the global template.'},{slug:'qa-no-photo',name:'CI Catalog Without Photo',categoryKey:'chairs',imageUrl:null,description:null}])await db.catalogTemplate.upsert({where:{slug:row.slug},create:row,update:row});
 const browser=await chromium.launch();
 try{
  for(const [index,viewport] of [{width:1440,height:1000},{width:768,height:1024},{width:360,height:800}].entries()){
   const org=await db.organization.findUniqueOrThrow({where:{slug:`ci-demo-${27-index}`}});
   const context=await browser.newContext({viewport,reducedMotion:'reduce'}),page=await context.newPage();
   page.on('pageerror',e=>report.errors.push(e.message));
   page.on('response',r=>{if(r.url().startsWith('http://localhost:3000')&&r.status()>=500)report.errors.push(`HTTP ${r.status()} ${r.url()}`)});
   await page.goto('http://localhost:3000/platform-login');await page.getByPlaceholder('Platform admin username').fill(process.env.PLATFORM_ADMIN_USERNAME);await page.locator('input[type=password]').fill(process.env.PLATFORM_ADMIN_PASSWORD);await page.getByRole('button',{name:'Enter Platform Control Center'}).click();await page.waitForURL('**/admin');
   await page.goto(`http://localhost:3000/admin/organizations/${org.id}`);await page.getByRole('button',{name:'View as tenant',exact:true}).click();await page.waitForURL('**/dashboard');
   await page.goto('http://localhost:3000/dashboard/inventory');await page.getByRole('button',{name:'Add from catalog',exact:true}).click();
   const modal=page.getByRole('dialog',{name:'Find your first rentals. Or your next ones.'});await modal.waitFor();
   await modal.getByRole('searchbox').fill('CI Catalog');
   await modal.getByLabel('Rental category',{exact:true}).selectOption('chairs');
   await modal.getByRole('checkbox',{name:'Select CI Catalog Chair',exact:true}).check();
   const photo=modal.getByRole('img',{name:'CI Catalog Chair template photo'});await photo.waitFor();
   await page.waitForFunction(()=>Array.from(document.querySelectorAll('dialog img')).some(i=>i.complete&&i.naturalWidth>0));
   assert.ok(await modal.getByText('Add your own photo',{exact:true}).isVisible());
   await page.screenshot({path:`${out}/${viewport.width}-photo-library.png`,fullPage:true});
   await modal.getByLabel('Rental category',{exact:true}).selectOption('tables');
   await modal.getByRole('checkbox',{name:'Select CI Catalog Table',exact:true}).check();
   await modal.getByRole('button',{name:'Configure 2 items',exact:true}).click();
   const configure=page.getByRole('dialog',{name:'Make these rentals yours.'});await configure.waitFor();
   assert.ok(await configure.getByRole('heading',{name:'CI Catalog Chair',exact:true}).isVisible());
   assert.ok(await configure.getByRole('heading',{name:'CI Catalog Table',exact:true}).isVisible());
   await configure.getByLabel('Quantity you own for CI Catalog Chair',{exact:true}).fill('5');await configure.getByLabel('Your rental price for CI Catalog Chair',{exact:true}).fill('17.50');
   await page.screenshot({path:`${out}/${viewport.width}-review-items.png`,fullPage:true});
   const dimensions=await configure.evaluate(el=>({width:el.clientWidth,content:el.scrollWidth}));assert.ok(dimensions.content<=dimensions.width+1,'Catalog dialog horizontal overflow');
   await configure.getByRole('button',{name:'Add 2 items',exact:true}).click();await configure.waitFor({state:'hidden'});
   await page.getByRole('status').filter({hasText:'2 item(s) added.'}).waitFor();
   const copied=await db.item.findMany({where:{organizationId:org.id,name:{startsWith:'CI Catalog'}},orderBy:{name:'asc'}});
   assert.equal(copied.length,2);assert.equal(copied[0].quantity,5);assert.equal(copied[0].cost,17.5);assert.equal(copied[1].quantity,0);assert.equal(copied[1].cost,0);
   assert.ok(copied.every(i=>i.picture==='/logo.png'&&i.description.includes('copied')&&i.displayToCustomer===false));
   const table=page.locator('table[data-inventory-cards]').first();await table.waitFor();
   if(viewport.width<640){const dimensions=await table.evaluate(el=>({width:el.clientWidth,content:el.scrollWidth}));assert.ok(dimensions.content<=dimensions.width+1,'Populated mobile inventory overflows');assert.ok(await table.locator('td[data-label="Actions"]').count());}
   assert.ok(await page.getByRole('img',{name:'CI Catalog Chair',exact:true}).isVisible());
   await page.screenshot({path:`${out}/${viewport.width}-populated-inventory.png`,fullPage:true});
   await table.getByRole('button',{name:'Edit',exact:true}).click();await page.getByPlaceholder('Name',{exact:true}).waitFor();
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);assert.equal(overflow,false,'Inventory editing page overflows');
   await page.screenshot({path:`${out}/${viewport.width}-edit-item.png`,fullPage:true});
   await page.getByRole('button',{name:'Cancel',exact:true}).click();
   await page.getByRole('button',{name:'Add from catalog',exact:true}).click();await page.getByRole('dialog',{name:'Find your first rentals. Or your next ones.'}).waitFor();await page.keyboard.press('Escape');
   assert.equal(await page.getByRole('dialog',{name:'Find your first rentals. Or your next ones.'}).count(),0);
   await page.getByRole('button',{name:'Exit tenant view'}).click();await page.waitForURL('**/support');
   report.checks.push(`${viewport.width}px: photo/fallback, cross-category selection, native dialog, explicit price/stock, photo/description copy, private items, populated inventory, edit/cancel, Escape and support exit passed`);
   await context.close();
  }
  assert.equal(await db.sentMessage.count(),0);assert.deepEqual(report.errors,[]);
 }finally{await browser.close();}
}
main().catch(e=>{report.errors.push(e.stack);process.exitCode=1}).finally(async()=>{fs.writeFileSync(`${out}/report.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await db.$disconnect();});
