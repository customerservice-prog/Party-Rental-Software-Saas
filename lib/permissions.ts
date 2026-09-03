// Central catalog of permission codes used across the dashboard. Each
// TenantRole stores a subset of these codes (see prisma/schema.prisma).
// Owners always have every permission implicitly and never need to be
// assigned a TenantRole - this catalog only governs staff logins.

export const PERMISSION_CATALOG = [
  { code: "orders.view", label: "View orders", group: "Orders" },
  { code: "orders.manage", label: "Create / edit / cancel orders", group: "Orders" },
  { code: "orders.export", label: "Export orders (CSV)", group: "Orders" },
  { code: "customers.view", label: "View customers", group: "Customers" },
  { code: "customers.manage", label: "Create / edit customers", group: "Customers" },
  { code: "customers.message", label: "Send messages to customers", group: "Customers" },
  { code: "do_not_rent.manage", label: "Manage do-not-rent restrictions", group: "Customers" },
  { code: "inventory.view", label: "View items & categories", group: "Inventory" },
  { code: "inventory.manage", label: "Create / edit items & categories", group: "Inventory" },
  { code: "drivers.view", label: "View drivers & deliveries", group: "Dispatch" },
  { code: "drivers.manage", label: "Assign drivers / manage dispatch", group: "Dispatch" },
  { code: "reports.view", label: "View reports", group: "Reports" },
  { code: "coupons.manage", label: "Manage coupons & deposit rules", group: "Settings" },
  { code: "pages.manage", label: "Manage website pages & branding", group: "Settings" },
  { code: "staff.manage", label: "Manage staff accounts & roles", group: "Settings" },
  { code: "billing.manage", label: "Manage subscription & billing", group: "Settings" },
  ] as const;

export type PermissionCode = (typeof PERMISSION_CATALOG)[number]["code"];

export const ALL_PERMISSION_CODES: readonly string[] = PERMISSION_CATALOG.map((p) => p.code);

export function isValidPermissionCode(code: string): code is PermissionCode {
    return (ALL_PERMISSION_CODES as string[]).includes(code);
}

// Owners implicitly have every permission. Staff need an assigned
// TenantRole whose permissions[] array includes the code being checked.
export function roleHasPermission(
    userRole: string,
    tenantRolePermissions: string[] | null | undefined,
    code: PermissionCode
  ): boolean {
    if (userRole === "owner") return true;
    if (!tenantRolePermissions) return false;
    return tenantRolePermissions.includes(code);
}
