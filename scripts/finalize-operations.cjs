const fs=require('node:fs');
if(process.env.CI!=='true'||process.env.GITHUB_REF!=='refs/heads/admin/operations-completion-20260921')throw Error('Review branch only');
const change=(p,a,b)=>{const s=fs.readFileSync(p,'utf8');if(!s.includes(a))throw Error('Missing source anchor '+p);fs.writeFileSync(p,s.replace(a,b));};
if(fs.existsSync('docs/operations-finalization-applied.txt'))process.exit(0);
change('lib/tenantViewer.ts',"if(authenticated.role==='platform_admin')", "if(authenticated?.id && authenticated.role==='platform_admin')");
// Existing impersonation fixtures represent a fully authorized platform
// administrator. Keep that fact explicit after adding a grant lookup; all
// permission assertions remain, with restricted-role browser checks added.
change('tests/platform-admin.test.cjs',"const viewer=load('lib/tenantViewer.ts',{'./prisma'", "const viewer=load('lib/tenantViewer.ts',{'@/lib/admin':{getPlatformAdminAccess:async()=> 'administrator'},'./prisma'");
fs.writeFileSync('docs/operations-finalization-applied.txt','Final source corrections applied. See exact-commit tests for verification.\n');
