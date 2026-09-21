import { isAdminRequestOriginAllowed } from "@/lib/adminRequest";
import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
export const dynamic="force-dynamic";
export async function POST(request:Request,{params: paramsPromise}:{params:Promise<{id:string}>}) {
  const params = await paramsPromise;

  const session=await requirePlatformAdmin();
  if(!isAdminRequestOriginAllowed(request))return NextResponse.json({error:"Cross-origin checks are not allowed."},{status:403});
  const local=await prisma.platformSubscription.findFirst({where:{organizationId:params.id,organization:{slug:{not:"_platform_internal"}}},select:{stripeSubId:true,stripeCustomerId:true,status:true}});
  if(!local)return NextResponse.json({error:"Tenant subscription not found."},{status:404});
  if(!local.stripeSubId)return NextResponse.json({error:"No Stripe subscription is linked. An active local record alone does not establish a paid subscription."},{status:409});
  if(!process.env.STRIPE_SECRET_KEY)return NextResponse.json({error:"Platform Stripe credentials are not configured."},{status:503});
  let result;
  try {
    const sub=await stripe.subscriptions.retrieve(local.stripeSubId,{},{timeout:8000,maxNetworkRetries:0});
    const customer=typeof sub.customer==="string"?sub.customer:sub.customer.id;
    if(local.stripeCustomerId && customer!==local.stripeCustomerId)return NextResponse.json({error:"The linked subscription and customer do not match. Investigate the saved billing linkage."},{status:409});
    const invoices=await stripe.invoices.list({subscription:sub.id,limit:12},{timeout:8000,maxNetworkRetries:0});
    result={
      checkedAt:new Date().toISOString(),localStatus:local.status,
      subscription:{id:sub.id,status:sub.status,liveMode:sub.livemode,cancelAtPeriodEnd:sub.cancel_at_period_end,currentPeriodEnd:sub.current_period_end,discountApplied:Boolean(sub.discount || sub.discounts?.length),
        prices:sub.items.data.map(item=>({id:item.price.id,lookupKey:item.price.lookup_key,currency:item.price.currency,unitAmount:item.price.unit_amount,interval:item.price.recurring?.interval || null,intervalCount:item.price.recurring?.interval_count || null,usageType:item.price.recurring?.usage_type || null,quantity:item.quantity ?? null,billingScheme:item.price.billing_scheme}))},
      invoices:invoices.data.map(i=>({id:i.id,number:i.number,created:i.created,status:i.status,currency:i.currency,amountPaid:i.amount_paid,amountRemaining:i.amount_remaining,attemptCount:i.attempt_count})),moreInvoices:invoices.has_more,
    };
  } catch {return NextResponse.json({error:"Stripe inspection failed or timed out. No billing settings were changed. Check platform credentials and retry."},{status:502,headers:{"Cache-Control":"no-store"}});}
  await prisma.auditLog.create({data:{organizationId:params.id,action:"platform.billing.inspected",performedBy:(session.user as {id?:string}).id || "platform_admin",details:JSON.stringify({subscriptionId:result.subscription.id,checkedAt:result.checkedAt})}});
  return NextResponse.json(result,{headers:{"Cache-Control":"no-store"}});
}
