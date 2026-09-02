import assert from "node:assert/strict";
import test from "node:test";

import {
  getStudentProfileAnswerReviewState,
  summarizeStudentProfileAssignments,
  summarizeStudentSnapshotMistakes,
  type StudentProfileAssignmentInput,
} from "@/lib/teacher-class-student-profile-rules";

function assignment(
  overrides: Omit<Partial<StudentProfileAssignmentInput>, "recipient"> & {
    recipient?: Partial<StudentProfileAssignmentInput["recipient"]>;
  } = {},
): StudentProfileAssignmentInput {
  return {
    id: overrides.id ?? "batch-1",
    challenge: overrides.challenge ?? { type: "QUICK_PRACTICE", title: "SQL Practice" },
    recipient: {
      status: "PENDING",
      attemptCount: 0,
      bestPercentage: null,
      latestPercentage: null,
      mistakesCount: 0,
      latestAttemptAt: null,
      answerReviewCaptured: false,
      answerReview: [],
      ...overrides.recipient,
    },
  };
}

test("summarizes completed, pending, overdue, scores, and the latest attempt", () => {
  const result = summarizeStudentProfileAssignments([
    assignment({
      id: "completed",
      recipient: {
        status: "COMPLETED",
        attemptCount: 2,
        latestPercentage: 70,
        bestPercentage: 90,
        latestAttemptAt: "2026-09-01T08:00:00.000Z",
      },
    }),
    assignment({ id: "pending" }),
    assignment({
      id: "overdue",
      recipient: {
        status: "OVERDUE",
        attemptCount: 1,
        latestPercentage: 50,
        bestPercentage: 50,
        latestAttemptAt: "2026-09-02T09:00:00.000Z",
      },
    }),
  ]);

  assert.deepEqual(result, {
    total: 3,
    completed: 1,
    pending: 1,
    overdue: 1,
    averageScore: 60,
    latestAttemptAt: "2026-09-02T09:00:00.000Z",
  });
});

test("classifies snapshot-backed, old, pending, and document review states", () => {
  assert.equal(
    getStudentProfileAnswerReviewState(
      assignment({ recipient: { attemptCount: 1, answerReviewCaptured: true } }),
    ),
    "AVAILABLE",
  );
  assert.equal(
    getStudentProfileAnswerReviewState(
      assignment({ recipient: { attemptCount: 1, answerReviewCaptured: false } }),
    ),
    "OLDER_ATTEMPT",
  );
  assert.equal(getStudentProfileAnswerReviewState(assignment()), "NOT_ATTEMPTED");
  assert.equal(
    getStudentProfileAnswerReviewState(
      assignment({ challenge: { type: "WORKSHEET", title: "Document" } }),
    ),
    "NOT_APPLICABLE",
  );
});

test("mistake summary uses only snapshot answers supplied by class-scoped assignments", () => {
  const result = summarizeStudentSnapshotMistakes([
    assignment({
      id: "batch-a",
      recipient: {
        mistakesCount: 3,
        answerReviewCaptured: true,
        answerReview: [
          {
            id: "snapshot-a",
            questionText: "Question A",
            topicLabel: "SQL",
            difficulty: "easy",
            createdAt: "2026-09-01T08:00:00.000Z",
          },
          {
            id: "snapshot-b",
            questionText: "Question B",
            topicLabel: "SQL",
            difficulty: "medium",
            createdAt: "2026-09-02T08:00:00.000Z",
          },
        ],
      },
    }),
    assignment({
      id: "batch-b",
      challenge: { type: "QUICK_PRACTICE", title: "Pandas Practice" },
      recipient: {
        mistakesCount: 1,
        answerReviewCaptured: true,
        answerReview: [
          {
            id: "snapshot-c",
            questionText: "Question C",
            topicLabel: null,
            difficulty: "hard",
            createdAt: "2026-09-03T08:00:00.000Z",
          },
        ],
      },
    }),
  ]);

  assert.equal(result.capturedWrongAnswers, 3);
  assert.equal(result.trackedWrongSelections, 4);
  assert.deepEqual(result.topics, [
    { label: "SQL", count: 2 },
    { label: "Unassigned topic", count: 1 },
  ]);
  assert.deepEqual(result.recent.map((entry) => entry.id), [
    "snapshot-c",
    "snapshot-b",
    "snapshot-a",
  ]);
  assert.equal(result.recent[0].assignmentId, "batch-b");
});

test("empty profile summaries remain honest", () => {
  assert.deepEqual(summarizeStudentProfileAssignments([]), {
    total: 0,
    completed: 0,
    pending: 0,
    overdue: 0,
    averageScore: null,
    latestAttemptAt: null,
  });
  assert.deepEqual(summarizeStudentSnapshotMistakes([]), {
    capturedWrongAnswers: 0,
    trackedWrongSelections: 0,
    topics: [],
    recent: [],
  });
});
