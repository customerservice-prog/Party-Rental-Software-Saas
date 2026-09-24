const assert=require('node:assert/strict');
const {test}=require('node:test');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');

function read(p){return fs.readFileSync(path.join(root,p),'utf8');}

test('tenant non-home pages inherit the Friendly admin surface',()=>{
 const nav=read('app/dashboard/DashboardNav.tsx');
 assert.ok(nav.includes('tenant-friendly-surface'));
});

test('core tenant admin pages use the shared Friendly admin system',()=>{
 const pages=[
  'app/dashboard/orders/page.tsx',
  'app/dashboard/customers/page.tsx',
  'app/dashboard/inventory/page.tsx',
  'app/dashboard/deliveries/page.tsx',
  'app/dashboard/do-not-rent/page.tsx',
  'app/dashboard/analytics/page.tsx',
  'app/dashboard/reports/page.tsx',
  'app/dashboard/marketing/page.tsx',
  'app/dashboard/settings/page.tsx'
 ];
 for(const page of pages){
  const source=read(page);
  assert.ok(/friendly-admin|friendly-legacy/.test(source),page+' is not using the Friendly admin system');
 }
});

test('Friendly tenant admin palette is centralized in tenant css',()=>{
 const css=read('app/dashboard/tenant.css');
 assert.ok(css.includes('.friendly-admin-page'));
 assert.ok(css.includes('.friendly-admin-card'));
 assert.ok(css.includes('.friendly-admin-table'));
 assert.ok(css.includes('#2d6a2d'));
 assert.ok(css.includes('#1a6fd4'));
});
