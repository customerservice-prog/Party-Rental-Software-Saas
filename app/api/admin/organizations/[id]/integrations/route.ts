import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { inspectTenantConnections } from "@/lib/adminIntegrationChecks";
export const dynamic = "force-dynamic";
export async function POST(request:Request,{params}:{params:{id:string}}) {
  const session = await requirePlatformAdmin();
  // Same-origin UI only. Do not let an external site trigger authenticated provider traffic.
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return NextResponse.json({error:"Cross-origin checks are not allowed."},{status:403});
  const tenant = await prisma.organization.findFirst({where:{id:params.id,slug:{not:"_platform_internal"}},select:{id:true,stripeAccountId:true,resendApiKey:true,senderEmail:true,twilioAccountSid:true,twilioAuthToken:true,twilioFromNumber:true,customDomain:true}});
  if (!tenant) return NextResponse.json({error:"Tenant not found."},{status:404});
  const checks = await inspectTenantConnections(tenant,{fetch,stripeConfigured:Boolean(process.env.STRIPE_SECRET_KEY),account:id=>stripe.accounts.retrieve(id,{},{timeout:8000,maxNetworkRetries:0})});
  const checkedAt = new Date().toISOString();
  await prisma.auditLog.create({data:{organizationId:tenant.id,action:"platform.integration.checked",performedBy:(session.user as {id?:string}).id || "platform_admin",details:JSON.stringify({checkedAt,checks})}});
  return NextResponse.json({checkedAt,checks},{headers:{"Cache-Control":"no-store"}});
}
