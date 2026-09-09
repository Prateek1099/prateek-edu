import assert from "node:assert/strict";
import { test } from "node:test";

import {
  deriveTeacherAssessmentState,
  normalizeTeacherAssessmentCenterQuery,
  teacherAssessmentStatusLabel,
  TEACHER_ASSESSMENT_PAGE_SIZE,
} from "./teacher-center";

const now = new Date("2026-09-09T12:00:00.000Z");
const state = (overrides: Partial<Parameters<typeof deriveTeacherAssessmentState>[0]> = {}) =>
  deriveTeacherAssessmentState({
    now,
    opensAt: new Date("2026-09-09T11:00:00.000Z"),
    closesAt: new Date("2026-09-09T13:00:00.000Z"),
    cancelledAt: null,
    classIsActive: true,
    activeRecipientCount: 2,
    actionableRecipientCount: 2,
    finalizedRecipientCount: 0,
    ...overrides,
  });

test("Teacher Assessment Center rules", async t => {
  await t.test("normalizes and bounds server query input", () => {
    assert.deepEqual(normalizeTeacherAssessmentCenterQuery({
      status: "active",
      search: `  SQL   unit  ${"x".repeat(120)}`,
      classId: "class-1",
      page: "2",
    }), {
      status: "ACTIVE",
      search: `SQL unit ${"x".repeat(91)}`,
      classId: "class-1",
      page: 2,
      pageSize: TEACHER_ASSESSMENT_PAGE_SIZE,
    });
  });

  await t.test("rejects unsupported filters and unreasonable pages", () => {
    const query = normalizeTeacherAssessmentCenterQuery({ status: "needs_marking", page: "999999" });
    assert.equal(query.status, "ALL");
    assert.equal(query.page, 1);
    assert.equal(query.pageSize, 20);
  });

  await t.test("classifies a valid future assignment as Scheduled", () => {
    assert.deepEqual(state({ opensAt: new Date("2026-09-09T12:30:00.000Z") }), {
      status: "SCHEDULED",
      completionReason: null,
    });
  });

  await t.test("classifies an open actionable assignment as Active", () => {
    assert.deepEqual(state(), { status: "ACTIVE", completionReason: null });
  });

  await t.test("classifies an elapsed window as Completed", () => {
    assert.deepEqual(state({ closesAt: new Date("2026-09-09T11:59:59.000Z") }), {
      status: "COMPLETED",
      completionReason: "WINDOW_CLOSED",
    });
  });

  await t.test("classifies all applicable attempts finalized as Completed", () => {
    assert.deepEqual(state({ actionableRecipientCount: 0, finalizedRecipientCount: 2 }), {
      status: "COMPLETED",
      completionReason: "ALL_FINALIZED",
    });
  });

  await t.test("does not misrepresent cancellation as completion or active", () => {
    assert.deepEqual(state({ cancelledAt: new Date("2026-09-09T11:30:00.000Z") }), {
      status: "CANCELLED",
      completionReason: null,
    });
  });

  await t.test("does not call an inactive class active", () => {
    assert.deepEqual(state({ classIsActive: false, actionableRecipientCount: 2 }), {
      status: "COMPLETED",
      completionReason: "NO_ACTIVE_RECIPIENTS",
    });
  });

  await t.test("does not call a recipient-free future assignment scheduled", () => {
    assert.deepEqual(state({
      opensAt: new Date("2026-09-09T12:30:00.000Z"),
      activeRecipientCount: 0,
      actionableRecipientCount: 0,
    }), {
      status: "COMPLETED",
      completionReason: "NO_ACTIVE_RECIPIENTS",
    });
  });

  await t.test("uses the teacher-friendly window-closed label", () => {
    assert.equal(teacherAssessmentStatusLabel("COMPLETED", "WINDOW_CLOSED"), "Completed · Window closed");
    assert.equal(teacherAssessmentStatusLabel("CANCELLED", null), "Cancelled");
  });
});
