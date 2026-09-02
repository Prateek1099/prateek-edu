import type { AssignmentTrackingStatus } from "@/lib/workspace-assignment-tracking-rules";

export type StudentProfileAnswerReviewState =
  | "AVAILABLE"
  | "OLDER_ATTEMPT"
  | "NOT_ATTEMPTED"
  | "NOT_APPLICABLE";

export type StudentProfileWrongAnswer = {
  id: string;
  questionText: string;
  topicLabel: string | null;
  difficulty: string | null;
  createdAt: Date | string;
};

export type StudentProfileAssignmentInput = {
  id: string;
  challenge: { type: string; title: string };
  recipient: {
    status: AssignmentTrackingStatus;
    attemptCount: number;
    bestPercentage: number | null;
    latestPercentage: number | null;
    mistakesCount: number;
    latestAttemptAt: Date | string | null;
    answerReviewCaptured: boolean;
    answerReview: StudentProfileWrongAnswer[];
  };
};

export function getStudentProfileAnswerReviewState(
  assignment: StudentProfileAssignmentInput,
): StudentProfileAnswerReviewState {
  if (assignment.challenge.type !== "QUICK_PRACTICE") return "NOT_APPLICABLE";
  if (assignment.recipient.attemptCount === 0) return "NOT_ATTEMPTED";
  return assignment.recipient.answerReviewCaptured ? "AVAILABLE" : "OLDER_ATTEMPT";
}

export function summarizeStudentProfileAssignments(
  assignments: StudentProfileAssignmentInput[],
) {
  const completed = assignments.filter(
    (assignment) =>
      assignment.recipient.status === "COMPLETED" ||
      assignment.recipient.status === "MARKED_DONE",
  ).length;
  const pending = assignments.filter(
    (assignment) => assignment.recipient.status === "PENDING",
  ).length;
  const overdue = assignments.filter(
    (assignment) => assignment.recipient.status === "OVERDUE",
  ).length;
  const latestScores = assignments.flatMap((assignment) =>
    assignment.recipient.latestPercentage === null
      ? []
      : [assignment.recipient.latestPercentage],
  );
  const attemptDates = assignments.flatMap((assignment) =>
    assignment.recipient.latestAttemptAt ? [assignment.recipient.latestAttemptAt] : [],
  );
  const latestAttemptAt = attemptDates.length
    ? attemptDates.reduce((latest, current) =>
        new Date(current).getTime() > new Date(latest).getTime() ? current : latest,
      )
    : null;

  return {
    total: assignments.length,
    completed,
    pending,
    overdue,
    averageScore: latestScores.length
      ? Math.round(
          (latestScores.reduce((sum, score) => sum + score, 0) / latestScores.length) * 10,
        ) / 10
      : null,
    latestAttemptAt,
  };
}

export function summarizeStudentSnapshotMistakes(
  assignments: StudentProfileAssignmentInput[],
) {
  const captured = assignments.flatMap((assignment) =>
    assignment.recipient.answerReview.map((answer) => ({
      ...answer,
      assignmentId: assignment.id,
      assignmentTitle: assignment.challenge.title,
    })),
  );
  const topicCounts = new Map<string, number>();

  for (const answer of captured) {
    const topic = answer.topicLabel || "Unassigned topic";
    topicCounts.set(topic, (topicCounts.get(topic) ?? 0) + 1);
  }

  return {
    capturedWrongAnswers: captured.length,
    trackedWrongSelections: assignments.reduce(
      (total, assignment) => total + assignment.recipient.mistakesCount,
      0,
    ),
    topics: [...topicCounts.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label)),
    recent: captured
      .sort(
        (left, right) =>
          new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
      )
      .slice(0, 5),
  };
}
