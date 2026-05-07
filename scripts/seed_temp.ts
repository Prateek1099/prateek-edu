import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  console.log("Seeding board data...");
  const board = await prisma.board.upsert({
    where: { name: 'cambridge' },
    update: {},
    create: { name: 'cambridge', title: 'Cambridge International' }
  });

  const qual = await prisma.qualification.upsert({
    where: { boardId_name: { boardId: board.id, name: 'igcse' } },
    update: {},
    create: { boardId: board.id, name: 'igcse', title: 'IGCSE' }
  });

  const subject = await prisma.subject.upsert({
    where: { qualificationId_slug: { qualificationId: qual.id, slug: 'computer-science-0478' } },
    update: {},
    create: {
      qualificationId: qual.id,
      code: '0478',
      name: 'Computer Science',
      slug: 'computer-science-0478'
    }
  });

  console.log('Seed success!', subject);
}

main().catch(console.error).finally(() => prisma.$disconnect());
