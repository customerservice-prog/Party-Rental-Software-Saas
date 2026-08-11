import { prisma } from "@/lib/prisma";

// Best-effort activity logging. Writes an AuditLog row describing an action a
// signed-in user performed. This must never break the request it is attached
// to, so any failure (e.g. transient DB error) is swallowed and logged to the
// server console only.
export async function logActivity(params: {
  organizationId: string;
  performedBy: string;
  action: string;
  details?: string;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        organizationId: params.organizationId,
        performedBy: params.performedBy,
        action: params.action,
        details: params.details ?? null,
      },
    });
  } catch (err) {
    console.error("logActivity failed:", err);
  }
}
