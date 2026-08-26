import assert from "node:assert/strict";
import test from "node:test";

import {
  getStudentClassAssignmentState,
  summarizeStudentClassAssignments,
} from "./student-workspace-class-rules";

const now = new Date("2026-08-26T12:00:00.000Z");

test("classifies completed, pending, and overdue work without overlapping counts", () => {
  assert.equal(getStudentClassAssignmentState({ status: "COMPLETED", dueDate: "2026-08-20T00:00:00.000Z" }, now), "COMPLETED");
  assert.equal(getStudentClassAssignmentState({ status: "NOT_STARTED", dueDate: "2026-08-27T00:00:00.000Z" }, now), "PENDING");
  assert.equal(getStudentClassAssignmentState({ status: "NOT_STARTED", dueDate: "2026-08-25T00:00:00.000Z" }, now), "OVERDUE");
});

test("summarizes the exact assignments shown on a class card", () => {
  const summary = summarizeStudentClassAssignments([
    { status: "COMPLETED", dueDate: null },
    { status: "NOT_STARTED", dueDate: null },
    { status: "NOT_STARTED", dueDate: "2026-08-25T00:00:00.000Z" },
    { status: "NOT_STARTED", dueDate: "2026-08-29T00:00:00.000Z" },
  ], now);

  assert.deepEqual(summary, { total: 4, pending: 2, completed: 1, overdue: 1 });
});

test("an empty class reports zero assignment counts", () => {
  assert.deepEqual(summarizeStudentClassAssignments([], now), {
    total: 0,
    pending: 0,
    completed: 0,
    overdue: 0,
  });
});
