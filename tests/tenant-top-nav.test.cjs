const assert=require('node:assert/strict');
const {test}=require('node:test');
const fs=require('node:fs');
const path=require('node:path');

test('tenant workspace navigation remains one permanent top command row',()=>{
 const source=fs.readFileSync(path.join(__dirname,'..','app','dashboard','DashboardNav.tsx'),'utf8');
 assert.ok(source.includes('tenant-phase3-bar'));
 assert.ok(source.includes('tenant-phase3-nav'));
 assert.equal(source.includes('tenant-topnav-row'),false);
 assert.equal(source.includes('tenant-drawer'),false);
 assert.equal(source.includes('<dialog'),false);
});
