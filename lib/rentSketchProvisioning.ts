type RentSketchTenant = {
  id: string;
  slug: string;
  name: string;
  embedKey: string;
  subscriptionPlan: string;
  subscriptionStatus: string;
  billingSource: string;
  externalCrmOrgId: string;
};

function config() {
  const baseUrl = String(process.env.RENTSKETCH_API_URL || "").replace(/\/$/, "");
  const key = String(process.env.RENTSKETCH_PROVISION_KEY || "");
  if (!baseUrl || !key) throw new Error("RENTSKETCH_NOT_CONFIGURED");
  return { baseUrl, key };
}

async function call(path: string, method: "GET" | "POST", body?: unknown) {
  const { baseUrl, key } = config();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(baseUrl + path, {
      method,
      cache: "no-store",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "x-party-rental-crm-key": key,
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const data = await response.json().catch(() => ({} as Record<string, unknown>));
    if (!response.ok) {
      const message = typeof (data as any).error === "string" ? (data as any).error : "RENTSKETCH_REQUEST_FAILED";
      throw new Error(message);
    }
    return data as any;
  } finally {
    clearTimeout(timeout);
  }
}

function rootDomain() {
  return String(process.env.NEXT_PUBLIC_ROOT_DOMAIN || "")
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");
}

export function tenantWebsiteOrigins(organization: { slug: string; customDomain?: string | null }) {
  const origins: string[] = [];
  if (organization.customDomain) {
    origins.push("https://" + organization.customDomain.replace(/^https?:\/\//, "").replace(/\/$/, ""));
  }
  const root = rootDomain();
  if (root) origins.push("https://" + organization.slug + "." + root);
  return Array.from(new Set(origins));
}

export async function provisionRentSketch(organization: {
  id: string;
  slug: string;
  name: string;
  contactEmail?: string | null;
  customDomain?: string | null;
}) {
  if (!organization.contactEmail) throw new Error("RENTSKETCH_CONTACT_EMAIL_REQUIRED");
  const origins = tenantWebsiteOrigins(organization);
  const result = await call("/api/internal/crm/provision", "POST", {
    organizationId: organization.id,
    tenantSlug: organization.slug,
    businessName: organization.name,
    contactEmail: organization.contactEmail,
    website: origins[0] || null,
    allowedOrigins: origins,
    plan: "pro",
  });
  return result.tenant as RentSketchTenant;
}

export async function activateRentSketch(organizationId: string) {
  const result = await call("/api/internal/crm/activate", "POST", { organizationId });
  return result.tenant as RentSketchTenant;
}

export async function deactivateRentSketch(organizationId: string) {
  const result = await call("/api/internal/crm/deactivate", "POST", { organizationId });
  return result.tenant as RentSketchTenant;
}
