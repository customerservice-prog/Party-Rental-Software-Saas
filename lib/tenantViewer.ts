import {getPlatformAdminAccess} from '@/lib/admin';
import {platformAllows} from '@/lib/platformCapabilities';
import { cookies } from "next/headers";
import { prisma } from "./prisma";
import { SUPPORT_COOKIE, readSupportSessionDetails } from "./supportSession";

type AuthenticatedUser = { id?: string; role?: string; organizationId?: string; revoked?: boolean };

// Keep authentication as the platform admin, but evaluate tenant UI and API
// permissions as the selected real tenant user. Never write the tenant's role
// into the platform JWT or require their password.
export async function resolveTenantViewer(authenticated: AuthenticatedUser | undefined) {
 if(authenticated?.id && authenticated.role==='platform_admin'){const grant=await getPlatformAdminAccess(authenticated.id);if(!grant||!platformAllows(grant,'support'))return null;}

  if (!authenticated?.id || authenticated.revoked || authenticated.role === "revoked") return null;
  const isSupport = authenticated.role === "platform_admin";
  const support = isSupport ? readSupportSessionDetails((await cookies()).get(SUPPORT_COOKIE)?.value, authenticated.id) : null;
  if (isSupport && !support) return null;
  const user = await prisma.user.findFirst({
    where: {
      id: support?.userId ?? authenticated.id,
      organizationId: support?.organizationId ?? authenticated.organizationId,
      isActive: true,
      role: { in: ["owner", "staff"] },
    },
    select: {
      id: true, organizationId: true, name: true, username: true, role: true,
      forcePasswordReset: true, sessionVersion: true,
      tenantRole: { select: { name: true, permissions: true } },
      organization: { select: { status: true } },
    },
  });
  if (!user || (support && user.sessionVersion !== support.sessionVersion)) return null;
  return { ...user, actorId: authenticated.id, support };
}
