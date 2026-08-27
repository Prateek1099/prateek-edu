import { requireActiveWorkspace } from "@/lib/require-role";
import { prisma } from "@/lib/prisma";
import BankClient from "./BankClient";
import { listActiveWorkspaceScopes } from "@/lib/workspace-academic-scope";

export const dynamic = "force-dynamic";

export default async function WorkspaceBankPage() {
  const user = await requireActiveWorkspace();
  const scopes = await listActiveWorkspaceScopes(user.workspaceId);
  const subjectIds = scopes.map((scope) => scope.subjectId);

  const [questions, subjects, topics] = await Promise.all([
    prisma.bankQuestion.findMany({
      where: {
        questionType: "MCQ",
        subjectId: { in: subjectIds },
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
    Promise.resolve(scopes.map((scope) => scope.subject)),
    prisma.topic.findMany({
      where: { subjectId: { in: subjectIds } },
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
      {scopes.length === 0 ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-200">
          Your academic access has not been configured yet. Please contact the administrator.
        </div>
      ) : null}
      <BankClient
        initialQuestions={questions}
        subjectOptions={subjectOptions}
        topicOptions={topicOptions}
        workspaceId={user.workspaceId}
      />
    </div>
  );
}
