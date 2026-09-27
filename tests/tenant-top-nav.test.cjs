const assert=require('node:assert/strict');
const {test}=require('node:test');
const fs=require('node:fs');
const path=require('node:path');

test('tenant workspace navigation follows Friendly desktop and mobile patterns',()=>{
 const source=fs.readFileSync(path.join(__dirname,'..','app','dashboard','DashboardNav.tsx'),'utf8');
 assert.ok(source.includes('tenant-parity-nav'));
 assert.ok(source.includes('tenant-parity-desktop'));
 assert.ok(source.includes('tenant-parity-mobile-toggle'));
 assert.ok(source.includes('tenant-parity-mobile'));
 assert.ok(source.includes('Edit Website'));
 assert.ok(source.includes('Signed in as'));
 assert.equal(source.includes('tenant-drawer'),false);
 assert.equal(source.includes('<dialog'),false);
});
