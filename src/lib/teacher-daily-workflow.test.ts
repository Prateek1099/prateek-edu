import assert from "node:assert/strict";
import test from "node:test";

import {
  buildTeacherAttentionItems,
  contentTypeLabel,
  getTeacherGreeting,
  summarizeClassWork,
  type TeacherWorkflowAssignment,
} from "./teacher-daily-workflow";

function assignment(
  id: string,
  summary: TeacherWorkflowAssignment["summary"],
  mistakesCount = 0,
): TeacherWorkflowAssignment {
  return {
    id,
    status: "ACTIVE",
    createdAt: "2026-09-04T10:00:00.000Z",
    challenge: { title: `Work ${id}`, type: "QUICK_PRACTICE" },
    summary,
    recipients: [{ mistakesCount }],
  };
}

test("attention uses only overdue, pending, and recorded mistake signals", () => {
  const items = buildTeacherAttentionItems([
    {
      id: "class-1",
      name: "IP Batch",
      assignments: [
        assignment("overdue", { assigned: 5, completed: 2, pending: 2, overdue: 1, averageScore: 60 }),
        assignment("pending", { assigned: 4, completed: 2, pending: 2, overdue: 0, averageScore: 70 }),
        assignment("mistakes", { assigned: 2, completed: 2, pending: 0, overdue: 0, averageScore: 50 }, 3),
        assignment("done", { assigned: 2, completed: 2, pending: 0, overdue: 0, averageScore: 100 }),
      ],
    },
  ]);

  assert.deepEqual(items.map((item) => item.kind), ["OVERDUE", "PENDING", "MISTAKES"]);
  assert.equal(items.some((item) => item.id.includes("done")), false);
  assert.equal(items[0].href, "/workspace/classes/class-1/assignments/overdue");
});

test("cancelled work is excluded and item limits are respected", () => {
  const cancelled = assignment("cancelled", { assigned: 1, completed: 0, pending: 0, overdue: 1, averageScore: null });
  cancelled.status = "CANCELLED";
  const active = assignment("active", { assigned: 1, completed: 0, pending: 1, overdue: 0, averageScore: null });
  assert.equal(buildTeacherAttentionItems([{ id: "class-1", name: "Class", assignments: [cancelled, active] }], 1).length, 1);
});

test("class work summary keeps explicit completion meanings", () => {
  const result = summarizeClassWork([
    assignment("one", { assigned: 10, completed: 6, pending: 3, overdue: 1, averageScore: 72 }),
  ]);
  assert.deepEqual(result, { assignedWork: 1, completed: 6, pending: 3, overdue: 1 });
});

test("teacher wording hides raw content enums", () => {
  assert.equal(contentTypeLabel("QUICK_PRACTICE"), "practice set");
  assert.equal(contentTypeLabel("PDF_WORKSHEET"), "PDF worksheet");
  assert.equal(contentTypeLabel("WORKSHEET"), "worksheet");
});

test("greeting is stable in the school timezone", () => {
  assert.equal(getTeacherGreeting(new Date("2026-09-04T18:30:00.000Z")), "Good morning");
  assert.equal(getTeacherGreeting(new Date("2026-09-04T02:30:00.000Z")), "Good morning");
  assert.equal(getTeacherGreeting(new Date("2026-09-04T08:30:00.000Z")), "Good afternoon");
  assert.equal(getTeacherGreeting(new Date("2026-09-04T14:30:00.000Z")), "Good evening");
});
