import assert from "node:assert/strict";
import test from "node:test";

import {
  getAssignmentTrackingStatus,
  getAttemptTracking,
  summarizeTrackedRecipients,
} from "./workspace-assignment-tracking-rules";

const now = new Date("2026-08-28T12:00:00.000Z");
const assignedAt = "2026-08-20T10:00:00.000Z";

const attempt = {
  id: "attempt-1",
  score: 2,
  totalQuestions: 3,
  percentage: 66.7,
  answers: JSON.stringify({ q1: "A", q2: "B", q3: "C" }),
  completedAt: "2026-08-21T10:00:00.000Z",
};

test("Quick Practice completion requires an actual attempt after assignment", () => {
  assert.equal(getAssignmentTrackingStatus({
    challengeType: "QUICK_PRACTICE",
    recipientStatus: "COMPLETED",
    dueDate: null,
    attempts: [],
    assignedAt,
    now,
  }), "PENDING");

  assert.equal(getAssignmentTrackingStatus({
    challengeType: "QUICK_PRACTICE",
    recipientStatus: "NOT_STARTED",
    dueDate: null,
    attempts: [attempt],
    assignedAt,
    now,
  }), "COMPLETED");

  assert.equal(getAssignmentTrackingStatus({
    challengeType: "QUICK_PRACTICE",
    recipientStatus: "COMPLETED",
    dueDate: null,
    attempts: [{ ...attempt, completedAt: "2026-08-19T10:00:00.000Z" }],
    assignedAt,
    now,
  }), "PENDING");
});

test("pending Quick Practice becomes overdue only after its due date", () => {
  assert.equal(getAssignmentTrackingStatus({
    challengeType: "QUICK_PRACTICE",
    recipientStatus: "NOT_STARTED",
    dueDate: "2026-08-27T23:59:59.999Z",
    attempts: [],
    assignedAt,
    now,
  }), "OVERDUE");
  assert.equal(getAssignmentTrackingStatus({
    challengeType: "QUICK_PRACTICE",
    recipientStatus: "NOT_STARTED",
    dueDate: "2026-08-29T23:59:59.999Z",
    attempts: [],
    assignedAt,
    now,
  }), "PENDING");
});

test("document worksheets use recipient completion and cannot fake practice completion", () => {
  assert.equal(getAssignmentTrackingStatus({
    challengeType: "WORKSHEET",
    recipientStatus: "COMPLETED",
    dueDate: null,
    attempts: [],
    assignedAt,
    now,
  }), "MARKED_DONE");
  assert.equal(getAssignmentTrackingStatus({
    challengeType: "PDF_WORKSHEET",
    recipientStatus: "NOT_STARTED",
    dueDate: "2026-08-27T23:59:59.999Z",
    attempts: [],
    assignedAt,
    now,
  }), "OVERDUE");
});

test("attempt tracking reports latest, best, count, and answered mistakes", () => {
  const result = getAttemptTracking([
    attempt,
    {
      ...attempt,
      id: "attempt-2",
      score: 3,
      percentage: 100,
      answers: JSON.stringify({ q1: "A", q2: "A", q3: "C" }),
      completedAt: "2026-08-22T10:00:00.000Z",
    },
    { ...attempt, id: "old", completedAt: "2026-08-19T10:00:00.000Z" },
  ], assignedAt, { q1: "A", q2: "A", q3: "C" });

  assert.equal(result.attemptCount, 2);
  assert.equal(result.latestAttempt?.id, "attempt-2");
  assert.equal(result.bestPercentage, 100);
  assert.equal(result.mistakesCount, 1);
});

test("teacher summary keeps completed, pending, overdue, and latest-score average consistent", () => {
  assert.deepEqual(summarizeTrackedRecipients([
    { status: "COMPLETED", latestPercentage: 80 },
    { status: "MARKED_DONE", latestPercentage: null },
    { status: "PENDING", latestPercentage: null },
    { status: "OVERDUE", latestPercentage: 60 },
  ]), {
    assigned: 4,
    completed: 2,
    pending: 1,
    overdue: 1,
    averageScore: 70,
  });
});
