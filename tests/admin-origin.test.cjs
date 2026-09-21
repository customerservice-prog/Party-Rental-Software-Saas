const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),ts=require('typescript'),vm=require('node:vm');
const mod={exports:{}};
vm.runInThisContext('(function(module,exports){'+ts.transpileModule(fs.readFileSync('lib/adminRequest.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText+'\n})')(mod,mod.exports);
const allowed=mod.exports.isAdminRequestOriginAllowed;
const request=origin=>new Request('http://internal:8080/api/admin/test',{method:'POST',headers:{origin,'x-forwarded-host':'evil.example'}});
test('explicit public origin supports a TLS-terminating proxy',()=>{
 assert.equal(allowed(request('https://crm.example'),{PUBLIC_BASE_URL:'https://crm.example'}),true);
 assert.equal(allowed(request('https://www.crm.example'),{NEXT_PUBLIC_ROOT_DOMAIN:'crm.example'}),true);
});
test('forwarded headers do not grant an external site access',()=>{
 assert.equal(allowed(request('https://evil.example'),{NEXTAUTH_URL:'https://crm.example'}),false);
 assert.equal(allowed(request('https://tenant.crm.example'),{NEXT_PUBLIC_ROOT_DOMAIN:'crm.example'}),false);
});
test('opaque and malformed origins fail closed',()=>{
 for(const origin of ['null','not-a-url','https://crm.example/path','file:///'])assert.equal(allowed(request(origin),{PUBLIC_BASE_URL:'https://crm.example'}),false);
});
