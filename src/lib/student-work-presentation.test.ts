import assert from "node:assert/strict";
import test from "node:test";

import {
  getStudentWorkDisplayState,
  getStudentWorkStatusLabel,
  orderStudentWork,
} from "./student-work-presentation";

const now = new Date("2026-09-06T10:00:00.000Z");

test("student work states use real completion and due dates without fake today urgency", () => {
  assert.equal(
    getStudentWorkDisplayState({ status: "COMPLETED", dueDate: "2026-09-05T23:59:59.999Z" }, now),
    "COMPLETED",
  );
  assert.equal(
    getStudentWorkDisplayState({ status: "NOT_STARTED", dueDate: "2026-09-05T23:59:59.999Z" }, now),
    "OVERDUE",
  );
  assert.equal(
    getStudentWorkDisplayState({ status: "NOT_STARTED", dueDate: "2026-09-06T23:59:59.999Z" }, now),
    "DUE_TODAY",
  );
  assert.equal(
    getStudentWorkDisplayState({ status: "NOT_STARTED", dueDate: null }, now),
    "NO_DUE_DATE",
  );
  assert.equal(getStudentWorkStatusLabel("NO_DUE_DATE"), "No due date");
});

test("student work orders overdue, today, upcoming, no-date, then completed", () => {
  const ordered = orderStudentWork([
    { id: "completed", status: "COMPLETED", assignedAt: "2026-09-01", dueDate: null },
    { id: "no-date", status: "NOT_STARTED", assignedAt: "2026-09-05", dueDate: null },
    { id: "upcoming", status: "NOT_STARTED", assignedAt: "2026-09-04", dueDate: "2026-09-08T23:59:59.999Z" },
    { id: "today", status: "NOT_STARTED", assignedAt: "2026-09-03", dueDate: "2026-09-06T23:59:59.999Z" },
    { id: "overdue", status: "NOT_STARTED", assignedAt: "2026-09-02", dueDate: "2026-09-05T23:59:59.999Z" },
  ], now);

  assert.deepEqual(ordered.map((assignment) => assignment.id), [
    "overdue",
    "today",
    "upcoming",
    "no-date",
    "completed",
  ]);
});
