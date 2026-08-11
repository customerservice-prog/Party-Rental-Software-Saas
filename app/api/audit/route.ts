import { NextRequest, NextResponse } from "next/server";
import { requireCurrentOrganization } from "@/lib/tenant";
import { requireOwnerSession, authzErrorResponse } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

// Returns the most recent activity-log entries for the current organization.
// Owner-only: the activity log can reveal who changed what, so it is treated
// as account-level configuration data.
export async function GET(request: NextRequest) {
  try {
    const organization = await requireCurrentOrganization();
    await requireOwnerSession(organization.id);

    const logs = await prisma.auditLog.findMany({
      where: { organizationId: organization.id },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    const performerIds = Array.from(new Set(logs.map((l) => l.performedBy)));
    const users = await prisma.user.findMany({
      where: { id: { in: performerIds } },
      select: { id: true, username: true, name: true },
    });
    const nameById = new Map(users.map((u) => [u.id, u.name || u.username]));

    const entries = logs.map((l) => ({
      id: l.id,
      action: l.action,
      details: l.details,
      createdAt: l.createdAt,
      performedBy: nameById.get(l.performedBy) || "Unknown",
    }));

    return NextResponse.json({ entries });
  } catch (err) {
    return authzErrorResponse(err);
  }
}
