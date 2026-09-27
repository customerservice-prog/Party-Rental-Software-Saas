import { requireCurrentOrganization } from "@/lib/tenant";
import { requireStaffSession } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { MARKETPLACE_APPS, marketplacePriceCents } from "@/lib/appMarketplace";
import { getEffectivePlanCommercial } from "@/lib/platformPlans";
import MarketplaceClient from "./MarketplaceClient";

export default async function AppsPage(){
  const organization=await requireCurrentOrganization();
  const actor=await requireStaffSession(organization.id);
  const [subscription,installations]=await Promise.all([
    prisma.platformSubscription.findUnique({where:{organizationId:organization.id}}),
    prisma.tenantAppInstallation.findMany({where:{organizationId:organization.id}}),
  ]);
  const interval=subscription?.billingInterval==="annual"?"annual":"monthly";
  const commercial=await getEffectivePlanCommercial(subscription?.planTier||organization.planTier);
  const configured=interval==="annual"?commercial.annualMonthlyPrice:commercial.monthlyPrice;
  const baseRecurringCents=configured==null?null:Math.round(configured*(interval==="annual"?12:1)*100);
  const byCode=new Map(installations.map(row=>[row.appCode,row]));
  const activeAppsCents=installations.filter(row=>row.status==="active").reduce((sum,row)=>sum+row.priceCents,0);
  const apps=MARKETPLACE_APPS.map(app=>{
    const installation=byCode.get(app.code);
    const priceCents=marketplacePriceCents(app,interval);
    return {
      ...app,
      priceCents,
      installation:installation?{
        status:installation.status,
        priceCents:installation.priceCents,
        externalTenantSlug:installation.externalTenantSlug,
        errorMessage:installation.errorMessage,
      }:null,
      recurringAfterInstallCents:baseRecurringCents==null?null:baseRecurringCents+activeAppsCents+(installation?.status==="active"?0:priceCents),
    };
  });
  return <div className="friendly-admin-page is-wide">
    <div className="friendly-admin-head"><div><h1>Apps & Add-ons</h1><p>Discover tools that can be connected to this rental business and its website.</p></div></div>
    <MarketplaceClient apps={apps} canManage={actor.role==="owner"} interval={interval} linkedBilling={Boolean(subscription?.stripeSubId)} currentRecurringCents={baseRecurringCents==null?null:baseRecurringCents+activeAppsCents} renewalDate={subscription?.currentPeriodEnd?.toISOString()||null}/>
  </div>;
}
