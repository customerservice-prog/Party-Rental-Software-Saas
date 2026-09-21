import {NextResponse} from 'next/server';
import {requirePlatformAdmin} from '@/lib/admin';
import {prisma} from '@/lib/prisma';
import {isAllowedAdminOrigin} from '@/lib/adminRequest';
import {beginOperation,finishOperation} from '@/lib/platformOperations';
import {reconcileTenantBilling,reconcileBillingReceipt,BillingReconciliationError} from '@/lib/platformBillingLedger';
import {inspectDomain} from '@/lib/domainInspection';
export const dynamic='force-dynamic';
export async function GET(){
 await requirePlatformAdmin('operations');
 const [runs,receipts,domains,organizations]=await Promise.all([
  prisma.$queryRawUnsafe(`SELECT * FROM "PlatformOperationRun" ORDER BY "startedAt" DESC LIMIT 100`),
  prisma.$queryRawUnsafe(`SELECT * FROM "PlatformWebhookReceipt" ORDER BY "receivedAt" DESC LIMIT 100`),
  prisma.$queryRawUnsafe(`SELECT * FROM "PlatformDomainCheck" ORDER BY "checkedAt" DESC LIMIT 100`),
  prisma.organization.findMany({where:{slug:{not:'_platform_internal'}},select:{id:true,name:true,customDomain:true},orderBy:{name:'asc'}})
 ]);
 return NextResponse.json({runs,receipts,domains,organizations,checkedAt:new Date().toISOString(),limits:{runs:100,receipts:100,domains:100}},{headers:{'Cache-Control':'no-store'}});
}
export async function POST(request:Request){
 const body=await request.json().catch(()=>null);
 const capability=body?.action==='billing.refresh'?'billing':'operations';
 const session=await requirePlatformAdmin(capability);
 if(!isAllowedAdminOrigin(request))return NextResponse.json({error:'Request origin is not allowed.'},{status:403});
 const actor=(session.user as {id:string}).id;
 if(!['billing.refresh','webhook.reconcile','domain.inspect'].includes(body?.action))return NextResponse.json({error:'Choose a supported operation.'},{status:400});
 const operation=await beginOperation(body.action,actor,typeof body.organizationId==='string'?body.organizationId:null);
 try{
  if(body.action==='billing.refresh'){
   const after=typeof body.after==='string'?body.after.slice(0,100):'';
   const locals=await prisma.platformSubscription.findMany({where:{stripeSubId:{not:null},organization:{slug:{not:'_platform_internal'}},...(after?{organizationId:{gt:after}}:{})},select:{organizationId:true},orderBy:{organizationId:'asc'},take:6});
   const selected=locals.slice(0,5),outcomes:Array<{organizationId:string;state:string;reason?:string}>=[];
   for(const row of selected){try{await reconcileTenantBilling(row.organizationId);outcomes.push({organizationId:row.organizationId,state:'checked'});}catch(e){outcomes.push({organizationId:row.organizationId,state:'failed',reason:e instanceof BillingReconciliationError?e.code:'provider_or_database_error'});}}
   const summary={outcomes,next:locals.length>5?selected.at(-1)?.organizationId:null};
   await finishOperation(operation,outcomes.some(r=>r.state==='failed')?'partial':'completed',summary);
   await prisma.auditLog.create({data:{action:'platform.billing.snapshot_refreshed',performedBy:actor,details:JSON.stringify({operation,checked:outcomes.filter(r=>r.state==='checked').length,failed:outcomes.filter(r=>r.state==='failed').length})}});
   return NextResponse.json(summary,{headers:{'Cache-Control':'no-store'}});
  }
  if(body.action==='webhook.reconcile'){
   if(typeof body.eventId!=='string'||!/^evt_[A-Za-z0-9]+$/.test(body.eventId))throw new BillingReconciliationError('invalid_event_id');
   const summary=await reconcileBillingReceipt(body.eventId);
   await finishOperation(operation,'completed',summary);
   await prisma.auditLog.create({data:{action:'platform.webhook.reconciled',performedBy:actor,details:JSON.stringify({operation,eventId:body.eventId})}});
   return NextResponse.json(summary);
  }
  const org=await prisma.organization.findFirst({where:{id:String(body.organizationId||''),slug:{not:'_platform_internal'}},select:{id:true,customDomain:true}});
  if(!org?.customDomain)throw new BillingReconciliationError('custom_domain_missing');
  const result=await inspectDomain(org.customDomain);
  await prisma.$executeRawUnsafe(`INSERT INTO "PlatformDomainCheck" ("organizationId","hostname","state","detail","certificateExpiresAt") VALUES ($1,$2,$3,$4,$5) ON CONFLICT ("organizationId") DO UPDATE SET "hostname"=EXCLUDED."hostname","state"=EXCLUDED."state","detail"=EXCLUDED."detail","certificateExpiresAt"=EXCLUDED."certificateExpiresAt","checkedAt"=CURRENT_TIMESTAMP`,org.id,result.hostname,result.state,result.detail,result.certificateExpiresAt?new Date(result.certificateExpiresAt):null);
  await finishOperation(operation,'completed',result);
  await prisma.auditLog.create({data:{organizationId:org.id,action:'platform.domain.inspected',performedBy:actor,details:JSON.stringify({operation,state:result.state})}});
  return NextResponse.json(result);
 }catch(e){const error=e instanceof BillingReconciliationError?e.code:'operation_failed';await finishOperation(operation,'failed',{error});return NextResponse.json({error:'Operation did not complete: '+error+'. No charge or message was sent.'},{status:502});}
}
