const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const username = (process.env.PLATFORM_ADMIN_USERNAME || "").trim();
  const password = process.env.PLATFORM_ADMIN_PASSWORD || "";
  const name = (process.env.PLATFORM_ADMIN_NAME || "Platform Administrator").trim();

  if (!username || !password) {
    console.log("Platform admin bootstrap skipped: PLATFORM_ADMIN_USERNAME / PLATFORM_ADMIN_PASSWORD not set.");
    return;
  }
  if (password.length < 12) {
    throw new Error("PLATFORM_ADMIN_PASSWORD must be at least 12 characters.");
  }

  let platformOrg = await prisma.organization.findUnique({
    where: { slug: "_platform_internal" },
  });
  if (!platformOrg) {
    platformOrg = await prisma.organization.create({
      data: { name: "Party Rental CRM Platform", slug: "_platform_internal", status: "active" },
    });
  }

  const existing = await prisma.user.findFirst({
    where: { role: "platform_admin" },
    orderBy: { createdAt: "asc" },
  });

  if (existing) {
    console.log("Platform admin already exists; preserving account credentials and security settings.");
  } else {
    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.user.create({
      data: {
        organizationId: platformOrg.id,
        username,
        name,
        password: passwordHash,
        role: "platform_admin",
      },
    });
    console.log("Platform admin created from environment variables.");
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
