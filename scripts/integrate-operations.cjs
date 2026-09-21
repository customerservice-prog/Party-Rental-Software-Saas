// One-time source codemod, run only in the named review branch by the
// integration workflow. It edits code, never production data or credentials.
const fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
if(process.env.CI!=='true'||process.env.GITHUB_REF!=='refs/heads/admin/operations-completion-20260921')throw Error('Review branch only.');
const read=p=>fs.readFileSync(p,'utf8'),write=(p,s)=>{fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,s)};
if(fs.existsSync('docs/operations-integration-applied.txt')){console.log('Already integrated.');process.exit(0);}
function change(file,from,to){const s=read(file);if(!s.includes(from))throw Error('Missing source anchor in '+file+': '+from);write(file,s.replace(from,to));}
function all(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?all(path.join(dir,e.name)):[path.join(dir,e.name)]);}
function pageCapability(file){const p=file.replace(/\\/g,'/');if(p.includes('/organizations/new/'))return 'platform';if(p.includes('/support/'))return 'support';const section=p.split('/')[2];return ({'page.tsx':'overview',organizations:'organizations',users:'support',onboarding:'support',billing:'billing',analytics:'analytics',health:'operations',integrations:'operations',alerts:'operations','catalog-templates':'catalog',communications:'communications',data:'data',security:'security',settings:'platform','feature-flags':'platform','audit-log':'platform'}[section])||null;}
// Pages independently authorize before querying data. Layouts additionally
// cover client-rendered screens, while APIs enforce their own capability.
for(const file of all('app/admin').filter(p=>p.endsWith('/page.tsx'))){
 let s=read(file),cap=pageCapability(file);if(!cap||/^['\"]use client['\"]/.test(s.trim()))continue;
 if(s.includes('requirePlatformAdmin()'))s=s.replaceAll('requirePlatformAdmin()',`requirePlatformAdmin('${cap}')`);
 else if(!s.includes('await requirePlatformAdmin(')){
  const source=ts.createSourceFile(file,s,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  const fn=source.statements.find(n=>ts.isFunctionDeclaration(n)&&n.modifiers?.some(m=>m.kind===ts.SyntaxKind.DefaultKeyword));
  if(!fn?.body)throw Error('No server page body '+file);
  const point=fn.body.getStart(source)+1;s=s.slice(0,point)+`\n await requirePlatformAdmin('${cap}');\n`+s.slice(point);
  s=`import {requirePlatformAdmin} from '@/lib/admin';\n`+s;
 }
 write(file,s);
}
for(const [section,cap] of Object.entries({organizations:'organizations',users:'support',onboarding:'support',billing:'billing',analytics:'analytics',health:'operations',integrations:'operations',alerts:'operations','catalog-templates':'catalog',communications:'communications',data:'data',security:'security',settings:'platform','feature-flags':'platform','audit-log':'platform'})){
 const file=`app/admin/${section}/layout.tsx`;if(fs.existsSync(file))throw Error('Review existing nested layout '+file);
 write(file,`import {requirePlatformAdmin} from '@/lib/admin';\nexport default async function SectionAccess({children}:{children:React.ReactNode}){await requirePlatformAdmin('${cap}');return children;}\n`);
}
write('app/admin/organizations/new/layout.tsx',`import {requirePlatformAdmin} from '@/lib/admin';\nexport default async function NewTenantAccess({children}:{children:React.ReactNode}){await requirePlatformAdmin('platform');return children;}\n`);
// Existing APIs are full administrator by default; explicitly widen only
// the selected support, billing, operations and catalog capabilities.
for(const file of all('app/api/admin').filter(p=>p.endsWith('/route.ts'))){
 let s=read(file);if(file.includes('/operations/')||file.includes('/access/'))continue;
 let cap=file.includes('/catalog-templates/')?'catalog':file.includes('/support')?'support':file.includes('/billing/')?'billing':file.includes('/integrations/')?'operations':file.includes('/security/')?'security':file.includes('/export/')?'data':'platform';
 if(s.includes('async function requireAdmin()')){
  const source=ts.createSourceFile(file,s,ts.ScriptTarget.Latest,true),fn=source.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='requireAdmin');
  if(!fn)throw Error('Admin helper missing');s=s.slice(0,fn.getStart(source))+`async function requireAdmin(){return requirePlatformAdmin('catalog');}`+s.slice(fn.end);s=`import {requirePlatformAdmin} from '@/lib/admin';\n`+s;
 }
 s=s.replaceAll('requirePlatformAdmin()',`requirePlatformAdmin('${cap}')`);
 if((file==='app/api/admin/organizations/route.ts'||file==='app/api/admin/organizations/[id]/route.ts')&&s.includes(`requirePlatformAdmin('platform')`)){
  const source=ts.createSourceFile(file,s,ts.ScriptTarget.Latest,true);const get=source.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='GET');
  if(get){const part=s.slice(get.getStart(source),get.end).replaceAll(`requirePlatformAdmin('platform')`,`requirePlatformAdmin('organizations')`);s=s.slice(0,get.getStart(source))+part+s.slice(get.end);}
 }
 write(file,s);
}
// Remove development bypasses. Deployment tooling handles schema/bootstrap;
// authenticated platform controls handle billing and login protection.
for(const [name,methods] of Object.entries({'sync-schema':['POST'],'unblock-billing':['POST'],'login-throttle-debug':['GET','DELETE'],'setup':['POST']}))write(`app/api/admin/${name}/route.ts`,`import {NextResponse} from 'next/server';\n${methods.map(method=>`export async function ${method}(){return NextResponse.json({error:'This legacy development endpoint has been retired. Use the secured platform console.'},{status:410});}`).join('\n')}\n`);
// The old seed utility allowed tenant owners to modify the global catalog.
let seed=read('app/api/admin/catalog-templates/seed/route.ts');
const start=seed.indexOf('  const session = await getServerSession(authOptions);'),end=seed.indexOf('  let created = 0;',start);
if(start<0||end<0)throw Error('Seed guard not found');seed=seed.slice(0,start)+`  await requirePlatformAdmin('catalog');\n\n`+seed.slice(end);seed=`import {requirePlatformAdmin} from '@/lib/admin';\n`+seed;write('app/api/admin/catalog-templates/seed/route.ts',seed);
// Each new full admin is explicitly granted full access; existing accounts
// keep their historical full access until a role change is requested.
const security='app/api/admin/security/route.ts';
change(security,'const admin=await prisma.user.create({data:{organizationId:platformOrg.id,name,username,password:hash,role:"platform_admin",isActive:true,forcePasswordReset:false}});',`const admin=await prisma.$transaction(async tx=>{const created=await tx.user.create({data:{organizationId:platformOrg.id,name,username,password:hash,role:'platform_admin',isActive:true,forcePasswordReset:false}});await tx.$executeRawUnsafe('INSERT INTO "PlatformAdminGrant" ("userId","accessRole","updatedBy") VALUES ($1,$2,$3)',created.id,'administrator',actor);return created;});`);
// Carry the current database grant into navigation. This never replaces the
// server/API guards and cannot be used to authorize a write by itself.
change('app/admin/layout.tsx','import {requirePlatformAdmin}', 'import {requirePlatformAdmin,getPlatformAdminAccess}');
change('app/admin/layout.tsx','const session=await requirePlatformAdmin();',`const session=await requirePlatformAdmin('console');\n const accessRole=(await getPlatformAdminAccess((session.user as {id:string}).id))!;`);
change('app/admin/layout.tsx','<AdminNav adminName={adminName}/>','<AdminNav adminName={adminName} accessRole={accessRole}/>');
change('app/admin/layout.tsx','<AdminChrome/>','<AdminChrome accessRole={accessRole}/>');
let nav=read('app/admin/AdminNav.tsx');nav=`import {canNavigateAdmin} from '@/lib/adminNavigationAccess';\nimport type {PlatformAccessRole} from '@/lib/platformCapabilities';\n`+nav.replace('export default function AdminNav({adminName}:{adminName:string})','export default function AdminNav({adminName,accessRole}:{adminName:string;accessRole:PlatformAccessRole})');nav=nav.replace('const groups=adminNavigation.map(',`const groups=adminNavigation.map(g=>({...g,links:g.links.filter(d=>canNavigateAdmin(accessRole,d.href))})).filter(g=>g.links.length).map(`);nav=nav.replace(/^import([\s\S]*?)"use client";/,'"use client";\nimport$1');write('app/admin/AdminNav.tsx',nav);
let chrome=read('app/admin/AdminChrome.tsx');chrome=chrome.replace('export default function AdminChrome(){','export default function AdminChrome({accessRole}:{accessRole:PlatformAccessRole}){').replace('const destinations=adminNavigation.flatMap(g=>g.links).filter(', 'const destinations=adminNavigation.flatMap(g=>g.links).filter(d=>canNavigateAdmin(accessRole,d.href)).filter(');
chrome=chrome.replace('import {useEffect',`import {canNavigateAdmin} from '@/lib/adminNavigationAccess';\nimport type {PlatformAccessRole} from '@/lib/platformCapabilities';\nimport {useEffect`);write('app/admin/AdminChrome.tsx',chrome);
const navigation='app/admin/navigation.ts';change(navigation,'{name:"Operations",links:[',`{name:"Operations",links:[\n    {href:'/admin/operations',label:'Operations center',icon:'shield',description:'Webhook recovery, job history and certificate checks'},\n    {href:'/admin/revenue',label:'Verified revenue',icon:'wallet',description:'Live subscription prices and recurring discount coverage'},\n    {href:'/admin/access',label:'Administrator roles',icon:'users',description:'Grant least-privilege platform access'},`);
// Catalog-only operators should land at an allowed screen, not an overview
// with tenant-identifying account data.
let home=read('app/admin/page.tsx');home=`import {redirect} from 'next/navigation';\nimport {getPlatformAdminAccess} from '@/lib/admin';\n`+home.replace(`await requirePlatformAdmin('overview');`,`const accessSession=await requirePlatformAdmin('console');\n const accessRole=await getPlatformAdminAccess((accessSession.user as {id:string}).id);if(accessRole==='catalog')redirect('/admin/catalog-templates');\n await requirePlatformAdmin('overview');`);write('app/admin/page.tsx',home);
// Enforce support capability on every existing support-session request, not
// just its entry button, so a lowered grant immediately ends elevated use.
let viewer=read('lib/tenantViewer.ts');viewer=`import {getPlatformAdminAccess} from '@/lib/admin';\nimport {platformAllows} from '@/lib/platformCapabilities';\n`+viewer;
const source=ts.createSourceFile('lib/tenantViewer.ts',viewer,ts.ScriptTarget.Latest,true),fn=source.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='resolveTenantViewer');
if(!fn?.body)throw Error('Viewer function not found');const parameter=fn.parameters[0].name.getText(source),pos=fn.body.getStart(source)+1;viewer=viewer.slice(0,pos)+`\n if(${parameter}.role==='platform_admin'){const grant=await getPlatformAdminAccess(${parameter}.id);if(!grant||!platformAllows(grant,'support'))return null;}\n`+viewer.slice(pos);write('lib/tenantViewer.ts',viewer);
// Shared initializer invoked both in disposable CI and Railway predeploy.
const ensure=read('scripts/ensure-fulfillment-schema.js');
const close=ensure.lastIndexOf('await prisma.$disconnect');
// Do not guess the existing script's connection lifecycle. Load the additive
// initializer through a separate chained command in workflow/deployment.
let workflow=read('.github/workflows/platform-admin-ci.yml');workflow=workflow.replace('node scripts/ensure-platform-admin.js','node scripts/ensure-platform-admin.js && node scripts/ensure-operations-schema.cjs');workflow=workflow.replace('      - name: Preserve validation evidence',`      - name: Operational permissions and reconciliation checks\n        run: node scripts/operations-browser-qa.cjs\n      - name: Disposable database backup and restore drill\n        run: bash scripts/restore-drill.sh\n      - name: Preserve validation evidence`);write('.github/workflows/platform-admin-ci.yml',workflow);
write('docs/operations-integration-applied.txt','Source guards integrated on the review branch. This is not a validation or production deployment claim.\n');
console.log('Source integration completed. Review the generated diff and validate the exact resulting commit.');
