import { isAssignmentOverdue } from "@/lib/workspace-assignment-rules";

export type AssignmentTrackingStatus =
  | "PENDING"
  | "COMPLETED"
  | "MARKED_DONE"
  | "OVERDUE";

export type TrackingAttempt = {
  id: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  answers: string;
  completedAt: Date | string;
};

export function isDocumentAssignment(type: string) {
  return type === "WORKSHEET" || type === "PDF_WORKSHEET";
}

export function getAssignmentTrackingStatus({
  challengeType,
  recipientStatus,
  dueDate,
  attempts,
  assignedAt,
  now = new Date(),
}: {
  challengeType: string;
  recipientStatus: string;
  dueDate: Date | string | null;
  attempts: TrackingAttempt[];
  assignedAt: Date | string;
  now?: Date;
}): AssignmentTrackingStatus {
  const assignedAtTime = new Date(assignedAt).getTime();
  const hasCompletedAttempt = attempts.some(
    (attempt) => new Date(attempt.completedAt).getTime() >= assignedAtTime,
  );
  const completed = challengeType === "QUICK_PRACTICE"
    ? hasCompletedAttempt
    : recipientStatus === "COMPLETED";

  if (completed) {
    return isDocumentAssignment(challengeType) ? "MARKED_DONE" : "COMPLETED";
  }
  if (isAssignmentOverdue({ dueDate, completed: false, now })) return "OVERDUE";
  return "PENDING";
}

export function getAttemptTracking<TAttempt extends TrackingAttempt>(
  attempts: TAttempt[],
  assignedAt: Date | string,
  correctAnswers: Record<string, string> = {},
) {
  const assignedAtTime = new Date(assignedAt).getTime();
  const validAttempts = attempts
    .filter((attempt) => new Date(attempt.completedAt).getTime() >= assignedAtTime)
    .sort(
      (left, right) =>
        new Date(right.completedAt).getTime() - new Date(left.completedAt).getTime(),
    );

  const wrongSelections = validAttempts.reduce((total, attempt) => {
    let answers: Record<string, string> = {};
    try {
      answers = JSON.parse(attempt.answers) as Record<string, string>;
    } catch {
      answers = {};
    }
    const knownQuestionIds = Object.keys(correctAnswers);
    if (knownQuestionIds.length > 0) {
      return total + knownQuestionIds.filter((questionId) => {
        const answer = answers[questionId];
        return Boolean(answer) && answer.toUpperCase() !== correctAnswers[questionId].toUpperCase();
      }).length;
    }
    const answeredCount = Object.values(answers).filter(Boolean).length;
    return total + Math.max(0, answeredCount - attempt.score);
  }, 0);

  return {
    attempts: validAttempts,
    attemptCount: validAttempts.length,
    latestAttempt: validAttempts[0] ?? null,
    firstAttempt: validAttempts[validAttempts.length - 1] ?? null,
    bestPercentage: validAttempts.length
      ? Math.max(...validAttempts.map((attempt) => attempt.percentage))
      : null,
    mistakesCount: wrongSelections,
  };
}

export function summarizeTrackedRecipients(
  recipients: Array<{
    status: AssignmentTrackingStatus;
    latestPercentage: number | null;
  }>,
) {
  const completed = recipients.filter(
    (recipient) =>
      recipient.status === "COMPLETED" || recipient.status === "MARKED_DONE",
  ).length;
  const overdue = recipients.filter((recipient) => recipient.status === "OVERDUE").length;
  const pending = recipients.filter((recipient) => recipient.status === "PENDING").length;
  const scores = recipients.flatMap((recipient) =>
    recipient.latestPercentage === null ? [] : [recipient.latestPercentage],
  );

  return {
    assigned: recipients.length,
    completed,
    pending,
    overdue,
    averageScore: scores.length
      ? Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 10) / 10
      : null,
  };
}
