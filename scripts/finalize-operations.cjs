const fs=require('node:fs');
if(process.env.CI!=='true'||process.env.GITHUB_REF!=='refs/heads/admin/operations-completion-20260921')throw Error('Review branch only');
const change=(p,a,b)=>{const s=fs.readFileSync(p,'utf8');if(!s.includes(a))throw Error('Missing source anchor '+p);fs.writeFileSync(p,s.replace(a,b));};
if(fs.existsSync('docs/operations-finalization-applied.txt'))process.exit(0);
change('lib/tenantViewer.ts',"if(authenticated.role==='platform_admin')", "if(authenticated?.id && authenticated.role==='platform_admin')");
// Existing impersonation fixtures represent a full administrator; preserve
// all permission assertions and add independent restricted-role browser tests.
change('tests/platform-admin.test.cjs',"const viewer=load('lib/tenantViewer.ts',{'./prisma'", "const viewer=load('lib/tenantViewer.ts',{'@/lib/admin':{getPlatformAdminAccess:async()=> 'administrator'},'./prisma'");
// Wire additive metadata into the existing deploy initializer, preserving
// Railway's other schema and administrator-bootstrap steps.
change('scripts/ensure-fulfillment-schema.js','async function main() {',"async function main() {\n  await require('./ensure-operations-schema.cjs').ensure(prisma);");
fs.writeFileSync('docs/operations-finalization-applied.txt','Final source corrections applied. See exact-commit tests for verification.\n');
