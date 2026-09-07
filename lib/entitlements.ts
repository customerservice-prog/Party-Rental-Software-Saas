// Server-side plan entitlement checks (seat limits). Client UI may hide or
// disable controls based on these, but the real enforcement has to happen
// here, since a hidden button in React is not authorization.
//
// These check the CURRENT plan tier stored on the Organization row against
// the real row counts in the database (User = office logins, Driver = crew
// or driver logins). See lib/plans.ts for what each plan includes.

import { prisma } from "./prisma";
import { getPlanLimits } from "./plans";

export interface SeatCheckResult {
    allowed: boolean;
    limit: number | null;
    current: number;
}

export async function canAddOfficeUser(
    organizationId: string,
    planTier: string | null | undefined
  ): Promise<SeatCheckResult> {
    const limits = getPlanLimits(planTier);
    if (limits.officeUsers === null) {
          return { allowed: true, limit: null, current: -1 };
    }
    const current = await prisma.user.count({ where: { organizationId } });
    return { allowed: current < limits.officeUsers, limit: limits.officeUsers, current };
}

export async function canAddCrewUser(
    organizationId: string,
    planTier: string | null | undefined
  ): Promise<SeatCheckResult> {
    const limits = getPlanLimits(planTier);
    if (limits.crewUsers === null) {
          return { allowed: true, limit: null, current: -1 };
    }
    const current = await prisma.driver.count({ where: { organizationId } });
    return { allowed: current < limits.crewUsers, limit: limits.crewUsers, current };
}

export function seatLimitMessage(kind: "office" | "crew", result: SeatCheckResult): string {
    const noun = kind === "office" ? "office user" : "crew or driver login";
    const plural = result.limit === 1 ? "" : "s";
    return (
          "Your current plan includes up to " +
          result.limit +
          " " +
          noun +
          plural +
          ". Upgrade your plan to add more."
        );
}
