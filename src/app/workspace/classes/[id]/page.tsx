export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { requireActiveWorkspace } from "@/lib/require-role";
import { summarizeAssignmentRecipients } from "@/lib/workspace-assignment-rules";

import ClassDetailClient from "./ClassDetailClient";

export default async function ClassDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireActiveWorkspace();

  const cls = await prisma.class.findFirst({
    where: { id, workspaceId: user.workspaceId },
    include: {
      subject: true,
      qualification: true,
      students: {
        where: { status: "ACTIVE" },
        include: {
          student: { select: { id: true, name: true, email: true, createdAt: true } },
        },
        orderBy: { enrolledAt: "desc" },
      },
      assignmentBatches: {
        include: {
          challenge: {
            select: {
              id: true,
              title: true,
              type: true,
              difficulty: true,
              estimatedTime: true,
            },
          },
          recipients: {
            include: {
              student: { select: { id: true, name: true, email: true } },
            },
            orderBy: { assignedAt: "asc" },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!cls) notFound();

  const availableChallenges = await prisma.challenge.findMany({
    where: {
      workspaceId: user.workspaceId,
      isPublished: true,
      type: { in: ["WORKSHEET", "PDF_WORKSHEET", "QUICK_PRACTICE"] },
      ...(cls.subjectId ? { subjectId: cls.subjectId } : {}),
    },
    select: { id: true, title: true, type: true },
    orderBy: { createdAt: "desc" },
  });

  const activeStudentIds = new Set(cls.students.map((membership) => membership.studentId));
  const assignments = cls.assignmentBatches.map((batch) => ({
    id: batch.id,
    audience: batch.audience,
    dueDate: batch.dueDate,
    includeLateJoiners: batch.includeLateJoiners,
    status: batch.status,
    createdAt: batch.createdAt,
    cancelledAt: batch.cancelledAt,
    challenge: batch.challenge,
    summary: summarizeAssignmentRecipients(
      batch.recipients.filter((recipient) => activeStudentIds.has(recipient.studentId)),
      batch.dueDate,
    ),
    recipients: batch.recipients.map((recipient) => ({
      id: recipient.id,
      studentId: recipient.studentId,
      status: recipient.status,
      assignedAt: recipient.assignedAt,
      completedAt: recipient.completedAt,
      revokedAt: recipient.revokedAt,
      membershipActive: activeStudentIds.has(recipient.studentId),
      student: recipient.student,
    })),
  }));

  const activeChallengeIds = new Set(
    assignments
      .filter((assignment) => assignment.status === "ACTIVE")
      .map((assignment) => assignment.challenge.id),
  );

  return (
    <ClassDetailClient
      classData={cls}
      availableChallenges={availableChallenges.filter(
        (challenge) => !activeChallengeIds.has(challenge.id),
      )}
      assignments={assignments}
    />
  );
}
