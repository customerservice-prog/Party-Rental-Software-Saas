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
}

main().catch((err) => { console.error(err); process.exit(1); }).finally(async () => prisma.$disconnect());
