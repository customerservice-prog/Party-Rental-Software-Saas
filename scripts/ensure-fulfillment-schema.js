const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "RentalFulfillment" (
      "id" TEXT PRIMARY KEY,
      "organizationId" TEXT NOT NULL,
      "orderId" TEXT NOT NULL UNIQUE,
      "status" TEXT NOT NULL DEFAULT 'preparing',
      "proofName" TEXT,
      "proofSignature" TEXT,
      "proofPhotoUrl" TEXT,
      "notes" TEXT,
      "loadedAt" TIMESTAMP(3),
      "deliveredAt" TIMESTAMP(3),
      "returnedAt" TIMESTAMP(3),
      "completedAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "RentalFulfillment_organizationId_idx" ON "RentalFulfillment" ("organizationId")`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "RentalFulfillment_orderId_idx" ON "RentalFulfillment" ("orderId")`);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "RentalFulfillmentItem" (
      "id" TEXT PRIMARY KEY,
      "fulfillmentId" TEXT NOT NULL,
      "orderItemId" TEXT NOT NULL UNIQUE,
      "expectedQty" INTEGER NOT NULL DEFAULT 0,
      "loadedQty" INTEGER NOT NULL DEFAULT 0,
      "returnedQty" INTEGER NOT NULL DEFAULT 0,
      "damagedQty" INTEGER NOT NULL DEFAULT 0,
      "missingQty" INTEGER NOT NULL DEFAULT 0,
      "notes" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "RentalFulfillmentItem_fulfillmentId_idx" ON "RentalFulfillmentItem" ("fulfillmentId")`);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "RentalFulfillmentEvent" (
      "id" TEXT PRIMARY KEY,
      "organizationId" TEXT NOT NULL,
      "orderId" TEXT NOT NULL,
      "fulfillmentId" TEXT,
      "orderItemId" TEXT,
      "itemUnitId" TEXT,
      "type" TEXT NOT NULL,
      "quantity" INTEGER,
      "notes" TEXT,
      "performedBy" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "RentalFulfillmentEvent_org_order_idx" ON "RentalFulfillmentEvent" ("organizationId", "orderId", "createdAt")`);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "CustomerContact" (
      "id" TEXT PRIMARY KEY,
      "organizationId" TEXT NOT NULL,
      "customerId" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "relationship" TEXT,
      "email" TEXT,
      "phone" TEXT,
      "address" TEXT,
      "isPrimary" BOOLEAN NOT NULL DEFAULT FALSE,
      "notes" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "CustomerContact_org_customer_idx" ON "CustomerContact" ("organizationId", "customerId")`);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "StoreCredit" (
      "id" TEXT PRIMARY KEY,
      "organizationId" TEXT NOT NULL,
      "customerId" TEXT NOT NULL,
      "sourceOrderId" TEXT,
      "type" TEXT NOT NULL DEFAULT 'store_credit',
      "originalAmount" DOUBLE PRECISION NOT NULL,
      "remainingAmount" DOUBLE PRECISION NOT NULL,
      "reason" TEXT,
      "expiresAt" TIMESTAMP(3),
      "status" TEXT NOT NULL DEFAULT 'active',
      "createdBy" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "StoreCredit_org_customer_idx" ON "StoreCredit" ("organizationId", "customerId", "status")`);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "StoreCreditTransaction" (
      "id" TEXT PRIMARY KEY,
      "organizationId" TEXT NOT NULL,
      "creditId" TEXT NOT NULL,
      "customerId" TEXT NOT NULL,
      "orderId" TEXT,
      "type" TEXT NOT NULL,
      "amount" DOUBLE PRECISION NOT NULL,
      "notes" TEXT,
      "performedBy" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "StoreCreditTransaction_credit_idx" ON "StoreCreditTransaction" ("creditId", "createdAt")`);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "StaffShift" (
      "id" TEXT PRIMARY KEY,
      "organizationId" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "orderId" TEXT,
      "roleLabel" TEXT,
      "startAt" TIMESTAMP(3) NOT NULL,
      "endAt" TIMESTAMP(3) NOT NULL,
      "location" TEXT,
      "notes" TEXT,
      "status" TEXT NOT NULL DEFAULT 'scheduled',
      "createdBy" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "StaffShift_org_start_idx" ON "StaffShift" ("organizationId", "startAt")`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "StaffShift_user_start_idx" ON "StaffShift" ("userId", "startAt")`);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "TimeClockEntry" (
      "id" TEXT PRIMARY KEY,
      "organizationId" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "shiftId" TEXT,
      "clockInAt" TIMESTAMP(3) NOT NULL,
      "clockOutAt" TIMESTAMP(3),
      "notes" TEXT,
      "createdBy" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "TimeClockEntry_org_clock_idx" ON "TimeClockEntry" ("organizationId", "clockInAt")`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "TimeClockEntry_user_clock_idx" ON "TimeClockEntry" ("userId", "clockInAt")`);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "TimeOffRequest" (
      "id" TEXT PRIMARY KEY,
      "organizationId" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "startDate" TIMESTAMP(3) NOT NULL,
      "endDate" TIMESTAMP(3) NOT NULL,
      "reason" TEXT,
      "status" TEXT NOT NULL DEFAULT 'pending',
      "reviewedBy" TEXT,
      "reviewedAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "TimeOffRequest_org_dates_idx" ON "TimeOffRequest" ("organizationId", "startDate", "endDate")`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "TimeOffRequest_user_idx" ON "TimeOffRequest" ("userId", "status")`);

  // Package/bundle components. A package remains a normal Item for pricing
  // and storefront display, while these rows define the physical inventory
  // it consumes. One-level packages only; API validation prevents cycles.
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "PackageComponent" (
      "id" TEXT PRIMARY KEY,
      "organizationId" TEXT NOT NULL,
      "packageItemId" TEXT NOT NULL,
      "componentItemId" TEXT NOT NULL,
      "quantity" INTEGER NOT NULL DEFAULT 1,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "PackageComponent_positive_qty" CHECK ("quantity" > 0)
    )
  `);
  await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "PackageComponent_package_component_unique" ON "PackageComponent" ("organizationId","packageItemId","componentItemId")`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "PackageComponent_component_idx" ON "PackageComponent" ("organizationId","componentItemId")`);

  // Physical resource reconciliation for fulfillment. This expands virtual
  // packages into the actual items the warehouse must load and receive back.
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "RentalFulfillmentResource" (
      "id" TEXT PRIMARY KEY,
      "organizationId" TEXT NOT NULL,
      "fulfillmentId" TEXT NOT NULL,
      "orderId" TEXT NOT NULL,
      "itemId" TEXT NOT NULL,
      "expectedQty" INTEGER NOT NULL DEFAULT 0,
      "loadedQty" INTEGER NOT NULL DEFAULT 0,
      "returnedQty" INTEGER NOT NULL DEFAULT 0,
      "damagedQty" INTEGER NOT NULL DEFAULT 0,
      "missingQty" INTEGER NOT NULL DEFAULT 0,
      "notes" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "RentalFulfillmentResource_fulfillment_item_unique" ON "RentalFulfillmentResource" ("fulfillmentId","itemId")`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "RentalFulfillmentResource_org_order_idx" ON "RentalFulfillmentResource" ("organizationId","orderId")`);

  // Serialized assets scanned against a specific order. Historical rows stay
  // attached to that order after return; active cross-order conflicts are
  // prevented by the scan API, not by a global unique unit constraint.
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "RentalFulfillmentAsset" (
      "id" TEXT PRIMARY KEY,
      "organizationId" TEXT NOT NULL,
      "fulfillmentId" TEXT NOT NULL,
      "orderId" TEXT NOT NULL,
      "itemId" TEXT NOT NULL,
      "itemUnitId" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'loaded',
      "loadedAt" TIMESTAMP(3),
      "returnedAt" TIMESTAMP(3),
      "notes" TEXT,
      "performedBy" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "RentalFulfillmentAsset_order_unit_unique" ON "RentalFulfillmentAsset" ("orderId","itemUnitId")`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "RentalFulfillmentAsset_unit_status_idx" ON "RentalFulfillmentAsset" ("organizationId","itemUnitId","status")`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "RentalFulfillmentAsset_order_idx" ON "RentalFulfillmentAsset" ("organizationId","orderId","createdAt")`);

  // Quantity-only inventory exceptions created by return reconciliation.
  // This handles non-serialized stock (chairs, tables, linens, etc.) without
  // blocking an entire catalog item when only a few units are damaged/missing.
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "InventoryQuantityException" (
      "id" TEXT PRIMARY KEY,
      "organizationId" TEXT NOT NULL,
      "itemId" TEXT NOT NULL,
      "orderId" TEXT,
      "fulfillmentId" TEXT,
      "resourceId" TEXT,
      "type" TEXT NOT NULL,
      "quantity" INTEGER NOT NULL DEFAULT 0,
      "status" TEXT NOT NULL DEFAULT 'open',
      "notes" TEXT,
      "createdBy" TEXT,
      "resolvedBy" TEXT,
      "resolvedAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "InventoryQuantityException_positive_qty" CHECK ("quantity" >= 0)
    )
  `);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "InventoryQuantityException_org_item_status_idx" ON "InventoryQuantityException" ("organizationId","itemId","status")`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "InventoryQuantityException_org_order_idx" ON "InventoryQuantityException" ("organizationId","orderId","createdAt")`);
  await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "InventoryQuantityException_resource_type_open_unique" ON "InventoryQuantityException" ("resourceId","type") WHERE "status"='open' AND "resourceId" IS NOT NULL`);

  // Platform-admin control-center tables. Kept additive/raw so tenant
  // business schema remains backward compatible.
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "TenantSupportNote" (
      "id" TEXT PRIMARY KEY,
      "organizationId" TEXT NOT NULL,
      "body" TEXT NOT NULL,
      "createdBy" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "TenantSupportNote_org_created_idx" ON "TenantSupportNote" ("organizationId","createdAt" DESC)`);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "PlatformFeatureFlag" (
      "id" TEXT PRIMARY KEY,
      "key" TEXT NOT NULL UNIQUE,
      "label" TEXT NOT NULL,
      "description" TEXT,
      "enabledGlobally" BOOLEAN NOT NULL DEFAULT FALSE,
      "planTiers" JSONB NOT NULL DEFAULT '[]'::jsonb,
      "organizationIds" JSONB NOT NULL DEFAULT '[]'::jsonb,
      "createdBy" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "PlatformAnnouncement" (
      "id" TEXT PRIMARY KEY,
      "title" TEXT NOT NULL,
      "body" TEXT NOT NULL,
      "tone" TEXT NOT NULL DEFAULT 'info',
      "audienceType" TEXT NOT NULL DEFAULT 'all',
      "audienceValue" TEXT,
      "status" TEXT NOT NULL DEFAULT 'draft',
      "startsAt" TIMESTAMP(3),
      "endsAt" TIMESTAMP(3),
      "createdBy" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "PlatformAnnouncement_status_window_idx" ON "PlatformAnnouncement" ("status","startsAt","endsAt")`);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "PlatformSetting" (
      "key" TEXT PRIMARY KEY,
      "value" JSONB NOT NULL,
      "updatedBy" TEXT,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "PlatformPlanOverride" (
      "planCode" TEXT PRIMARY KEY,
      "monthlyPrice" DOUBLE PRECISION,
      "annualMonthlyPrice" DOUBLE PRECISION,
      "trialDays" INTEGER,
      "officeUsers" INTEGER,
      "crewUsers" INTEGER,
      "locations" INTEGER,
      "isEnabled" BOOLEAN NOT NULL DEFAULT TRUE,
      "updatedBy" TEXT,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // External payment reference makes Stripe/webhook processing idempotent.
  // This is additive and nullable so existing payment rows remain valid.
  await prisma.$executeRawUnsafe(`ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "externalReference" TEXT`);
  await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "Payment_org_external_ref_unique" ON "Payment" ("organizationId", "externalReference") WHERE "externalReference" IS NOT NULL`);

  // Secure customer-facing order portal. Only a SHA-256 token hash is stored;
  // the raw link token is returned once to authenticated tenant staff.
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "CustomerPortalAccess" (
      "id" TEXT PRIMARY KEY,
      "organizationId" TEXT NOT NULL,
      "orderId" TEXT NOT NULL,
      "tokenHash" TEXT NOT NULL UNIQUE,
      "createdBy" TEXT,
      "expiresAt" TIMESTAMP(3) NOT NULL,
      "revokedAt" TIMESTAMP(3),
      "lastViewedAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "CustomerPortalAccess_org_order_idx" ON "CustomerPortalAccess" ("organizationId", "orderId", "createdAt")`);
}

main().catch((err) => { console.error(err); process.exit(1); }).finally(async () => prisma.$disconnect());
