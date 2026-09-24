const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('tenant inventory exposes dedicated new, item, and category workspaces', () => {
  for (const file of [
    'app/dashboard/inventory/new/page.tsx',
    'app/dashboard/inventory/[id]/page.tsx',
    'app/dashboard/inventory/[id]/ItemWorkspace.tsx',
    'app/dashboard/categories/page.tsx',
  ]) assert.ok(fs.existsSync(path.join(root, file)), file+' should exist');

  const inventory = read('app/dashboard/inventory/page.tsx');
  assert.match(inventory, /\/dashboard\/inventory\/new/);
  assert.match(inventory, /\/dashboard\/categories/);
  assert.match(inventory, /\/dashboard\/inventory\/"\+item\.id/);

  const nav = read('app/dashboard/DashboardNav.tsx');
  assert.match(nav, /item\("\/categories","Categories","box"\)/);
});

test('tenant delivery workspace exposes printable invoices and contracts', () => {
  for (const file of [
    'app/dashboard/deliveries/print-invoices/page.tsx',
    'app/dashboard/deliveries/print-contracts/page.tsx',
    'app/dashboard/deliveries/PrintButton.tsx',
  ]) assert.ok(fs.existsSync(path.join(root, file)), file+' should exist');

  const delivery = read('app/dashboard/deliveries/page.tsx');
  assert.match(delivery, /\/dashboard\/deliveries\/print-invoices/);
  assert.match(delivery, /\/dashboard\/deliveries\/print-contracts/);

  const css = read('app/dashboard/tenant.css');
  assert.match(css, /Phase 4: printable delivery documents/);
  assert.match(css, /@media print/);
  assert.match(css, /\.print-document/);
});

test('Phase 4 pages remain tenant scoped and permission grounded', () => {
  const item = read('app/dashboard/inventory/[id]/page.tsx');
  assert.match(item, /organizationId:organization\.id/);
  assert.match(item, /requirePermission\(organization\.id,"inventory\.view"\)/);

  for (const file of [
    'app/dashboard/deliveries/print-invoices/page.tsx',
    'app/dashboard/deliveries/print-contracts/page.tsx',
  ]) {
    const source = read(file);
    assert.match(source, /organizationId:organization\.id/);
    assert.match(source, /requirePermission\(organization\.id,"orders\.view"\)/);
  }
});
