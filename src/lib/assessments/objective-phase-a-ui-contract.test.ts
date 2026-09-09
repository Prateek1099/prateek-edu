import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";

const read = (file: string) => fs.readFileSync(file, "utf8");

test("Phase A routes remain focused, accessible and separate from Quick Practice", async (t) => {
  const runner = read("src/app/dashboard/assessments/[attemptId]/AssessmentRunnerClient.tsx");
  const runnerPage = read("src/app/dashboard/assessments/[attemptId]/page.tsx");
  const studentActions = read("src/app/dashboard/assessments/actions.ts");
  const result = read("src/app/dashboard/assessments/[attemptId]/result/page.tsx");
  const teacherResults = read("src/app/workspace/assessments/[assignmentId]/AssessmentResultsClient.tsx");
  const assign = read("src/app/workspace/paper-builder/archive/[id]/assign-online/AssignOnlineClient.tsx");
  const engine = read("src/lib/assessments/engine.ts");

  await t.test("runner has timer, autosave states, question navigation and accessible answers", () => {
    for (const text of ["expiresAt", "Saving…", "Saved", "Retry save", "Question navigation", "type=\"radio\"", "Previous", "Next", "Submit test"]) assert.ok(runner.includes(text), text);
  });
  await t.test("runner auto-finalizes only the explicit server-proven expiry reason", () => {
    assert.ok(runnerPage.includes('recovery === "FINALIZE_EXPIRED"'));
    assert.ok(runnerPage.includes("finalizeExpiredObjective"));
    assert.ok(runnerPage.includes('recovery === "RETRY"'));
    assert.equal(runnerPage.includes('error.code === "LOCKED"'), false);
    assert.equal(runnerPage.includes("submitObjective(attemptId)"), false);
  });
  await t.test("submit dialog discloses answered and unanswered counts", () => {
    assert.ok(runner.includes("unanswered question"));
    assert.ok(runner.includes("DialogDescription"));
  });
  await t.test("student result has a strict unreleased branch", () => {
    assert.ok(result.includes("Your teacher will release your result"));
    assert.ok(result.includes("if (!result.released)"));
  });
  await t.test("teacher assignment form includes all approved controls", () => {
    for (const text of ["Whole class", "Selected students", "Opens at", "Closes at", "Duration (minutes)", "Attempt limit", "Publish online test"]) assert.ok(assign.includes(text), text);
  });
  await t.test("teacher results expose explicit release rather than automatic release", () => {
    assert.ok(teacherResults.includes("Release result"));
    assert.ok(teacherResults.includes("Ready to release"));
    assert.ok(engine.includes("status:\"RELEASED\""));
  });
  await t.test("student actions call only assessment service, never ChallengeAttempt", () => {
    assert.ok(studentActions.includes("assessmentService"));
    assert.equal(studentActions.includes("challengeAttempt"), false);
  });
  await t.test("mobile presentation uses cards and desktop table without forced page overflow", () => {
    assert.ok(teacherResults.includes("md:hidden"));
    assert.ok(teacherResults.includes("hidden overflow-x-auto"));
    assert.ok(assign.includes("sm:grid-cols-2"));
    assert.ok(runner.includes("lg:grid-cols-[220px_minmax(0,1fr)]"));
  });
  await t.test("migration baseline remains the deployed 22-migration foundation", () => {
    const migrations = fs.readdirSync("prisma/migrations");
    assert.equal(migrations.length, 22);
    assert.equal(migrations.at(-1), "20260908120000_enable_objective_assessment_lifecycle");
  });
});
