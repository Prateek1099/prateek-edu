import { requireActiveWorkspace } from "@/lib/require-role";
import { prisma } from "@/lib/prisma";
import QuickPracticeClient from "./QuickPracticeClient";

export const dynamic = "force-dynamic";

export default async function WorkspaceQuickPracticePage() {
  const user = await requireActiveWorkspace();

  const [practices, subjects, topics, bankQuestions] = await Promise.all([
    prisma.challenge.findMany({
      where: {
        workspaceId: user.workspaceId,
        type: "QUICK_PRACTICE"
      },
      include: {
        subject: { include: { qualification: { include: { board: true } } } },
        topic: true,
        _count: { select: { questions: true, assignments: true } }
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
    prisma.bankQuestion.findMany({
      where: {
        OR: [
          { workspaceId: null },
          { workspaceId: user.workspaceId }
        ]
      },
      select: {
        id: true,
        subjectId: true,
        topicId: true,
        difficulty: true
      }
    })
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
        <h1 className="text-3xl font-bold tracking-tight">Quick Practice</h1>
        <p className="text-muted-foreground mt-1">
          Rapid-fire assessments for exit tickets and quick reviews.
        </p>
      </div>
      <QuickPracticeClient
        practices={practices}
        subjectOptions={subjectOptions}
        topicOptions={topicOptions}
        bankQuestions={bankQuestions}
        workspaceId={user.workspaceId}
      />
    </div>
  );
}
