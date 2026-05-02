import { prisma } from '../src/lib/prisma';

async function main() {
  const paper = await prisma.paper.create({
    data: {
      subject: 'IGCSE Computer Science',
      level: 'IGCSE',
      year: 2023,
      paperNumber: 1,
      variant: 2,
      questionPdfUrl: 'https://pastpapers.papacambridge.com/directories/CAIE/CAIE-pastpapers/upload/0478_s23_qp_12.pdf',
      msPdfUrl: 'https://pastpapers.papacambridge.com/directories/CAIE/CAIE-pastpapers/upload/0478_s23_ms_12.pdf',
    },
  });

  console.log('Test paper created:', paper);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
