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
