// Existing production schemas are never broadly synchronized or reset.
const {PrismaClient,Prisma}=require('@prisma/client'),{execFileSync}=require('node:child_process'),path=require('node:path');
const db=new PrismaClient();
function script(name){execFileSync(process.execPath,[path.join(__dirname,name)],{stdio:'inherit',env:process.env,timeout:120000});}
async function main(){
 const tables=await db.$queryRawUnsafe(`SELECT tablename FROM pg_tables WHERE schemaname=current_schema()`);
 if(!tables.length){
  console.log('Empty database detected; initializing the declared core schema.');
  execFileSync(process.execPath,[require.resolve('prisma/build/index.js'),'db','push','--skip-generate'],{stdio:'inherit',env:process.env,timeout:120000});
 }else if(!tables.some(t=>t.tablename==='Organization')||!tables.some(t=>t.tablename==='User'))throw Error('Existing nonempty database is not an initialized CRM schema. No reset was attempted.');
 script('ensure-fulfillment-schema.js');
 script('ensure-lifecycle-schema.cjs');
 const columns=await db.$queryRawUnsafe(`SELECT table_name,column_name FROM information_schema.columns WHERE table_schema=current_schema()`);
 const present=new Set(columns.map(c=>c.table_name+'.'+c.column_name)),missing=[];
 for(const model of Prisma.dmmf.datamodel.models)for(const field of model.fields)if(field.kind!=='object'&&!present.has((model.dbName||model.name)+'.'+(field.dbName||field.name)))missing.push(model.name+'.'+field.name);
 if(missing.length)throw Error('Explicit core migration required for: '+missing.join(', '));
 script('ensure-platform-admin.js');
 const media=await require('./apply-catalog-media.cjs').apply(db);
 await db.$executeRawUnsafe(`INSERT INTO "PlatformSetting" ("key","value","updatedBy","updatedAt") VALUES ('feature_usage_coverage_started',$1::jsonb,'deployment',CURRENT_TIMESTAMP) ON CONFLICT ("key") DO NOTHING`,JSON.stringify(new Date().toISOString()));
 console.log('Additive preparation complete; tenant data and administrator credentials preserved. Catalog media:',JSON.stringify(media));
}
main().catch(error=>{console.error(error instanceof Error?error.message:'Preparation failed.');process.exitCode=1;}).finally(()=>db.$disconnect());
