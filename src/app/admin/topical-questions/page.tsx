import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/require-role";

import AdminTopicalQuestionsClient from "./AdminTopicalQuestionsClient";

export const dynamic = "force-dynamic";

export default async function AdminTopicalQuestionsPage() {
  await requireSuperAdmin();

  const [resources, subjects] = await Promise.all([
    prisma.topicalQuestion.findMany({
      include: {
        subject: {
          include: { qualification: { include: { board: true } } },
        },
        topic: true,
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    }),
    prisma.subject.findMany({
      include: {
        qualification: { include: { board: true } },
        topics: { orderBy: [{ sortOrder: "asc" }, { topicName: "asc" }] },
      },
      orderBy: [
        { qualification: { board: { title: "asc" } } },
        { qualification: { title: "asc" } },
        { name: "asc" },
      ],
    }),
  ]);

  return (
    <AdminTopicalQuestionsClient
      resources={resources}
      subjects={subjects.map((subject) => ({
        id: subject.id,
        name: subject.name,
        code: subject.code,
        boardName: subject.qualification.board.name,
        boardTitle: subject.qualification.board.title,
        qualificationId: subject.qualification.id,
        qualificationTitle: subject.qualification.title,
        topics: subject.topics.map((topic) => ({
          id: topic.id,
          topicName: topic.topicName,
        })),
      }))}
    />
  );
}
