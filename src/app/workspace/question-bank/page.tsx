import { requireActiveWorkspace } from "@/lib/require-role";
import { prisma } from "@/lib/prisma";
import BankClient from "./BankClient";

export const dynamic = "force-dynamic";

export default async function WorkspaceBankPage() {
  const user = await requireActiveWorkspace();

  const [questions, subjects, topics] = await Promise.all([
    prisma.bankQuestion.findMany({
      where: {
        OR: [
          { workspaceId: null },
          { workspaceId: user.workspaceId }
        ]
      },
      include: {
        subject: { include: { qualification: { include: { board: true } } } },
        topic: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    // Only fetch subjects linked to the teacher's active classes, or all subjects if preferred
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
    label: s.code
      ? `${s.name} (${s.code}) · ${s.qualification.title} · ${s.qualification.board.title}`
      : `${s.name} · ${s.qualification.title} · ${s.qualification.board.title}`,
    board: s.qualification.board.name,
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
          The central repository for your questions and the official Vexa question bank.
        </p>
      </div>
      <BankClient
        initialQuestions={questions}
        subjectOptions={subjectOptions}
        topicOptions={topicOptions}
        workspaceId={user.workspaceId}
      />
    </div>
  );
}
