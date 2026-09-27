const assert=require('node:assert/strict');
const {test}=require('node:test');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('dashboard parity adds Friendly all-tools hub and independent calendar job filter',()=>{
  const home=read('app/dashboard/page.tsx');
  const tools=read('app/dashboard/HomeTools.tsx');
  const calendar=read('app/dashboard/HomeCalendar.tsx');
  assert.match(home,/HomeTools/);
  assert.match(tools,/>All tools</);
  for(const href of ['/dashboard/orders/new','/dashboard/deliveries','/dashboard/dispatch','/dashboard/returns','/dashboard/settings']) assert.ok(tools.includes(href));
  assert.match(calendar,/Calendar job type/);
  assert.match(calendar,/Delivery \/ drop-off/);
  assert.match(calendar,/Customer pickup/);
});

test('scheduling has independent Friendly-style job filter',()=>{
  const source=read('app/dashboard/scheduling/SchedulingCalendar.tsx');
  assert.match(source,/type JobFilter="all"\|"delivery"\|"pickup"/);
  assert.match(source,/>Job type/);
  assert.match(source,/jobFilter==="pickup"/);
});

test('delivery surfaces existing dispatch route state and preserves selected day handoff',()=>{
  const delivery=read('app/dashboard/deliveries/page.tsx');
  const dispatch=read('app/dashboard/dispatch/page.tsx');
  assert.match(delivery,/driverRunStops/);
  assert.match(delivery,/Route status:/);
  assert.match(delivery,/\/dashboard\/dispatch\?date=/);
  assert.match(dispatch,/useSearchParams/);
  assert.match(dispatch,/searchParams\.get\("date"\)/);
});

test('customer workspace is directly editable through secured customer API',()=>{
  const page=read('app/dashboard/customers/[id]/page.tsx');
  const editor=read('app/dashboard/customers/CustomerProfileEditor.tsx');
  const api=read('app/api/customers/[id]/route.ts');
  assert.match(page,/CustomerProfileEditor/);
  assert.match(editor,/>Edit Customer</);
  assert.match(editor,/method:"PATCH"/);
  assert.match(api,/customers\.manage/);
});

test('new order supports searchable customers and structured new-customer address persistence',()=>{
  const page=read('app/dashboard/orders/new/page.tsx');
  const api=read('app/api/orders/route.ts');
  assert.match(page,/Search by name, email, or phone/);
  assert.match(page,/Billing \/ customer address/);
  assert.match(page,/selectedCustomer/);
  for(const field of ['address','city','state','zip']) assert.ok(api.includes(field+':'+field+'||null')||api.includes('address:address||deliveryAddress||null'));
});

test('categories support direct image upload and show stored slug',()=>{
  const source=read('app/dashboard/categories/page.tsx');
  assert.match(source,/readCategoryImage/);
  assert.match(source,/accept="image\/\*"/);
  assert.match(source,/category\.slug/);
});


test('order workspace now exposes safe Friendly-style schedule and item editing',()=>{
  const page=read('app/dashboard/orders/[id]/page.tsx');
  const schedule=read('app/dashboard/orders/[id]/OrderScheduleEditor.tsx');
  const items=read('app/dashboard/orders/[id]/OrderItemsEditor.tsx');
  const orderApi=read('app/api/orders/[id]/route.ts');
  const itemApi=read('app/api/orders/[id]/items/route.ts');
  assert.match(page,/OrderScheduleEditor/);
  assert.match(page,/OrderItemsEditor/);
  assert.match(schedule,/>Edit Schedule</);
  assert.match(items,/Edit Items/);
  assert.match(orderApi,/pg_advisory_xact_lock/);
  assert.match(orderApi,/excludeOrderId|order\.id/);
  assert.match(itemApi,/RentalFulfillment/);
  assert.match(itemApi,/fulfillment has already started/);
  assert.match(itemApi,/pg_advisory_xact_lock/);
  assert.match(itemApi,/preservedDiscount/);
  assert.match(itemApi,/historicalTaxRate/);
  assert.match(itemApi,/PAID_TOTAL/);
});

test('order payment UI labels CRM-only refunds honestly',()=>{
  const source=read('app/dashboard/orders/[id]/OrderPayments.tsx');
  assert.match(source,/Manual refund \/ credit entry/);
  assert.match(source,/does not automatically send money through Stripe/);
});


test('Do Not Rent matches Friendly customer lookup, status filtering, and blocked-attempt metrics',()=>{
  const page=read('app/dashboard/do-not-rent/page.tsx');
  const api=read('app/api/do-not-rent/route.ts');
  const customers=read('app/api/customers/route.ts');
  assert.match(page,/Search existing customer/);
  assert.match(page,/Reason category/);
  assert.match(page,/Blocked Attempts \(30d\)/);
  assert.match(page,/statusFilter/);
  assert.match(api,/recentBlockedAttempts/);
  assert.match(api,/restrictedAddressCount/);
  assert.match(customers,/searchParams\.get\("q"\)|new URL\(request\.url\)\.searchParams\.get\("q"\)/);
});

test('driver roster supports Friendly-style inline edits without revealing saved PINs',()=>{
  const page=read('app/dashboard/drivers/page.tsx');
  const api=read('app/api/drivers/route.ts');
  assert.match(page,/Open Driver App/);
  assert.match(page,/New PIN for/);
  assert.match(page,/Saved · enter new/);
  assert.match(api,/hasPin:Boolean\(pin\)/);
  assert.match(api,/\.\.\.driver,hasPin/);
});


test('Settings hub mirrors Friendly by linking only implemented settings',()=>{
  const settings=read('app/dashboard/settings/page.tsx');
  const dynamic=read('app/dashboard/settings/[section]/page.tsx');
  assert.match(settings,/disabledSettingLabels/);
  assert.match(settings,/item\.href&&!disabledSettingLabels\.has\(item\.label\)/);
  assert.match(settings,/Not available in this tenant CRM yet/);
  for(const slug of ['google-integration','quickbooks-online','service-areas','general-documents','sorting','auto-charge','availability-rule-sets','gallery']) assert.ok(settings.includes('/dashboard/settings/'+slug));
  for(const supported of ['/dashboard/settings/business#company-info','/dashboard/automations','/dashboard/categories','/dashboard/inventory','/dashboard/pages','/dashboard/website']) assert.ok(settings.includes(supported));
  assert.match(settings,/Party Rental CRM Account/);
  assert.match(dynamic,/Not supported in this tenant CRM yet/);
});


test('Delivery uses a real dedicated truck tracker instead of relabeling Dispatch',()=>{
  const delivery=read('app/dashboard/deliveries/page.tsx');
  const tracker=read('app/dashboard/deliveries/truck-tracker/page.tsx');
  assert.match(delivery,/\/dashboard\/deliveries\/truck-tracker/);
  assert.doesNotMatch(delivery,/href="\/dashboard\/dispatch" className="friendly-admin-secondary">Truck \/ Route Tracker/);
  assert.match(tracker,/Truck \/ Route Tracker/);
  assert.match(tracker,/Driver runs/);
  assert.match(tracker,/Assigned stops/);
  assert.match(tracker,/Unassigned orders/);
  assert.match(tracker,/driverRun/);
  assert.match(tracker,/Fulfillment/);
});


test('Rainchecks is a real tenant workspace backed by StoreCredit rain_check rows',()=>{
  const page=read('app/dashboard/rainchecks/page.tsx');
  const api=read('app/api/store-credits/route.ts');
  const nav=read('app/dashboard/DashboardNav.tsx');
  const tools=read('app/dashboard/HomeTools.tsx');
  const reports=read('app/dashboard/reports/page.tsx');
  assert.match(page,/StoreCredit/);
  assert.match(page,/rain_check/);
  assert.match(page,/Active value/);
  assert.match(page,/Apply \/ Manage/);
  assert.match(api,/const type=b\.type==="rain_check"/);
  assert.match(nav,/item\("\/rainchecks","Rainchecks","wallet"\)/);
  for(const source of [tools,reports]) assert.match(source,/\/dashboard\/rainchecks/);
});


test('Marketing uses Friendly-style module destinations without fabricating campaign features',()=>{
  const page=read('app/dashboard/marketing/page.tsx');
  const routes=read('app/dashboard/marketing/[section]/page.tsx');
  for(const slug of ['campaigns','audiences','automations','performance','history','scheduler','calendar','settings']) assert.ok(page.includes('/dashboard/marketing/'+slug));
  assert.match(routes,/campaigns-builder/);
  assert.match(routes,/campaigns-gallery/);
  assert.match(routes,/does not fabricate campaign data/);
  for(const target of ['/dashboard/message-templates','/dashboard/customers','/dashboard/automations','/dashboard/analytics','/dashboard/messages','/dashboard/automations/schedule']) assert.ok(routes.includes(target));
});


test('Friendly-style navigation mirrors the ten-tab admin bar and leaves extra tools in the Home tools hub',()=>{
  const nav=read('app/dashboard/DashboardNav.tsx');
  const tools=read('app/dashboard/HomeTools.tsx');
  assert.doesNotMatch(nav,/tenant-parity-more/);
  assert.doesNotMatch(nav,/>More</);
  assert.doesNotMatch(nav,/visibleGroups\.map\(group/);
  for(const label of ['Home','Edit Website','Admin','Scheduling','Customers','Do Not Rent','Delivery','Reports','Analytics','Marketing']) assert.ok(nav.includes(',"'+label+'",'),label+' should remain in the Friendly ten-tab navigation');
  for(const href of ['/dashboard/orders','/dashboard/inventory','/dashboard/dispatch','/dashboard/warehouse','/dashboard/returns','/dashboard/rainchecks','/dashboard/messages']) assert.ok(tools.includes(href));
});

test('customer detail keeps Friendly-style contacts and credits in the main customer workspace',()=>{
  const page=read('app/dashboard/customers/[id]/page.tsx');
  const relationships=read('app/dashboard/customers/[id]/relationships/CustomerRelationships.tsx');
  assert.match(page,/CustomerRelationships/);
  assert.match(page,/Contacts, Credits & Rainchecks/);
  assert.match(relationships,/friendly-admin-card/);
  assert.match(relationships,/friendly-admin-field/);
  assert.match(relationships,/friendly-admin-primary/);
});


test('website builder exposes Friendly-style real management tools without leaving the editor blind',()=>{
  const website=read('app/dashboard/website/page.tsx');
  assert.match(website,/Website tools/);
  for(const href of ['/dashboard/pages','/dashboard/settings/business#website','/dashboard/inventory','/dashboard/categories','/dashboard/inventory/packages','/dashboard/settings']) assert.ok(website.includes(href));
});

test('order detail exposes real Friendly-style quick actions and prefilled restriction context',()=>{
  const page=read('app/dashboard/orders/[id]/page.tsx');
  for(const label of ['Payment / Refund','Edit Items','Message Customer','Do Not Rent','Fulfillment']) assert.ok(page.includes(label));
  assert.match(page,/dnrParams/);
  assert.match(page,/customerId=/);
});

test('tenant brand behaves like Friendly admin by opening the public business website',()=>{
  const nav=read('app/dashboard/DashboardNav.tsx');
  assert.match(nav,/href="\/" target="_blank"/);
  assert.match(nav,/Open .+ website/);
});


test('specialist operations screens use the Friendly admin component system instead of old SaaS controls',()=>{
  const portal=read('app/dashboard/orders/[id]/PortalLinkButton.tsx');
  const packages=read('app/dashboard/inventory/packages/PackageBuilder.tsx');
  const fulfillment=read('app/dashboard/orders/[id]/fulfillment/page.tsx');
  const returns=read('app/dashboard/returns/orders/[orderId]/ReturnReconciliation.tsx');
  const scanner=read('app/dashboard/warehouse/orders/[orderId]/OrderWarehouseScanner.tsx');
  const automations=read('app/dashboard/automations/page.tsx');
  for(const source of [portal,packages,fulfillment,returns,scanner,automations]) assert.match(source,/friendly-admin-/);
  assert.doesNotMatch(portal,/rounded-xl bg-blue-600/);
  assert.doesNotMatch(packages,/rounded-xl bg-blue-600/);
  assert.doesNotMatch(returns,/rounded-xl bg-slate-950/);
  assert.doesNotMatch(scanner,/rounded-xl bg-slate-950/);
  assert.match(automations,/friendly-admin-tab is-active/);
});


test('inventory and delivery preserve Friendly green operational headers',()=>{
  const inventory=read('app/dashboard/inventory/page.tsx');
  const delivery=read('app/dashboard/deliveries/page.tsx');
  const css=read('app/dashboard/tenant.css');
  assert.match(inventory,/friendly-admin-green-head/);
  assert.match(css,/thead\.friendly-admin-green-head/);
  assert.match(delivery,/bg-\[#2d6a2d\]/);
  assert.match(delivery,/text-white/);
});
