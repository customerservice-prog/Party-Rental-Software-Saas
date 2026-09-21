const fs=require('node:fs');
if(process.env.CI!=='true'||process.env.GITHUB_REF!=='refs/heads/admin/operations-completion-20260921')throw Error('Review branch only.');
if(fs.existsSync('docs/observability-integrated.txt'))process.exit(0);
function change(path,from,to){const text=fs.readFileSync(path,'utf8');if(!text.includes(from))throw Error('Missing source anchor '+path+': '+from);fs.writeFileSync(path,text.replace(from,to));}
change('app/dashboard/DashboardNav.tsx','import Link from "next/link";',`import Link from "next/link";\nimport FeatureUsageTracker from './FeatureUsageTracker';`);
change('app/dashboard/DashboardNav.tsx','return <div className="tenant-app"><a',`return <div className="tenant-app"><FeatureUsageTracker path={pathname} enabled={!supportBanner}/><a`);
change('app/admin/navigation.ts','{name:"Business",links:[',`{name:"Business",links:[\n    {href:'/admin/insights',label:'Product insights',icon:'chart',description:'Observed feature adoption and signup cohort return activity'},`);
change('app/admin/navigation.ts','{name:"Operations",links:[',`{name:"Operations",links:[\n    {href:'/admin/catalog-readiness',label:'Catalog readiness',icon:'box',description:'Review missing template photos and descriptions'},`);
change('app/admin/AdminChrome.tsx','<Link href="/admin/organizations/new" className="console-primary-action"><Icon name="plus"/>Create tenant</Link>',`{canNavigateAdmin(accessRole,'/admin/organizations/new')&&<Link href="/admin/organizations/new" className="console-primary-action"><Icon name="plus"/>Create tenant</Link>}`);
// Readiness links land on the corresponding filtered editor rather than an
// unrelated unfiltered catalog view.
change('app/admin/catalog-templates/page.tsx','const [query, setQuery] = useState("");',`const [query, setQuery] = useState("");\n  useEffect(()=>{setQuery(new URLSearchParams(window.location.search).get('q')||'');},[]);`);
// Photo-backed templates first when browsing, without hiding unpictured
// templates or changing any stored administrator ordering.
change('app/api/catalog-templates/route.ts','type CatalogTemplateRow = { id:', 'type CatalogTemplateRow = { imageUrl?:string|null; id:');
change('app/api/catalog-templates/route.ts','let results = templates;',`let results = templates.slice().sort((a,b)=>Number(Boolean(b.imageUrl?.trim()))-Number(Boolean(a.imageUrl?.trim())));`);
change('app/api/catalog-templates/route.ts','Math.min(parseInt(searchParams.get("limit") || "200", 10) || 200, 500)', 'Math.max(1,Math.min(parseInt(searchParams.get("limit") || "200", 10) || 200, 500))');
change('lib/admin.ts',"if(!role||!platformAllows(role,capability))redirect('/admin/access-denied');", "if(!role)redirect('/platform-login');\n if(!platformAllows(role,capability))redirect('/admin/access-denied');");
fs.writeFileSync('docs/observability-integrated.txt','Observed-usage, catalog readiness and navigation integration applied. Exact-commit validation required.\n');
console.log('Completed source integration; no production database or provider calls performed.');
