import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "./auth";
import { prisma } from "./prisma";
import { PermissionCode, roleHasPermission } from "./permissions";
import { resolveTenantViewer } from "./tenantViewer";

// Minimal shape of the fields we stash on the session user in lib/auth.ts's
// jwt/session callbacks.
type SessionUser = {
  id: string;
  role: string;
  organizationId: string;
  effectiveUserId?: string;
};

// Thrown by the helpers below when a request is missing a valid session or
// lacks the required role. Route handlers should catch this and hand it to
// authzErrorResponse() to turn it into a proper HTTP response.
export class AuthzError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}

// Requires that the request comes from a signed-in user (owner OR staff)
// that belongs to the given tenant organization. This is the baseline check
// that every internal dashboard-only API route should perform before
// reading or writing tenant data - it stops anonymous/cross-tenant requests
// even though requireCurrentOrganization() alone only resolves which tenant
// a request is for, not who is making it.
export async function requireStaffSession(organizationId: string): Promise<SessionUser> {
  const session = await getServerSession(authOptions);
  const user = session?.user as (SessionUser & Record<string, unknown>) | undefined;

  if (!user || user.role === "revoked" || (user as any).revoked === true) {
    throw new AuthzError("Your session is no longer valid. Sign in again.", 401);
  }

  if (user.role === "platform_admin") {
    const viewer = await resolveTenantViewer(user);
    if (!viewer || viewer.organizationId !== organizationId) throw new AuthzError("Tenant view expired or is no longer available. Return to the platform console.", 401);
    if (viewer.organization.status === "suspended") throw new AuthzError("This tenant account is suspended.", 403);
    if (viewer.forcePasswordReset) throw new AuthzError("This user must change their temporary password before continuing.", 403);
    // id remains the real actor so existing audit writes identify the admin.
    return { id: user.id, effectiveUserId: viewer.id, role: viewer.role, organizationId };
  }

  if (user.organizationId !== organizationId) {
    throw new AuthzError("You must be signed in to do this.", 401);
  }

  const current = await prisma.user.findUnique({where:{id:user.id},select:{forcePasswordReset:true}});
  if (!current) throw new AuthzError("Your account is no longer available.", 401);
  if (current.forcePasswordReset) throw new AuthzError("Change your temporary password before continuing.", 403);

  return { id: user.id, role: user.role, organizationId: user.organizationId };
}

// Requires everything requireStaffSession() does, plus that the signed-in
// user's role is "owner". Use this for account-level configuration
// (branding, contract terms, coupons, deposit rules, staff accounts) that
// should not be editable by regular staff logins.
export async function requireOwnerSession(organizationId: string): Promise<SessionUser> {
  const user = await requireStaffSession(organizationId);
  if (user.role !== "owner") {
    throw new AuthzError("Only an account owner can do this.", 403);
  }
  return user;
}

// Converts an AuthzError into a NextResponse; re-throws anything else so
// unexpected errors still surface normally (e.g. to Next.js's error overlay
// or server logs) instead of being silently swallowed.
export function authzErrorResponse(err: unknown) {
  if (err instanceof AuthzError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  throw err;
}

// Requires everything requireStaffSession() does, plus that the signed-in
// user (owner OR staff with an assigned TenantRole) has the given
// permission code. Owners always pass. Staff must have a tenantRole whose
// permissions[] array includes the code.
export async function requirePermission(
  organizationId: string,
  code: PermissionCode
): Promise<SessionUser> {
  const user = await requireStaffSession(organizationId);
  if (user.role === "owner") return user;

  const dbUser = await prisma.user.findUnique({
    where: { id: user.effectiveUserId ?? user.id },
    include: { tenantRole: true },
  });
  const permissions = (dbUser?.tenantRole?.permissions as string[] | undefined) ?? [];
  if (!roleHasPermission(user.role, permissions, code)) {
    throw new AuthzError("You don't have permission to do this.", 403);
  }
  return user;
}
