const fs=require('node:fs');
if(process.env.CI!=='true'||process.env.GITHUB_REF!=='refs/heads/admin/operations-completion-20260921')throw Error('Review branch only.');
if(fs.existsSync('docs/release-refinements-applied.txt'))process.exit(0);
function change(file,from,to){const source=fs.readFileSync(file,'utf8');if(!source.includes(from))throw Error('Missing exact source anchor '+file);fs.writeFileSync(file,source.replace(from,to));}
change('app/api/users/route.ts','  const updated = await prisma.user.update({',`  // Credentials and access changes invalidate previously issued sessions,\n  // including sessions currently open through platform support.\n  if (data.password !== undefined || (data.role !== undefined && data.role !== target.role) || (data.tenantRoleId !== undefined && data.tenantRoleId !== target.tenantRoleId)) {\n    data.sessionVersion = { increment: 1 };\n  }\n\n  const updated = await prisma.user.update({`);
change('app/admin/insights/page.tsx','const now=new Date(),since=new Date(now.getTime()-30*86400000);','const now=new Date(),since=new Date(now.getTime()-30*86400000),cohortSince=new Date(now.getTime()-365*86400000);');
change('app/admin/insights/page.tsx',`WHERE o.slug<>'_platform_internal' ORDER BY u.\"day\"\x60),`,`WHERE o.slug<>'_platform_internal' AND u.\"day\">=$1 ORDER BY u.\"day\"\x60,cohortSince),`);
change('app/admin/insights/page.tsx','observedReturnCohorts(accounts,usage,coverage,now)','observedReturnCohorts(accounts.filter(a=>a.createdAt>=cohortSince),usage,coverage,now)');
change('app/admin/insights/page.tsx','Only accounts created after observation began are eligible.','This table covers signups in the last 365 days. Only accounts created after observation began are eligible.');
fs.writeFileSync('docs/release-refinements-applied.txt','Tenant session invalidation and bounded observed-cohort reporting are integrated. Exact-head tests still required.\n');
