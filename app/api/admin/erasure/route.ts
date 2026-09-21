import {NextResponse} from 'next/server';
import {requirePlatformAdmin} from '@/lib/admin';
import {prisma} from '@/lib/prisma';
import {stripe} from '@/lib/stripe';
import {isAllowedAdminOrigin} from '@/lib/adminRequest';
import {verifySecurityStepUp} from '@/lib/securityStepUp';
import {ErasureError,requestErasure,changeErasure,executeErasure,exportTenant} from '@/lib/tenantErasure.cjs';
export const dynamic='force-dynamic';
async function billingStopped(local:any){
 if(!local)return;
 if(!local.stripeSubId&&!local.stripeCustomerId){if(['active','past_due','unpaid','incomplete'].includes(local.status))throw new ErasureError('local_billing_requires_resolution');return;}
 if(!process.env.STRIPE_SECRET_KEY)throw new ErasureError('billing_provider_check_required');
 if(local.stripeSubId){const sub=await stripe.subscriptions.retrieve(local.stripeSubId,{},{timeout:8000,maxNetworkRetries:0});const customer=typeof sub.customer==='string'?sub.customer:sub.customer.id;if(local.stripeCustomerId&&customer!==local.stripeCustomerId)throw new ErasureError('billing_link_mismatch');if(!['canceled','incomplete_expired'].includes(sub.status))throw new ErasureError('cancel_platform_subscription_first');}
 if(local.stripeCustomerId){const rows=await stripe.subscriptions.list({customer:local.stripeCustomerId,status:'all',limit:100},{timeout:8000,maxNetworkRetries:0});if(rows.has_more||rows.data.some(s=>!['canceled','incomplete_expired'].includes(s.status)))throw new ErasureError('customer_has_unresolved_subscriptions');}
}
export async function GET(request:Request){
 const session=await requirePlatformAdmin('data'),params=new URL(request.url).searchParams;
 try{
  const id=params.get('export');
  if(id){if(id.length>100)return NextResponse.json({error:'Invalid tenant.'},{status:400});const snapshot=await exportTenant(prisma,id,(session.user as {id:string}).id);return new NextResponse(JSON.stringify(snapshot),{headers:{'Content-Type':'application/json','Content-Disposition':'attachment; filename="tenant-complete-data-export.json"','Cache-Control':'no-store'}});}
  const q=(params.get('q')||'').slice(0,100),page=Math.min(10000,Math.max(1,Number(params.get('page'))||1));
  const rows=await prisma.$queryRawUnsafe(`SELECT o."id",o."name",o."slug",o."status",r."state" AS "requestState",r."eligibleAt",r."hold",r."requestedAt" FROM "Organization" o LEFT JOIN "TenantErasureRequest" r ON r."organizationId"=o."id" WHERE o."slug"<>'_platform_internal' AND (o."name" ILIKE $1 OR o."slug" ILIKE $1) ORDER BY o."name",o."id" LIMIT 51 OFFSET $2`,'%'+q+'%',(Math.floor(page)-1)*50) as any[];
  return NextResponse.json({rows:rows.slice(0,50),hasMore:rows.length>50,page,serverTime:new Date().toISOString()},{headers:{'Cache-Control':'no-store'}});
 }catch(e){return NextResponse.json({error:e instanceof ErasureError?e.message:'Export could not complete. No tenant was deleted.'},{status:409});}
}
export async function POST(request:Request){
 const session=await requirePlatformAdmin('data');
 if(!isAllowedAdminOrigin(request))return NextResponse.json({error:'Request origin is not allowed.'},{status:403});
 const body=await request.json().catch(()=>null),actor=(session.user as {id:string}).id;
 if(typeof body?.organizationId!=='string'||body.organizationId.length>100||!['request','cancel','hold','release_hold','execute'].includes(body.action))return NextResponse.json({error:'Choose a tenant and supported action.'},{status:400});
 if(!await verifySecurityStepUp(actor,body))return NextResponse.json({error:'Verify your current password and enabled authenticator. Too many attempts require a 15-minute pause.'},{status:403});
 try{
  const result=body.action==='request'?await requestErasure(prisma,body.organizationId,actor,body.confirmSlug):body.action==='execute'?await executeErasure(prisma,body.organizationId,actor,body,billingStopped):await changeErasure(prisma,body.organizationId,actor,body.action);
  return NextResponse.json(result,{headers:{'Cache-Control':'no-store'}});
 }catch(e){return NextResponse.json({error:e instanceof ErasureError?e.message:'The operation did not complete. No partial database deletion was committed.'},{status:409});}
}
