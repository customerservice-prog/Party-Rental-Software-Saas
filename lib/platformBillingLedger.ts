import {randomUUID} from 'node:crypto';
import type Stripe from 'stripe';
import {prisma} from '@/lib/prisma';
import {stripe} from '@/lib/stripe';
import {recurringRunRate,type RevenueSubscription} from '@/lib/recurringRevenue';
import {knownPlanCode} from '@/lib/adminReadiness';
export class BillingReconciliationError extends Error{constructor(public code:string){super(code);}}
export function subscriptionIdFromEvent(event:{type:string;data:{object:any}}):string|null{
 const object=event.data.object;
 const raw=event.type.startsWith('customer.subscription.')?object.id:object.subscription||object.parent?.subscription_details?.subscription;
 const id=typeof raw==='string'?raw:raw?.id;
 return typeof id==='string'&&/^sub_[A-Za-z0-9]+$/.test(id)?id:null;
}
function customerId(value:Stripe.Subscription['customer']){return typeof value==='string'?value:value.id;}
function recognizedPlan(lookup:string|null|undefined){if(!lookup)return null;return knownPlanCode(lookup.split('_')[0]);}
// Lock tenant state across the Stripe read and the atomic local write. A late
// event reads the CURRENT subscription, never replays its older status snapshot.
export async function reconcileTenantBilling(organizationId:string,options:{subscriptionId?:string;applyEntitlements?:boolean}={}){
 return prisma.$transaction(async tx=>{
  await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(hashtext($1))`, 'billing:'+organizationId);
  const local=await tx.platformSubscription.findFirst({where:{organizationId,organization:{slug:{not:'_platform_internal'}}}});
  if(!local)throw new BillingReconciliationError('tenant_subscription_missing');
  const id=options.subscriptionId||local.stripeSubId;
  if(!id||!/^sub_[A-Za-z0-9]+$/.test(id))throw new BillingReconciliationError('subscription_not_linked');
  if(local.stripeSubId&&local.stripeSubId!==id)throw new BillingReconciliationError('superseded_subscription');
  if(!process.env.STRIPE_SECRET_KEY)throw new BillingReconciliationError('stripe_not_configured');
  const sub=await stripe.subscriptions.retrieve(id,{expand:['discounts','items.data.discounts']},{timeout:8000,maxNetworkRetries:0});
  if(local.stripeCustomerId&&customerId(sub.customer)!==local.stripeCustomerId)throw new BillingReconciliationError('customer_link_mismatch');
  if(sub.metadata?.organizationId&&sub.metadata.organizationId!==organizationId)throw new BillingReconciliationError('tenant_link_mismatch');
  if(!local.stripeCustomerId&&!local.stripeSubId&&sub.metadata?.organizationId!==organizationId)throw new BillingReconciliationError('tenant_link_unverified');
  const rate=recurringRunRate(sub as unknown as RevenueSubscription);
  const periodEnd=sub.current_period_end?new Date(sub.current_period_end*1000):null;
  const before=await tx.$queryRawUnsafe<Array<{subscriptionId:string;status:string;netMonthlyCents:number|null;currency:string|null;liveMode:boolean}>>(`SELECT "subscriptionId","status","netMonthlyCents","currency","liveMode" FROM "PlatformBillingSnapshot" WHERE "organizationId"=$1`,organizationId);
  await tx.$executeRawUnsafe(`INSERT INTO "PlatformBillingSnapshot" ("organizationId","subscriptionId","status","liveMode","currency","grossMonthlyCents","netMonthlyCents","exclusion","priceSummary","checkedAt","periodEnd") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,CURRENT_TIMESTAMP,$10) ON CONFLICT ("organizationId") DO UPDATE SET "subscriptionId"=EXCLUDED."subscriptionId","status"=EXCLUDED."status","liveMode"=EXCLUDED."liveMode","currency"=EXCLUDED."currency","grossMonthlyCents"=EXCLUDED."grossMonthlyCents","netMonthlyCents"=EXCLUDED."netMonthlyCents","exclusion"=EXCLUDED."exclusion","priceSummary"=EXCLUDED."priceSummary","checkedAt"=EXCLUDED."checkedAt","periodEnd"=EXCLUDED."periodEnd"`,organizationId,sub.id,sub.status,sub.livemode,rate.currency,rate.grossMonthlyCents,rate.netMonthlyCents,rate.exclusion,JSON.stringify(rate.lines),periodEnd);
  const previous=before[0];
  if(!previous||previous.subscriptionId!==sub.id||previous.status!==sub.status||previous.netMonthlyCents!==rate.netMonthlyCents||previous.currency!==rate.currency||previous.liveMode!==sub.livemode){
   await tx.$executeRawUnsafe(`INSERT INTO "PlatformBillingHistory" ("id","organizationId","subscriptionId","status","liveMode","currency","netMonthlyCents") VALUES ($1,$2,$3,$4,$5,$6,$7)`,randomUUID(),organizationId,sub.id,sub.status,sub.livemode,rate.currency,rate.netMonthlyCents);
  }
  // Test events and manual inspections never activate a production tenant.
  if(options.applyEntitlements&&sub.livemode){
   const plan=recognizedPlan(sub.items.data[0]?.price.lookup_key);
   const interval=sub.items.data[0]?.price.recurring?.interval;
   await tx.platformSubscription.update({where:{organizationId},data:{stripeSubId:sub.id,stripeCustomerId:customerId(sub.customer),status:sub.status,currentPeriodEnd:periodEnd,...(interval==='year'?{billingInterval:'annual'}:interval==='month'?{billingInterval:'monthly'}:{}),...(plan?{planTier:plan}:{}),pastDueSince:sub.status==='past_due'?local.pastDueSince||new Date():null}});
   if(plan)await tx.organization.update({where:{id:organizationId},data:{planTier:plan}});
  }
  return {organizationId,subscriptionId:sub.id,status:sub.status,liveMode:sub.livemode,...rate};
 },{maxWait:5000,timeout:15000});
}
export async function acceptBillingEvent(event:Stripe.Event){
 const id=subscriptionIdFromEvent(event),object=event.data.object as any;
 await prisma.$executeRawUnsafe(`INSERT INTO "PlatformWebhookReceipt" ("eventId","eventType","subscriptionId","liveMode","providerCreatedAt") VALUES ($1,$2,$3,$4,$5) ON CONFLICT ("eventId") DO NOTHING`,event.id,event.type,id,event.livemode,new Date(event.created*1000));
 if(!event.livemode||!id){await prisma.$executeRawUnsafe(`UPDATE "PlatformWebhookReceipt" SET "state"='ignored',"processedAt"=CURRENT_TIMESTAMP,"errorCode"=$2 WHERE "eventId"=$1 AND "state"='received'`,event.id,event.livemode?'not_a_subscription_event':'test_mode');return {ignored:true};}
 const incomingCustomer=typeof object.customer==='string'?object.customer:object.customer?.id;
 const local=await prisma.platformSubscription.findFirst({where:{organization:{slug:{not:'_platform_internal'}},OR:[{stripeSubId:id},...(incomingCustomer?[{stripeCustomerId:incomingCustomer}]:[])]},select:{organizationId:true,stripeSubId:true}});
 let organizationId=local?.organizationId;
 if(!organizationId&&event.type.startsWith('customer.subscription.')&&object.metadata?.organizationId){
  const candidate=await prisma.platformSubscription.findFirst({where:{organizationId:String(object.metadata.organizationId),organization:{slug:{not:'_platform_internal'}}},select:{organizationId:true}});
  organizationId=candidate?.organizationId;
 }
 if(!organizationId||(local?.stripeSubId&&local.stripeSubId!==id)){
  await prisma.$executeRawUnsafe(`UPDATE "PlatformWebhookReceipt" SET "state"='ignored',"processedAt"=CURRENT_TIMESTAMP,"errorCode"=$2 WHERE "eventId"=$1 AND "state"='received'`,event.id,organizationId?'superseded_subscription':'unlinked_subscription');return {ignored:true};
 }
 await prisma.$executeRawUnsafe(`UPDATE "PlatformWebhookReceipt" SET "organizationId"=$2 WHERE "eventId"=$1`,event.id,organizationId);
 return reconcileBillingReceipt(event.id);
}
export async function reconcileBillingReceipt(eventId:string){
 const claimed=await prisma.$queryRawUnsafe<Array<{organizationId:string;subscriptionId:string}>>(`UPDATE "PlatformWebhookReceipt" SET "state"='processing',"attempts"="attempts"+1,"processedAt"=CURRENT_TIMESTAMP,"errorCode"=NULL WHERE "eventId"=$1 AND "liveMode"=true AND "organizationId" IS NOT NULL AND ("state" IN ('received','failed') OR ("state"='processing' AND "processedAt" < CURRENT_TIMESTAMP-INTERVAL '15 minutes')) RETURNING "organizationId","subscriptionId"`,eventId);
 if(!claimed.length){
  const rows=await prisma.$queryRawUnsafe<Array<{state:string}>>(`SELECT "state" FROM "PlatformWebhookReceipt" WHERE "eventId"=$1`,eventId);
  if(rows[0]?.state==='processing')throw new BillingReconciliationError('already_processing');
  if(!rows.length)throw new BillingReconciliationError('receipt_missing');
  return {duplicate:true};
 }
 try{
  await reconcileTenantBilling(claimed[0].organizationId,{subscriptionId:claimed[0].subscriptionId,applyEntitlements:true});
  await prisma.$executeRawUnsafe(`UPDATE "PlatformWebhookReceipt" SET "state"='completed',"processedAt"=CURRENT_TIMESTAMP,"errorCode"=NULL WHERE "eventId"=$1`,eventId);
  return {completed:true};
 }catch(error){
  const code=error instanceof BillingReconciliationError?error.code:'provider_or_database_error';
  await prisma.$executeRawUnsafe(`UPDATE "PlatformWebhookReceipt" SET "state"='failed',"processedAt"=CURRENT_TIMESTAMP,"errorCode"=$2 WHERE "eventId"=$1`,eventId,code);
  throw error;
 }
}
