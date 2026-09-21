const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const {PrismaClient}=require('@prisma/client');
if(process.env.CI!=='true'||process.env.DATABASE_URL!=='postgresql://test:test@localhost:5432/test'||process.env.STRIPE_SECRET_KEY)throw Error('Disposable CI only.');
const db=new PrismaClient(),out='test-results/redeploy';fs.mkdirSync(out,{recursive:true});
const tables=['Organization','User','Item','Category','CatalogTemplate','PlatformOperationRun','PlatformAdminGrant','PlatformBillingHistory','PlatformWebhookReceipt','PlatformFeatureUsage','PlatformSetting'];
async function fingerprint(){const result={};for(const table of tables){const rows=await db.$queryRawUnsafe(`SELECT row_to_json(t)::text AS data FROM "${table}" t ORDER BY row_to_json(t)::text`);result[table]={count:rows.length,hash:crypto.createHash('sha256').update(rows.map(r=>r.data).join('\n')).digest('hex')};}return result;}
async function main(){
 const before=await fingerprint();
 execFileSync(process.execPath,[path.join(__dirname,'prepare-production.cjs')],{stdio:'inherit',env:process.env,timeout:120000});
 assert.deepEqual(await fingerprint(),before,'Repeat production preparation changed existing records');
 execFileSync(process.execPath,[path.join(__dirname,'prepare-production.cjs')],{stdio:'inherit',env:process.env,timeout:120000});
 assert.deepEqual(await fingerprint(),before,'Third production preparation changed existing records');
 fs.writeFileSync(out+'/report.json',JSON.stringify({environment:'Disposable local database only',passed:true,checks:['Two repeated additive preparations preserve all checked row contents','Administrator credentials and grants remain unchanged','Observed billing/usage/job history and customized catalog remain unchanged'],tableCounts:Object.fromEntries(Object.entries(before).map(([k,v])=>[k,v.count]))},null,2));
 console.log('Repeat-deployment preservation checks passed across '+tables.length+' tables; no credential values emitted.');
}
main().catch(e=>{console.error(e.message);process.exitCode=1}).finally(()=>db.$disconnect());
