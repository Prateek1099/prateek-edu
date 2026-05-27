const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Seeding subscription plans...");

  await prisma.subscriptionPlan.upsert({
    where: { name: 'Monthly Premium' },
    update: {},
    create: {
      name: 'Monthly Premium',
      price: 299,
      maxDevices: 2,
      aiQuota: 50,
      isActive: true,
    },
  });

  await prisma.subscriptionPlan.upsert({
    where: { name: 'Yearly Premium' },
    update: {},
    create: {
      name: 'Yearly Premium',
      price: 2499,
      maxDevices: 4,
      aiQuota: 600,
      isActive: true,
    },
  });

  console.log("Seeding completed successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
