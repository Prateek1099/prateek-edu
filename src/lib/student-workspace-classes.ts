import "server-only";

import { prisma } from "@/lib/prisma";
import {
  getStudentClassAssignmentState,
  summarizeStudentClassAssignments,
} from "@/lib/student-workspace-class-rules";

const activeMembershipWhere = (studentId: string) => ({
  studentId,
  status: "ACTIVE",
  class: { status: "ACTIVE", workspace: { status: "ACTIVE" } },
});

const classInclude = {
  workspace: {
    select: {
      id: true,
      name: true,
      owner: { select: { name: true, email: true } },
    },
  },
  subject: { select: { id: true, name: true, slug: true } },
  qualification: {
    select: { id: true, name: true, title: true, board: { select: { name: true } } },
  },
} as const;

export async function getStudentWorkspaceClasses(userId: string, now = new Date()) {
  const memberships = await prisma.classStudent.findMany({
    where: activeMembershipWhere(userId),
    select: {
      enrolledAt: true,
      class: { include: classInclude },
    },
    orderBy: { enrolledAt: "desc" },
  });

  const classIds = memberships.map((membership) => membership.class.id);
  const classWorkspaceIds = new Map(
    memberships.map((membership) => [membership.class.id, membership.class.workspaceId]),
  );
  const recipients = classIds.length
    ? await prisma.workspaceAssignmentRecipient.findMany({
        where: {
          studentId: userId,
          revokedAt: null,
          batch: {
            status: "ACTIVE",
            classId: { in: classIds },
            class: {
              status: "ACTIVE",
              students: { some: { studentId: userId, status: "ACTIVE" } },
            },
            workspace: { status: "ACTIVE" },
            challenge: {
              isPublished: true,
              type: { in: ["WORKSHEET", "PDF_WORKSHEET", "QUICK_PRACTICE"] },
            },
          },
        },
        select: {
          status: true,
          batch: {
            select: {
              classId: true,
              workspaceId: true,
              dueDate: true,
              challenge: { select: { workspaceId: true } },
            },
          },
        },
      })
    : [];

  const recipientsByClass = new Map<
    string,
    Array<{ status: string; dueDate: Date | null }>
  >();
  for (const recipient of recipients) {
    const expectedWorkspaceId = classWorkspaceIds.get(recipient.batch.classId);
    if (
      !expectedWorkspaceId
      || recipient.batch.workspaceId !== expectedWorkspaceId
      || recipient.batch.challenge.workspaceId !== expectedWorkspaceId
    ) {
      continue;
    }
    const assignments = recipientsByClass.get(recipient.batch.classId) ?? [];
    assignments.push({ status: recipient.status, dueDate: recipient.batch.dueDate });
    recipientsByClass.set(recipient.batch.classId, assignments);
  }

  return memberships.map((membership) => ({
    ...membership.class,
    enrolledAt: membership.enrolledAt,
    assignmentCounts: summarizeStudentClassAssignments(
      recipientsByClass.get(membership.class.id) ?? [],
      now,
    ),
  }));
}

export async function getStudentWorkspaceClass(
  userId: string,
  classId: string,
  now = new Date(),
) {
  const membership = await prisma.classStudent.findFirst({
    where: { ...activeMembershipWhere(userId), classId },
    select: {
      enrolledAt: true,
      class: { include: classInclude },
    },
  });
  if (!membership) return null;

  const recipients = await prisma.workspaceAssignmentRecipient.findMany({
    where: {
      studentId: userId,
      revokedAt: null,
      batch: {
        classId,
        workspaceId: membership.class.workspaceId,
        status: "ACTIVE",
        class: {
          status: "ACTIVE",
          students: { some: { studentId: userId, status: "ACTIVE" } },
        },
        workspace: { status: "ACTIVE" },
        challenge: {
          isPublished: true,
          workspaceId: membership.class.workspaceId,
          type: { in: ["WORKSHEET", "PDF_WORKSHEET", "QUICK_PRACTICE"] },
        },
      },
    },
    include: {
      batch: {
        include: {
          challenge: {
            include: {
              subject: { include: { qualification: { include: { board: true } } } },
              _count: { select: { questions: true } },
            },
          },
        },
      },
    },
    orderBy: { assignedAt: "desc" },
  });

  const assignments = recipients.map((recipient) => {
    const challenge = recipient.batch.challenge;
    return {
      id: recipient.id,
      assignedAt: recipient.assignedAt,
      dueDate: recipient.batch.dueDate,
      status: getStudentClassAssignmentState(
        { status: recipient.status, dueDate: recipient.batch.dueDate },
        now,
      ),
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

  return {
    ...membership.class,
    enrolledAt: membership.enrolledAt,
    assignments,
    assignmentCounts: summarizeStudentClassAssignments(recipients.map((recipient) => ({
      status: recipient.status,
      dueDate: recipient.batch.dueDate,
    })), now),
  };
}
