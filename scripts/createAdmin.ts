import { prisma } from '../src/lib/prisma';
import bcrypt from 'bcryptjs';

async function main() {
  const email = 'prateekparihar@example.com';
  const password = await bcrypt.hash('admin123', 10);

  const admin = await prisma.user.upsert({
    where: { email },
    update: {
      role: 'admin',
      password: password,
    },
    create: {
      email,
      name: 'Prateek Parihar',
      password: password,
      role: 'admin',
    },
  });

  console.log('Admin user created/updated:', admin);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
