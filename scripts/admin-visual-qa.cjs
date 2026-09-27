// Visual and interaction coverage against the local CI app only.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require('playwright');
if(process.env.CI!=='true'||process.env.DATABASE_URL!=='postgresql://test:test@localhost:5432/test'||process.env.NEXTAUTH_URL!=='http://localhost:3000')throw Error('Visual checks are restricted to the local CI environment.');
if(process.env.STRIPE_SECRET_KEY)throw Error('Live provider credentials are prohibited in visual QA.');
const report={environment:'Local CI fixtures — not production data',checks:[],errors:[]};
const out='test-results/visual';fs.mkdirSync(out,{recursive:true});
async function main(){
 const browser=await chromium.launch({headless:true});
 try{
  for(const viewport of [{name:'wide',width:1440,height:1000},{name:'tablet',width:768,height:1024},{name:'narrow',width:360,height:800}]){
   const context=await browser.newContext({viewport:{width:viewport.width,height:viewport.height},reducedMotion:'reduce'}),page=await context.newPage();
   page.on('pageerror',error=>report.errors.push(`${viewport.name}: ${error.message}`));
   page.on('response',response=>{if(response.url().startsWith('http://localhost:3000')&&response.status()>=500)report.errors.push(`${viewport.name}: HTTP ${response.status()} ${response.url()}`)});
   async function inspect(route,label){
    const target='http://localhost:3000'+route;
    const response=await page.goto(target);
    if(response)assert.ok(response.status()<400,`${route}: HTTP ${response.status()}`);
    else {
      const expected=new URL(target);
      const actual=new URL(page.url());
      assert.equal(actual.pathname,expected.pathname,`${route}: navigation did not reach expected path`);
      assert.equal(actual.hash,expected.hash,`${route}: navigation did not reach expected hash`);
    }
    await page.waitForTimeout(350);
    const overflow=await page.evaluate(()=>({width:innerWidth,document:document.documentElement.scrollWidth}));
    assert.ok(overflow.document<=overflow.width+1,`${viewport.name}: horizontal page overflow on ${route}: ${JSON.stringify(overflow)}`);
    await page.screenshot({path:`${out}/${viewport.name}-${label}.png`,fullPage:true,animations:'disabled'});
    report.checks.push(`${viewport.name}: ${route} rendered without document overflow`);
   }
   for(const [route,label] of [['/','homepage'],['/demo','tour'],['/features','features'],['/pricing','pricing'],['/signup','signup'],['/login','tenant-login']])await inspect(route,label);
   if(viewport.width<1024){
    await page.goto('http://localhost:3000/');await page.getByRole('button',{name:'Open menu',exact:true}).click();
    await page.getByRole('navigation',{name:'Mobile navigation',exact:true}).getByRole('link',{name:'Features',exact:true}).click();
    await page.waitForURL('**/features');assert.equal(await page.getByRole('button',{name:'Open menu',exact:true}).getAttribute('aria-expanded'),'false');
    report.checks.push(`${viewport.name}: public navigation opens, navigates and closes`);
   }
   await page.goto('http://localhost:3000/platform-login');
   await page.getByPlaceholder('Platform admin username').fill(process.env.PLATFORM_ADMIN_USERNAME);
   await page.locator('input[type=password]').fill(process.env.PLATFORM_ADMIN_PASSWORD);
   await page.getByRole('button',{name:'Enter Platform Control Center'}).click();await page.waitForURL('**/admin');
   const paths=['/admin','/admin/organizations','/admin/users','/admin/billing','/admin/onboarding','/admin/analytics','/admin/health','/admin/integrations','/admin/alerts','/admin/communications','/admin/catalog-templates','/admin/feature-flags','/admin/security','/admin/data','/admin/settings','/admin/audit-log'];
   for(const route of paths)await inspect(route,route.slice(1).replaceAll('/','-'));
   await page.getByRole('button',{name:'Find a tool',exact:false}).click();
   await page.getByRole('dialog',{name:'Find a platform tool'}).waitFor();
   await page.getByRole('searchbox',{name:'Search platform tools'}).fill('billing');
   await page.getByRole('navigation',{name:'Tool search results'}).getByRole('link',{name:/Billing & revenue/}).click();
   await page.waitForURL('**/admin/billing');assert.equal(await page.getByRole('dialog',{name:'Find a platform tool'}).count(),0);
   await page.getByRole('button',{name:'Find a tool',exact:false}).waitFor();await page.waitForTimeout(150);await page.keyboard.press('Control+k');await page.getByRole('dialog',{name:'Find a platform tool'}).waitFor();await page.keyboard.press('Escape');
   assert.equal(await page.getByRole('dialog',{name:'Find a platform tool'}).count(),0);
   report.checks.push(`${viewport.name}: tool search navigates; Ctrl+K and Escape work`);
   await page.goto('http://localhost:3000/admin/organizations');
   if(viewport.width<640){assert.equal(await page.locator('table').first().getAttribute('data-admin-cards'),'true');assert.ok(await page.locator('td[data-label="Organization"]').count()>0);report.checks.push(`${viewport.name}: organization table has labeled mobile cards`);}
   const phase4TenantRow=page.locator('tbody tr').filter({hasText:'CI DEMO Rental 01'}).first();
   await phase4TenantRow.getByRole('button',{name:'View as tenant',exact:true}).click();await page.waitForURL('**/dashboard');
   for(const [route,label] of [
    ['/dashboard','workspace'],
    ['/dashboard/orders','orders'],
    ['/dashboard/customers','customers'],
    ['/dashboard/inventory','inventory'],
    ['/dashboard/categories','categories'],
    ['/dashboard/inventory/new','new-item'],
    ['/dashboard/deliveries','delivery'],
    ['/dashboard/deliveries/product-status-report','product-status'],
    ['/dashboard/deliveries/product-attention-report','product-attention'],
    ['/dashboard/deliveries/print-invoices','print-invoices'],
    ['/dashboard/deliveries/print-contracts','print-contracts'],
    ['/dashboard/deliveries/truck-tracker','truck-tracker'],
    ['/dashboard/rainchecks','rainchecks'],
    ['/dashboard/scheduling','scheduling'],
    ['/dashboard/do-not-rent','do-not-rent'],
    ['/dashboard/reports','reports-library'],
    ['/dashboard/reports/overview','reports-detail'],
    ['/dashboard/analytics','analytics'],
    ['/dashboard/marketing','marketing'],
    ['/dashboard/website','website-builder'],
    ['/dashboard/settings','settings-hub'],
    ['/dashboard/settings/business','settings-business'],
    ['/dashboard/settings/business#company-info','settings-company-info'],
    ['/dashboard/settings/business#order-pricing','settings-order-pricing'],
    ['/dashboard/settings/business#closed-dates','settings-closed-dates'],
    ['/dashboard/settings/google-integration','settings-google-integration-gap'],
    ['/dashboard/settings/navigation-editor','settings-navigation-editor'],
   ])await inspect(route,'tenant-'+label);
   await page.goto('http://localhost:3000/dashboard');
   const populatedDay=page.getByRole('button',{name:/Open orders for/}).filter({has:page.locator('text=1 delivery')}).first();
   if(await populatedDay.count()){
     await populatedDay.click();
     await page.getByRole('heading',{name:/Orders for/}).waitFor();
     await page.screenshot({path:`${out}/${viewport.name}-tenant-home-day-orders.png`,fullPage:true,animations:'disabled'});
     assert.ok(await page.getByRole('link',{name:'CI Visual Customer',exact:true}).isVisible());
     await page.getByRole('button',{name:'Close day orders'}).click();
   }
   await page.goto('http://localhost:3000/dashboard/inventory');
   const itemLink=page.getByRole('link',{name:'CI Phase 4 Tent',exact:true});
   await itemLink.waitFor();
   const itemHref=await itemLink.getAttribute('href');
   assert.ok(itemHref&&itemHref.startsWith('/dashboard/inventory/'),'Dedicated item workspace link is missing');
   await inspect(itemHref,'tenant-item-workspace');
   await page.goto('http://localhost:3000/dashboard/customers');
   const customerHref=await page.getByRole('link',{name:'CI Visual Customer',exact:true}).getAttribute('href');
   assert.ok(customerHref&&customerHref.startsWith('/dashboard/customers/'),'Customer detail link is missing');
   await inspect(customerHref,'tenant-customer-detail');
   await page.goto('http://localhost:3000/dashboard/orders');
   const orderHref=await page.getByRole('link',{name:'CI-ORDER-1001',exact:true}).getAttribute('href');
   assert.ok(orderHref&&orderHref.startsWith('/dashboard/orders/'),'Order detail link is missing');
   await inspect(orderHref,'tenant-order-detail');
   report.checks.push(viewport.name+': Friendly parity tenant routes and populated detail screens rendered');
   await page.getByRole('region',{name:'Tenant impersonation'}).waitFor();await page.getByRole('button',{name:'Exit tenant view'}).click();await page.waitForURL('**/support');
   report.checks.push(`${viewport.name}: tenant workspace, core directories and support exit`);
   await context.close();
  }
  assert.deepEqual(report.errors,[],'Browser runtime errors were recorded');
 }finally{await browser.close()}
}
main().catch(error=>{report.errors.push(error.stack);process.exitCode=1}).finally(()=>{fs.writeFileSync(`${out}/report.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));});
