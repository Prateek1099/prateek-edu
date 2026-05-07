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

  const course = await prisma.course.create({
    data: {
      title: 'IGCSE Computer Science Masterclass',
      description: 'Comprehensive coverage of the entire IGCSE Computer Science syllabus including algorithms, programming, and theory. Comes with topical past papers and mark schemes.',
      price: 4999.0, // Price in INR
      subjectId: subject.id,
    },
  });

  console.log('Test course created:', course);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
