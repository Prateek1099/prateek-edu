// CBSE Seed Script
// Run with: npx tsx prisma/seed-cbse.ts

import { prisma } from "../src/lib/prisma";

const CBSE_DATA = {
  board: { name: "cbse", title: "CBSE Board" },
  classes: [
    {
      name: "class-9",
      title: "Class 9",
      subjects: [
        { name: "Computer Applications", slug: "computer-applications" },
      ],
    },
    {
      name: "class-10",
      title: "Class 10",
      subjects: [
        { name: "Computer Applications", slug: "computer-applications" },
      ],
    },
    {
      name: "class-11",
      title: "Class 11",
      subjects: [
        { name: "Computer Science", slug: "computer-science" },
        { name: "Informatics Practices", slug: "informatics-practices" },
      ],
    },
    {
      name: "class-12",
      title: "Class 12",
      subjects: [
        { name: "Computer Science", slug: "computer-science" },
        { name: "Informatics Practices", slug: "informatics-practices" },
      ],
    },
  ],
};

async function main() {
  console.log("🏫 Seeding CBSE ecosystem...\n");

  // 1. Upsert the CBSE board
  const board = await prisma.board.upsert({
    where: { name: CBSE_DATA.board.name },
    update: { title: CBSE_DATA.board.title },
    create: { name: CBSE_DATA.board.name, title: CBSE_DATA.board.title },
  });
  console.log(`✅ Board: ${board.title} (${board.id})`);

  // 2. For each class, upsert qualification and subjects
  for (const cls of CBSE_DATA.classes) {
    const qualification = await prisma.qualification.upsert({
      where: { boardId_name: { boardId: board.id, name: cls.name } },
      update: { title: cls.title },
      create: { boardId: board.id, name: cls.name, title: cls.title },
    });
    console.log(`  📚 ${qualification.title} (${qualification.id})`);

    for (const subj of cls.subjects) {
      const subject = await prisma.subject.upsert({
        where: {
          qualificationId_slug: {
            qualificationId: qualification.id,
            slug: subj.slug,
          },
        },
        update: { name: subj.name },
        create: {
          qualificationId: qualification.id,
          name: subj.name,
          slug: subj.slug,
        },
      });
      console.log(`    📖 ${subject.name} → /resources/cbse/${cls.name}/${subj.slug}`);
    }
  }

  console.log("\n🎉 CBSE ecosystem seeded successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
