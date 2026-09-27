const assert=require('node:assert/strict');
const {test}=require('node:test');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('dashboard parity adds Friendly all-tools hub and independent calendar job filter',()=>{
  const home=read('app/dashboard/page.tsx');
  const calendar=read('app/dashboard/HomeCalendar.tsx');
  assert.match(home,/>All tools</);
  for(const href of ['/dashboard/orders/new','/dashboard/deliveries','/dashboard/dispatch','/dashboard/returns','/dashboard/settings']) assert.ok(home.includes(href));
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
