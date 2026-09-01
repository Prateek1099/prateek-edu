import "server-only";

import { prisma } from "@/lib/prisma";
import {
  getAssignmentTrackingStatus,
  getAttemptTracking,
  summarizeTrackedRecipients,
} from "@/lib/workspace-assignment-tracking-rules";

export async function getWorkspaceClassAssignmentTracking({
  workspaceId,
  classId,
  batchId,
  now = new Date(),
}: {
  workspaceId: string;
  classId: string;
  batchId?: string;
  now?: Date;
}) {
  const batches = await prisma.workspaceAssignmentBatch.findMany({
    where: {
      workspaceId,
      classId,
      ...(batchId ? { id: batchId } : {}),
      class: { workspaceId },
      challenge: { workspaceId },
    },
    include: {
      challenge: {
        select: {
          id: true,
          title: true,
          type: true,
          difficulty: true,
          estimatedTime: true,
          subjectId: true,
          questions: { select: { id: true, correctAnswer: true } },
        },
      },
      recipients: {
        where: {
          revokedAt: null,
          student: {
            classEnrollments: { some: { classId, status: "ACTIVE" } },
          },
        },
        include: {
          student: { select: { id: true, name: true, email: true } },
        },
        orderBy: { assignedAt: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const studentIds = Array.from(
    new Set(batches.flatMap((batch) => batch.recipients.map((recipient) => recipient.studentId))),
  );
  const challengeIds = Array.from(new Set(batches.map((batch) => batch.challengeId)));
  const attempts = studentIds.length && challengeIds.length
    ? await prisma.challengeAttempt.findMany({
        where: { userId: { in: studentIds }, challengeId: { in: challengeIds } },
        select: {
          id: true,
          userId: true,
          challengeId: true,
          score: true,
          totalQuestions: true,
          percentage: true,
          answers: true,
          completedAt: true,
          answerSnapshots: {
            select: {
              id: true,
              questionId: true,
              questionText: true,
              options: true,
              selectedOptionKey: true,
              selectedOptionText: true,
              correctOptionKey: true,
              correctOptionText: true,
              explanation: true,
              topicLabel: true,
              difficulty: true,
              isCorrect: true,
              marksAwarded: true,
              maxMarks: true,
              createdAt: true,
            },
            orderBy: { createdAt: "asc" },
          },
        },
        orderBy: { completedAt: "desc" },
      })
    : [];

  const attemptsByStudentChallenge = new Map<string, typeof attempts>();
  for (const attempt of attempts) {
    const key = `${attempt.userId}:${attempt.challengeId}`;
    const grouped = attemptsByStudentChallenge.get(key) ?? [];
    grouped.push(attempt);
    attemptsByStudentChallenge.set(key, grouped);
  }

  return batches.map((batch) => {
    const recipients = batch.recipients.map((recipient) => {
      const attemptTracking = getAttemptTracking(
        attemptsByStudentChallenge.get(`${recipient.studentId}:${batch.challengeId}`) ?? [],
        recipient.assignedAt,
        Object.fromEntries(
          batch.challenge.questions.map((question) => [question.id, question.correctAnswer]),
        ),
      );
      const status = getAssignmentTrackingStatus({
        challengeType: batch.challenge.type,
        recipientStatus: recipient.status,
        dueDate: batch.dueDate,
        attempts: attemptTracking.attempts,
        assignedAt: recipient.assignedAt,
        now,
      });
      const latestAttempt = attemptTracking.latestAttempt;
      const answerReview = latestAttempt?.answerSnapshots ?? [];

      return {
        id: recipient.id,
        studentId: recipient.studentId,
        student: recipient.student,
        assignedAt: recipient.assignedAt,
        completedAt:
          batch.challenge.type === "QUICK_PRACTICE"
            ? attemptTracking.firstAttempt?.completedAt ?? null
            : recipient.completedAt,
        status,
        attemptCount: attemptTracking.attemptCount,
        bestPercentage: attemptTracking.bestPercentage,
        latestPercentage: attemptTracking.latestAttempt?.percentage ?? null,
        mistakesCount: attemptTracking.mistakesCount,
        latestAttemptAt: latestAttempt?.completedAt ?? null,
        answerReviewCaptured: Boolean(latestAttempt && answerReview.length > 0),
        answerReview: answerReview.filter((answer) => !answer.isCorrect),
      };
    });

    return {
      id: batch.id,
      audience: batch.audience,
      dueDate: batch.dueDate,
      includeLateJoiners: batch.includeLateJoiners,
      status: batch.status,
      createdAt: batch.createdAt,
      cancelledAt: batch.cancelledAt,
      challenge: {
        id: batch.challenge.id,
        title: batch.challenge.title,
        type: batch.challenge.type,
        difficulty: batch.challenge.difficulty,
        estimatedTime: batch.challenge.estimatedTime,
        subjectId: batch.challenge.subjectId,
      },
      recipients,
      summary: summarizeTrackedRecipients(recipients),
    };
  });
}
