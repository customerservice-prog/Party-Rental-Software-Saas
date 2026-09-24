const assert=require('node:assert/strict');
const {test}=require('node:test');
const fs=require('node:fs');
const path=require('node:path');

const files=[
 'app/dashboard/customers/CustomerNotes.tsx',
 'app/dashboard/inventory/ImportCsvModal.tsx',
 'app/dashboard/inventory/ItemUnitsPanel.tsx',
 'app/dashboard/HomeTasks.tsx',
 'app/dashboard/orders/[id]/PortalLinkButton.tsx',
 'app/dashboard/inventory/packages/PackageBuilder.tsx',
 'app/dashboard/operations/ReadinessPanel.tsx',
 'app/dashboard/scheduling/SchedulingCalendar.tsx',
 'app/dashboard/warehouse/orders/[orderId]/OrderWarehouseScanner.tsx',
 'app/dashboard/returns/orders/[orderId]/ReturnReconciliation.tsx',
 'app/dashboard/deliveries/packing-list/print-button.tsx',
];

test('shared tenant components keep Friendly admin visual system',()=>{
 for(const rel of files){
  const source=fs.readFileSync(path.join(__dirname,'..',rel),'utf8');
  assert.equal(source.includes('bg-indigo-600'),false,rel+' reintroduced indigo primary actions');
  assert.equal(source.includes('bg-blue-600'),false,rel+' reintroduced blue primary actions');
  assert.equal(source.includes('rounded-2xl'),false,rel+' reintroduced oversized SaaS card radius');
 }
});
