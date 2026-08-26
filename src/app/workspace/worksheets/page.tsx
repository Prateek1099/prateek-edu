import { requireActiveWorkspace } from "@/lib/require-role";
import { prisma } from "@/lib/prisma";
import WorksheetsClient from "./WorksheetsClient";

export const dynamic = "force-dynamic";

export default async function WorkspaceWorksheetsPage() {
  const user = await requireActiveWorkspace();

  const [worksheets, subjects, topics, bankQuestions, assignmentClasses] = await Promise.all([
    prisma.challenge.findMany({
      where: {
        workspaceId: user.workspaceId,
        type: "WORKSHEET"
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
    prisma.subject.findMany({
      include: { qualification: { include: { board: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.topic.findMany({
      orderBy: { sortOrder: "asc" },
    }),
    prisma.bankQuestion.findMany({
      where: {
        questionType: "MCQ",
        OR: [
          { workspaceId: null },
          { workspaceId: user.workspaceId }
        ]
      },
      include: {
        subject: { select: { id: true, name: true } },
        topic: { select: { id: true, topicName: true } }
      },
      orderBy: { createdAt: "desc" }
    }),
    prisma.class.findMany({
      where: { workspaceId: user.workspaceId, status: "ACTIVE" },
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
        <h1 className="text-3xl font-bold tracking-tight">Worksheets</h1>
        <p className="text-muted-foreground mt-1">
          Create, manage, and assign worksheets to your classes.
        </p>
      </div>
      <WorksheetsClient
        worksheets={worksheets.map((worksheet) => ({
          ...worksheet,
          assignedRecipientCount:
            worksheet._count.assignments +
            worksheet.assignmentBatches.reduce(
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
