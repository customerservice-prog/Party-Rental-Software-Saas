import { prisma } from "@/lib/prisma";
import { getPlan, PlanLimits } from "@/lib/plans";

type OverrideRow={
  planCode:string;
  monthlyPrice:number|null;
  annualMonthlyPrice:number|null;
  trialDays:number|null;
  officeUsers:number|null;
  crewUsers:number|null;
  locations:number|null;
  isEnabled:boolean;
};

export async function getPlanOverride(code:string){
  const plan=getPlan(code);
  const rows=(await prisma.$queryRawUnsafe(
    `SELECT "planCode","monthlyPrice","annualMonthlyPrice","trialDays","officeUsers","crewUsers","locations","isEnabled"
     FROM "PlatformPlanOverride" WHERE "planCode"=$1 LIMIT 1`,
    plan.code
  )) as OverrideRow[];
  return rows[0]||null;
}

export async function getEffectivePlanLimits(code:string|null|undefined):Promise<PlanLimits>{
  const plan=getPlan(code);
  const override=await getPlanOverride(plan.code).catch(()=>null);
  if(!override)return plan.limits;
  return {
    officeUsers: override.officeUsers===null ? plan.limits.officeUsers : override.officeUsers,
    crewUsers: override.crewUsers===null ? plan.limits.crewUsers : override.crewUsers,
    locations: override.locations===null ? plan.limits.locations : override.locations,
  };
}

export async function getEffectivePlanCommercial(code:string|null|undefined){
  const plan=getPlan(code);
  const override=await getPlanOverride(plan.code).catch(()=>null);
  return {
    ...plan,
    monthlyPrice: override?.monthlyPrice ?? plan.monthlyPrice,
    annualMonthlyPrice: override?.annualMonthlyPrice ?? plan.annualMonthlyPrice,
    trialDays: override?.trialDays ?? 14,
    isEnabled: override?.isEnabled ?? true,
  };
}
