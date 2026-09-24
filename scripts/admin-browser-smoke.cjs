// Runs only against an ephemeral CI database and local application.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {PrismaClient}=require('@prisma/client');
const bcrypt=require('bcryptjs');
const {chromium}=require('playwright');
if(process.env.CI!=='true'||process.env.DATABASE_URL!=='postgresql://test:test@localhost:5432/test'||process.env.NEXTAUTH_URL!=='http://localhost:3000')throw Error('Browser fixtures are restricted to the isolated CI database.');
if(process.env.STRIPE_SECRET_KEY)throw Error('Provider credentials must not be present during browser tests.');
const db=new PrismaClient(),report={environment:'Isolated CI fixtures — not production customers',checks:[],errors:[]};
async function main(){
 fs.mkdirSync('test-results',{recursive:true});
 const password=await bcrypt.hash('fixture-owner-password',12);
 let tenant;
 for(let n=1;n<=27;n++){
  const org=await db.organization.create({data:{name:`CI DEMO Rental ${String(n).padStart(2,'0')}`,slug:`ci-demo-${n}`,status:'active',planTier:'growth',autoConfirmationEnabled:false,autoReminderEnabled:false,autoBalanceReminderEnabled:false,users:{create:{username:`ci-owner-${n}`,name:`CI Demo Owner ${n}`,role:'owner',password}},subscription:{create:{planTier:'growth',status:n===1?'active':'trialing',billingInterval:'monthly'}}}});
  if(n===1)tenant=org;
 }
 const phase4Category=await db.category.create({data:{organizationId:tenant.id,name:'CI Phase 4 Inventory',slug:'ci-phase-4-inventory',description:'Browser QA fixture for dedicated inventory workspaces'}});
 await db.item.create({data:{organizationId:tenant.id,categoryId:phase4Category.id,name:'CI Phase 4 Tent',slug:'ci-phase-4-tent',description:'Browser QA fixture',cost:250,quantity:4,displayToCustomer:true}});
 report.checks.push('Created isolated Phase 4 category and item browser fixture only for CI Demo Rental 01');
 const browser=await chromium.launch({headless:true});
 try{
  const anonymous=await browser.newContext();const anon=await anonymous.newPage();
  await anon.goto('http://localhost:3000/admin');await anon.waitForURL('**/platform-login');
  report.checks.push('Unauthenticated admin navigation redirects to platform login');
  const dashboardResponse=await anon.goto('http://localhost:3000/dashboard');
  await anon.waitForURL('**/login');
  assert.ok(dashboardResponse.status()<500,`Anonymous dashboard returned ${dashboardResponse.status()}`);
  report.checks.push('Unauthenticated tenant dashboard redirects to tenant login without a server error');await anonymous.close();
  for(const viewport of [{name:'desktop',width:1440,height:1000},{name:'mobile',width:390,height:844}]){
   const context=await browser.newContext({viewport:{width:viewport.width,height:viewport.height}}),page=await context.newPage();
   page.on('pageerror',error=>report.errors.push(`${viewport.name}: ${error.message}`));
   page.on('response',response=>{if(response.url().startsWith('http://localhost:3000')&&response.status()>=500)report.errors.push(`${viewport.name}: HTTP ${response.status()} ${response.url()}`)});
   await page.goto('http://localhost:3000/platform-login');
   await page.getByPlaceholder('Platform admin username').fill(process.env.PLATFORM_ADMIN_USERNAME);
   await page.locator('input[type=password]').fill(process.env.PLATFORM_ADMIN_PASSWORD);
   await page.getByRole('button',{name:'Enter Platform Control Center'}).click();
   await page.waitForURL('**/admin',{timeout:30000});report.checks.push(`${viewport.name}: actual platform sign-in`);
   const paths=['/admin','/admin/organizations','/admin/users','/admin/billing','/admin/onboarding','/admin/integrations','/admin/health','/admin/analytics','/admin/alerts','/admin/communications','/admin/feature-flags','/admin/catalog-templates','/admin/security','/admin/data','/admin/settings','/admin/audit-log',`/admin/organizations/${tenant.id}`,`/admin/organizations/${tenant.id}/support`,`/admin/billing/${tenant.id}`];
   const redesigned=['/admin','/admin/users','/admin/billing','/admin/onboarding','/admin/integrations','/admin/health'];
   for(const route of paths){
    const response=await page.goto('http://localhost:3000'+route);assert.ok(response.status()<400,`${route}: ${response.status()}`);
    await page.locator('h1').first().waitFor();await page.waitForTimeout(400);
    assert.ok(!page.url().includes('platform-login'),`Unexpected sign-out on ${route}`);
    if(redesigned.includes(route)){
     const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);
     assert.equal(overflow,false,`${viewport.name} document overflow on ${route}`);
     await page.screenshot({path:`test-results/${viewport.name}-${route.replaceAll('/','-')}.png`,fullPage:true});
    }
    report.checks.push(`${viewport.name}: rendered ${route}`);
   }
   await page.goto('http://localhost:3000/admin/users?q=CI+Demo+Owner+1');
   assert.ok(await page.getByRole('heading',{name:'CI Demo Owner 1',exact:true}).isVisible());
   await page.goto('http://localhost:3000/admin/integrations?page=2');
   assert.match(await page.getByRole('navigation',{name:'Pagination'}).innerText(),/page 2 of 2/);
   await page.getByRole('button',{name:'Check providers',exact:true}).first().click();
   await page.getByText('No connected account saved.',{exact:true}).waitFor();
   report.checks.push(`${viewport.name}: tenant search, page 2, provider check with no credentials`);
   await page.goto(`http://localhost:3000/admin/billing/${tenant.id}`);
   await page.getByRole('button',{name:'Read subscription & invoices from Stripe'}).click();
   await page.getByRole('alert').filter({hasText:'No Stripe subscription is linked'}).waitFor();
   report.checks.push(`${viewport.name}: unlinked billing is not presented as paid`);
   if(viewport.name==='mobile'){
    await page.locator('summary').filter({hasText:'Open menu'}).click();
    await page.getByRole('navigation',{name:'Mobile platform navigation'}).getByRole('link',{name:'Tenant users',exact:true}).click();
    await page.waitForURL('**/admin/users');assert.equal(await page.locator('header details').getAttribute('open'),null);
    report.checks.push('Mobile menu navigates and closes on route change');
   }
   await page.goto(`http://localhost:3000/admin/organizations/${tenant.id}`);
   await page.getByRole('button',{name:'View as tenant',exact:true}).click();
   await page.waitForURL('**/dashboard',{timeout:30000});
   await page.getByRole('region',{name:'Tenant impersonation'}).waitFor();
   assert.match(await page.getByRole('region',{name:'Tenant impersonation'}).innerText(),/CI Demo Owner 1/);
   await page.screenshot({path:`test-results/${viewport.name}-tenant-support.png`,fullPage:true});
   await page.getByRole('button',{name:'Exit tenant view'}).click();await page.waitForURL(`**/admin/organizations/${tenant.id}/support`);
   report.checks.push(`${viewport.name}: tenant owner impersonation banner and exit`);
   await context.close();
  }
  assert.deepEqual(report.errors,[],'Browser/runtime errors found');
  assert.equal(await db.sentMessage.count(),0,'Browser checks must not send or queue customer messages');
  report.checks.push('No customer message records created');
 }finally{await browser.close()}
}
main().catch(error=>{report.errors.push(error.stack);process.exitCode=1}).finally(async()=>{fs.mkdirSync('test-results',{recursive:true});fs.writeFileSync('test-results/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await db.$disconnect()});
