import { requireActiveWorkspace } from "@/lib/require-role";
import { prisma } from "@/lib/prisma";
import QuickPracticeClient from "./QuickPracticeClient";
import { listActiveWorkspaceScopes } from "@/lib/workspace-academic-scope";
import { countPracticeSetAssignmentUsage } from "@/lib/human-ui-density-rules";

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
        _count: {
          select: {
            questions: true,
            assignments: {
              where: {
                user: {
                  classEnrollments: {
                    some: {
                      status: "ACTIVE",
                      class: {
                        workspaceId: user.workspaceId,
                        status: "ACTIVE",
                        workspace: { status: "ACTIVE" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        assignmentBatches: {
          where: {
            status: "ACTIVE",
            class: { workspaceId: user.workspaceId, status: "ACTIVE" },
          },
          select: {
            classId: true,
            class: {
              select: {
                name: true,
                students: {
                  where: { status: "ACTIVE" },
                  select: { studentId: true },
                },
              },
            },
            recipients: {
              where: { revokedAt: null },
              select: { studentId: true },
            },
          },
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

  const practiceItems = practices.map((practice) => {
    const contexts = new Map<string, { classId: string; className: string; recipientCount: number }>();

    for (const batch of practice.assignmentBatches) {
      const activeStudentIds = new Set(batch.class.students.map((membership) => membership.studentId));
      const recipientCount = batch.recipients.filter((recipient) =>
        activeStudentIds.has(recipient.studentId),
      ).length;
      if (recipientCount === 0) continue;

      const current = contexts.get(batch.classId);
      contexts.set(batch.classId, {
        classId: batch.classId,
        className: batch.class.name,
        recipientCount: (current?.recipientCount ?? 0) + recipientCount,
      });
    }

    const assignmentContexts = [...contexts.values()];
    const assignedRecipientCount = countPracticeSetAssignmentUsage({
      validLegacyAssignmentCount: practice._count.assignments,
      assignmentContexts,
    });

    return {
      id: practice.id,
      title: practice.title,
      subjectId: practice.subjectId,
      topicId: practice.topicId,
      difficulty: practice.difficulty,
      estimatedTime: practice.estimatedTime,
      subject: { name: practice.subject.name },
      topic: practice.topic ? { topicName: practice.topic.topicName } : null,
      _count: { questions: practice._count.questions },
      assignmentContexts,
      assignedRecipientCount,
    };
  });

  return (
    <div className="space-y-8 max-w-7xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Practice sets</h1>
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
        practices={practiceItems}
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
