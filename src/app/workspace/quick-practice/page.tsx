import { requireActiveWorkspace } from "@/lib/require-role";
import { prisma } from "@/lib/prisma";
import QuickPracticeClient from "./QuickPracticeClient";
import { listActiveWorkspaceScopes } from "@/lib/workspace-academic-scope";

export const dynamic = "force-dynamic";

export default async function WorkspaceQuickPracticePage() {
  const user = await requireActiveWorkspace();
  const scopes = await listActiveWorkspaceScopes(user.workspaceId);
  const subjectIds = scopes.map((scope) => scope.subjectId);

  const [practices, subjects, topics, bankQuestions, assignmentClasses] = await Promise.all([
    prisma.challenge.findMany({
      where: {
        workspaceId: user.workspaceId,
        type: "QUICK_PRACTICE",
        subjectId: { in: subjectIds },
      },
      include: {
        subject: { include: { qualification: { include: { board: true } } } },
        topic: true,
        _count: { select: { questions: true, assignments: true } },
        assignmentBatches: {
          where: { status: "ACTIVE" },
          select: { _count: { select: { recipients: { where: { revokedAt: null } } } } },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    Promise.resolve(scopes.map((scope) => scope.subject)),
    prisma.topic.findMany({
      where: { subjectId: { in: subjectIds } },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.bankQuestion.findMany({
      where: {
        questionType: "MCQ",
        subjectId: { in: subjectIds },
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
    }),
    prisma.class.findMany({
      where: { workspaceId: user.workspaceId, status: "ACTIVE", subjectId: { in: subjectIds } },
      select: {
        id: true,
        name: true,
        subjectId: true,
        students: {
          where: { status: "ACTIVE" },
          select: { student: { select: { id: true, name: true, email: true } } },
        },
      },
      orderBy: { name: "asc" },
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
        <h1 className="text-3xl font-bold tracking-tight">Quick Practice</h1>
        <p className="text-muted-foreground mt-1">
          Rapid-fire assessments for exit tickets and quick reviews.
        </p>
      </div>
      {scopes.length === 0 ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-200">
          Your academic access has not been configured yet. Please contact the administrator.
        </div>
      ) : null}
      <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 px-4 py-3 text-sm text-blue-800 dark:text-blue-200">
        <span className="font-semibold">Published but private until assigned.</span>{" "}
        Students will see a practice only after you assign it to their class or account.
      </div>
      <QuickPracticeClient
        practices={practices.map((practice) => ({
          ...practice,
          assignedRecipientCount:
            practice._count.assignments +
            practice.assignmentBatches.reduce(
              (total, batch) => total + batch._count.recipients,
              0,
            ),
        }))}
        subjectOptions={subjectOptions}
        topicOptions={topicOptions}
        bankQuestions={bankQuestions}
        assignmentClasses={assignmentClasses.map((classOption) => ({
          ...classOption,
          students: classOption.students.map((membership) => membership.student),
        }))}
      />
    </div>
  );
}
