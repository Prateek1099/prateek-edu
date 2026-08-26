import assert from "node:assert/strict";
import test from "node:test";

import {
  formatAssignmentDueDate,
  isAssignmentOverdue,
  isWorkspaceAssignableChallengeType,
  normalizeDueDate,
  summarizeAssignmentRecipients,
} from "./workspace-assignment-rules";

test("allows only workspace worksheet and Quick Practice types", () => {
  assert.equal(isWorkspaceAssignableChallengeType("WORKSHEET"), true);
  assert.equal(isWorkspaceAssignableChallengeType("PDF_WORKSHEET"), true);
  assert.equal(isWorkspaceAssignableChallengeType("QUICK_PRACTICE"), true);
  assert.equal(isWorkspaceAssignableChallengeType("CHALLENGE"), false);
  assert.equal(isWorkspaceAssignableChallengeType("COURSE"), false);
});

test("normalizes valid date-only due dates to the end of the UTC day", () => {
  const year = new Date().getUTCFullYear() + 1;
  assert.equal(
    normalizeDueDate(`${year}-02-12`)?.toISOString(),
    `${year}-02-12T23:59:59.999Z`,
  );
  assert.equal(normalizeDueDate(null), null);
});

test("rejects invalid and past due dates", () => {
  assert.throws(() => normalizeDueDate("12/02/2028"), /valid due date/i);
  assert.throws(() => normalizeDueDate("2028-02-31"), /valid due date/i);
  assert.throws(() => normalizeDueDate("2020-01-01"), /cannot be in the past/i);
});

test("formats the chosen due date without a local timezone day shift", () => {
  assert.match(formatAssignmentDueDate("2028-02-12T23:59:59.999Z"), /2\/12\/2028|12\/2\/2028/);
});

test("overdue is derived only for incomplete work", () => {
  const now = new Date("2026-08-26T12:00:00.000Z");
  assert.equal(
    isAssignmentOverdue({ dueDate: "2026-08-25T23:59:59.999Z", completed: false, now }),
    true,
  );
  assert.equal(
    isAssignmentOverdue({ dueDate: "2026-08-25T23:59:59.999Z", completed: true, now }),
    false,
  );
  assert.equal(isAssignmentOverdue({ dueDate: null, completed: false, now }), false);
});

test("teacher summary excludes revoked recipients and calculates pending/completed", () => {
  const summary = summarizeAssignmentRecipients(
    [
      { status: "COMPLETED", revokedAt: null },
      { status: "NOT_STARTED", revokedAt: null },
      { status: "NOT_STARTED", revokedAt: "2026-08-20T00:00:00.000Z" },
    ],
    "2026-08-25T23:59:59.999Z",
    new Date("2026-08-26T12:00:00.000Z"),
  );
  assert.deepEqual(summary, { assigned: 2, completed: 1, pending: 1, overdue: 1 });
});
