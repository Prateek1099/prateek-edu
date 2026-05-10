import type { PrismaClient } from "@prisma/client";
import { IGCSE_ICT_0417_TOPIC_ORDER } from "../../src/lib/syllabus/igcse-ict-0417-topics";

export async function syncIgcseIct0417TopicsForSubject(
  prisma: PrismaClient,
  subjectId: string
): Promise<{ created: number; updated: number }> {
  let created = 0;
  let updated = 0;

  for (let i = 0; i < IGCSE_ICT_0417_TOPIC_ORDER.length; i++) {
    const topicName = IGCSE_ICT_0417_TOPIC_ORDER[i]!;
    const sortOrder = i + 1;

    const existing = await prisma.topic.findFirst({
      where: { subjectId, topicName },
    });

    if (existing) {
      await prisma.topic.update({
        where: { id: existing.id },
        data: { sortOrder },
      });
      updated++;
    } else {
      await prisma.topic.create({
        data: {
          subjectId,
          topicName,
          sortOrder,
        },
      });
      created++;
    }
  }

  return { created, updated };
}
