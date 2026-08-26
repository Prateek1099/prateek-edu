import "server-only";

import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

type AssignmentDb = Prisma.TransactionClient | typeof prisma;

export async function syncLateJoinerAssignmentRecipients(
  db: AssignmentDb,
  classId: string,
  studentId: string,
  now = new Date(),
) {
  const batches = await db.workspaceAssignmentBatch.findMany({
    where: {
      classId,
      audience: "CLASS",
      includeLateJoiners: true,
      status: "ACTIVE",
      OR: [{ dueDate: null }, { dueDate: { gte: now } }],
    },
    select: { id: true },
  });

  if (batches.length === 0) return 0;

  const result = await db.workspaceAssignmentRecipient.createMany({
    data: batches.map((batch) => ({ batchId: batch.id, studentId })),
    skipDuplicates: true,
  });
  return result.count;
}

export type StudentAssignedWork = {
  id: string;
  source: "DURABLE" | "LEGACY";
  status: string;
  assignedAt: Date;
  dueDate: Date | null;
  className: string;
  workspaceName: string;
  challenge: {
    id: string;
    title: string;
    type: string;
    difficulty: string;
    questionCount: number;
    subject: {
      name: string;
      slug: string;
      qualificationName: string;
      boardName: string;
    };
  };
};

const challengeInclude = {
  subject: { include: { qualification: { include: { board: true } } } },
  _count: { select: { questions: true } },
} satisfies Prisma.ChallengeInclude;

export async function getStudentWorkspaceAssignments(
  userId: string,
  take?: number,
): Promise<StudentAssignedWork[]> {
  const memberships = await prisma.classStudent.findMany({
    where: {
      studentId: userId,
      status: "ACTIVE",
      class: { status: "ACTIVE", workspace: { status: "ACTIVE" } },
    },
    select: {
      class: {
        select: {
          name: true,
          workspaceId: true,
          workspace: { select: { name: true } },
        },
      },
    },
  });
  const workspaceMembership = new Map(
    memberships.map((membership) => [
      membership.class.workspaceId,
      { workspaceName: membership.class.workspace.name },
    ]),
  );

  const [recipients, legacyAssignments] = await Promise.all([
    prisma.workspaceAssignmentRecipient.findMany({
      where: {
        studentId: userId,
        revokedAt: null,
        batch: {
          status: "ACTIVE",
          workspace: { status: "ACTIVE" },
          class: {
            status: "ACTIVE",
            students: { some: { studentId: userId, status: "ACTIVE" } },
          },
          challenge: { isPublished: true },
        },
      },
      include: {
        batch: {
          include: {
            workspace: { select: { id: true, name: true } },
            class: { select: { id: true, name: true } },
            challenge: { include: challengeInclude },
          },
        },
      },
      orderBy: { assignedAt: "desc" },
    }),
    workspaceMembership.size > 0
      ? prisma.worksheetAssignment.findMany({
          where: {
            userId,
            worksheet: {
              isPublished: true,
              workspaceId: { in: Array.from(workspaceMembership.keys()) },
              workspace: { status: "ACTIVE" },
            },
          },
          include: { worksheet: { include: challengeInclude } },
          orderBy: { assignedAt: "desc" },
        })
      : Promise.resolve([]),
  ]);

  const durable: StudentAssignedWork[] = recipients.map((recipient) => {
    const challenge = recipient.batch.challenge;
    return {
      id: recipient.id,
      source: "DURABLE",
      status: recipient.status,
      assignedAt: recipient.assignedAt,
      dueDate: recipient.batch.dueDate,
      className: recipient.batch.class.name,
      workspaceName: recipient.batch.workspace.name,
      challenge: {
        id: challenge.id,
        title: challenge.title,
        type: challenge.type,
        difficulty: challenge.difficulty,
        questionCount: challenge._count.questions,
        subject: {
          name: challenge.subject.name,
          slug: challenge.subject.slug,
          qualificationName: challenge.subject.qualification.name,
          boardName: challenge.subject.qualification.board.name,
        },
      },
    };
  });

  const legacy: StudentAssignedWork[] = legacyAssignments.flatMap((assignment) => {
    const workspaceId = assignment.worksheet.workspaceId;
    const membership = workspaceId ? workspaceMembership.get(workspaceId) : null;
    if (!membership) return [];
    const challenge = assignment.worksheet;
    return [{
      id: `legacy-${assignment.id}`,
      source: "LEGACY" as const,
      status: assignment.status,
      assignedAt: assignment.assignedAt,
      dueDate: assignment.dueDate,
      // Legacy rows never recorded an originating class, so do not guess one.
      className: "Legacy workspace assignment",
      workspaceName: membership.workspaceName,
      challenge: {
        id: challenge.id,
        title: challenge.title,
        type: challenge.type,
        difficulty: challenge.difficulty,
        questionCount: challenge._count.questions,
        subject: {
          name: challenge.subject.name,
          slug: challenge.subject.slug,
          qualificationName: challenge.subject.qualification.name,
          boardName: challenge.subject.qualification.board.name,
        },
      },
    }];
  });

  const combined = [...durable, ...legacy].sort(
    (left, right) => right.assignedAt.getTime() - left.assignedAt.getTime(),
  );
  return take ? combined.slice(0, take) : combined;
}
