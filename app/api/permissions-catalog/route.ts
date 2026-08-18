import { NextResponse } from "next/server";
import { requireCurrentOrganization } from "@/lib/tenant";
import { requireOwnerSession, authzErrorResponse } from "@/lib/authz";
import { PERMISSION_CATALOG } from "@/lib/permissions";

// Exposes the permission catalog to the dashboard so the Roles UI can
// render checkboxes without hardcoding the list client-side. Owner-only,
// same as the roles management endpoints it supports.

export async function GET() {
  const organization = await requireCurrentOrganization();
  try {
    await requireOwnerSession(organization.id);
  } catch (err) {
    return authzErrorResponse(err);
  }

  return NextResponse.json({ catalog: PERMISSION_CATALOG });
}
