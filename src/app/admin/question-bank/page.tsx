import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/require-role";
import AdminBankClient from "./AdminBankClient";

export const dynamic = "force-dynamic";

export default async function AdminBankPage() {
  await requireSuperAdmin();

  const [questions, subjects, topics] = await Promise.all([
    prisma.bankQuestion.findMany({
      include: {
        subject: { include: { qualification: { include: { board: true } } } },
        topic: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.subject.findMany({
      include: { qualification: { include: { board: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.topic.findMany({
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  const subjectOptions = subjects.map((s) => ({
    id: s.id,
    name: s.name,
    label: s.code
      ? `${s.name} (${s.code}) · ${s.qualification.title} · ${s.qualification.board.title}`
      : `${s.name} · ${s.qualification.title} · ${s.qualification.board.title}`,
    board: s.qualification.board.name,
    boardId: s.qualification.board.id,
    boardTitle: s.qualification.board.title,
    qualificationId: s.qualification.id,
    qualificationTitle: s.qualification.title,
  }));

  const topicOptions = topics.map((t) => ({
    id: t.id,
    label: t.topicName,
    subjectId: t.subjectId,
  }));

  return (
    <div className="space-y-8 max-w-7xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Question Bank</h1>
        <p className="text-muted-foreground mt-1">
          Create and review mixed question types for Vexa assessments and printable papers.
        </p>
      </div>
      <AdminBankClient
        initialQuestions={questions}
        subjectOptions={subjectOptions}
        topicOptions={topicOptions}
      />
    </div>
  );
}
