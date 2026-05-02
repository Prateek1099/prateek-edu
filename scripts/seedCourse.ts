import { prisma } from '../src/lib/prisma';

async function main() {
  const course = await prisma.course.create({
    data: {
      title: 'IGCSE Computer Science Masterclass',
      description: 'Comprehensive coverage of the entire IGCSE Computer Science syllabus including algorithms, programming, and theory. Comes with topical past papers and mark schemes.',
      price: 4999.0, // Price in INR
      level: 'IGCSE',
      subject: 'Computer Science',
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
