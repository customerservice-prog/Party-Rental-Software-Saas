const assert=require('node:assert/strict');
const {test}=require('node:test');
const fs=require('node:fs');
const path=require('node:path');

test('tenant workspace navigation remains a permanent top bar',()=>{
 const source=fs.readFileSync(path.join(__dirname,'..','app','dashboard','DashboardNav.tsx'),'utf8');
 assert.ok(source.includes('tenant-topnav-row'));
 assert.ok(source.includes('tenant-topnav-scroll'));
 assert.equal(source.includes('tenant-drawer'),false);
 assert.equal(source.includes('aria-haspopup="dialog"'),false);
});
