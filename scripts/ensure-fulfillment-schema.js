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
}

main().catch((err) => { console.error(err); process.exit(1); }).finally(async () => prisma.$disconnect());
