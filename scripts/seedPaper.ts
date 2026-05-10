import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());
import { prisma } from '../src/lib/prisma';

async function main() {
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

  const cs = await prisma.subject.upsert({
    where: { qualificationId_slug: { qualificationId: qual.id, slug: 'computer-science-0478' } },
    update: {},
    create: {
      qualificationId: qual.id,
      code: '0478',
      name: 'Computer Science',
      slug: 'computer-science-0478'
    }
  });

  const ict = await prisma.subject.upsert({
    where: { qualificationId_slug: { qualificationId: qual.id, slug: 'ict-0417' } },
    update: {},
    create: {
      qualificationId: qual.id,
      code: '0417',
      name: 'Information & Communication Technology',
      slug: 'ict-0417'
    }
  });

  // Seed CS paper
  await prisma.paper.create({
    data: {
      subjectId: cs.id,
      year: 2023,
      paperNumber: 1,
      variant: 2,
      season: 'May/June',
      questionPdfUrl: 'https://pastpapers.papacambridge.com/directories/CAIE/CAIE-pastpapers/upload/0478_s23_qp_12.pdf',
      msPdfUrl: 'https://pastpapers.papacambridge.com/directories/CAIE/CAIE-pastpapers/upload/0478_s23_ms_12.pdf',
    },
  });

  // Seed ICT papers
  await prisma.paper.create({
    data: {
      subjectId: ict.id,
      year: 2023,
      paperNumber: 1,
      variant: 2,
      season: 'Feb/March',
      questionPdfUrl: '/papers/0417/MARCH%202023/0417_m23_qp_12.pdf',
      msPdfUrl: '/papers/0417/MARCH%202023/0417_m23_ms_12.pdf',
    },
  });
  
  await prisma.paper.create({
    data: {
      subjectId: ict.id,
      year: 2023,
      paperNumber: 2,
      variant: 1,
      season: 'Feb/March',
      questionPdfUrl: '/papers/0417/MARCH%202023/0417_m23_qp_21.pdf',
      msPdfUrl: '/papers/0417/MARCH%202023/0417_m23_ms_21.pdf',
    },
  });

  console.log('Test papers and subjects created!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
