import 'dotenv/config';
import { prisma } from '../src/lib/prisma';

async function main() {
  console.log('Fetching existing questions...');
  
  // Find all questions that don't have a bankQuestionId linked yet
  const questions = await prisma.question.findMany({
    where: { bankQuestionId: null },
    include: { challenge: true },
  });

  console.log(`Found ${questions.length} questions to migrate.`);

  let migratedCount = 0;

  for (const q of questions) {
    if (!q.challenge.subjectId) {
      console.warn(`Skipping question ${q.id} due to missing subjectId in challenge`);
      continue;
    }

    try {
      // Use transaction to ensure both bank question creation and question update happen atomically
      await prisma.$transaction(async (tx) => {
        // 1. Create the bank question
        const bankQuestion = await tx.bankQuestion.create({
          data: {
            subjectId: q.challenge.subjectId,
            topicId: q.challenge.topicId,
            questionText: q.questionText,
            optionA: q.optionA,
            optionB: q.optionB,
            optionC: q.optionC,
            optionD: q.optionD,
            correctAnswer: q.correctAnswer,
            explanation: q.explanation,
            topicTag: q.topicTag,
            difficulty: q.difficulty || "medium",
            marks: q.marks || 1,
          },
        });

        // 2. Link the new bank question to the existing question
        await tx.question.update({
          where: { id: q.id },
          data: { bankQuestionId: bankQuestion.id },
        });
      });

      migratedCount++;
      if (migratedCount % 100 === 0) {
        console.log(`Migrated ${migratedCount}/${questions.length} questions...`);
      }
    } catch (error) {
      console.error(`Error migrating question ${q.id}:`, error);
    }
  }

  console.log(`Successfully migrated ${migratedCount} questions into the bank.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    // Note: since pool might still be active, we disconnect prisma and force exit if needed.
    await prisma.$disconnect();
    process.exit(0);
  });
