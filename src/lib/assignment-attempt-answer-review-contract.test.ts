import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(path, "utf8");

const schema = read("prisma/schema.prisma");
const migration = read(
  "prisma/migrations/20260901120000_add_assignment_attempt_answer_snapshots/migration.sql",
);
const attemptRoute = read("src/app/api/challenges/[id]/attempt/route.ts");
const trackingService = read("src/lib/workspace-assignment-tracking.ts");
const teacherPage = read("src/app/workspace/classes/[id]/assignments/[batchId]/page.tsx");
const mistakePage = read("src/app/dashboard/mistakes/page.tsx");
const mistakeClient = read("src/app/dashboard/mistakes/MistakeBookClient.tsx");

test("snapshot schema and migration are additive and preserve old attempts", () => {
  assert.match(schema, /model AssignmentAttemptAnswerSnapshot/);
  assert.match(schema, /@@unique\(\[attemptId, questionId\]\)/);
  assert.match(migration, /CREATE TABLE "assignment_attempt_answer_snapshots"/);
  assert.match(migration, /REFERENCES "challenge_attempts"\("id"\)/);
  assert.doesNotMatch(
    migration,
    /^\s*(?:DROP\s+(?:TABLE|COLUMN)|TRUNCATE|DELETE\s+FROM|UPDATE\s+)/im,
  );
  assert.doesNotMatch(migration, /ALTER COLUMN/i);
});

test("new assigned workspace Quick Practice attempts snapshot trusted server question data", () => {
  assert.match(attemptRoute, /validateAnswersAndBuildSnapshots/);
  assert.match(attemptRoute, /questionText: true/);
  assert.match(attemptRoute, /optionA: true/);
  assert.match(attemptRoute, /correctAnswer: true/);
  assert.match(attemptRoute, /explanation: true/);
  assert.match(attemptRoute, /assignmentAttemptAnswerSnapshot\.createMany/);
  assert.match(attemptRoute, /sessionUser\.role === "STUDENT"/);
  assert.match(attemptRoute, /challenge\.workspaceId/);
  assert.match(attemptRoute, /challenge\.type === "QUICK_PRACTICE"/);
  assert.match(attemptRoute, /attemptId: savedAttempt\.id/);
  assert.match(attemptRoute, /studentId: userId/);
});

test("snapshot creation remains inside the attempt transaction without changing scoring", () => {
  const transactionStart = attemptRoute.indexOf("prisma.$transaction");
  const snapshotWrite = attemptRoute.indexOf("assignmentAttemptAnswerSnapshot.createMany");
  const transactionReturn = attemptRoute.indexOf("return savedAttempt", snapshotWrite);
  assert.ok(transactionStart >= 0 && snapshotWrite > transactionStart && transactionReturn > snapshotWrite);
  assert.match(attemptRoute, /if \(answers\[question\.id\]\?\.toUpperCase\(\) === question\.correctAnswer\.toUpperCase\(\)\)/);
  assert.match(attemptRoute, /score\+\+/);
  assert.match(attemptRoute, /workspaceAssignmentRecipient\.updateMany/);
  assert.match(attemptRoute, /mistakeEntry\.upsert/);
});

test("teacher answer review inherits exact workspace, class, assignment, and academic scope", () => {
  assert.match(teacherPage, /requireActiveWorkspace/);
  assert.match(teacherPage, /requireWorkspaceSubjectScope/);
  assert.match(teacherPage, /getWorkspaceClassAssignmentTracking/);
  assert.match(trackingService, /workspaceId,/);
  assert.match(trackingService, /classId,/);
  assert.match(trackingService, /batchId/);
  assert.match(trackingService, /class: \{ workspaceId \}/);
  assert.match(trackingService, /challenge: \{ workspaceId \}/);
  assert.match(trackingService, /revokedAt: null/);
  assert.match(trackingService, /classEnrollments: \{ some: \{ classId, status: "ACTIVE" \} \}/);
});

test("teacher UI shows immutable answer details and old-attempt fallback", () => {
  assert.match(teacherPage, /Review answers/);
  assert.match(teacherPage, /Student selected/);
  assert.match(teacherPage, /Correct answer/);
  assert.match(teacherPage, /Explanation/);
  assert.match(teacherPage, /This attempt was completed before detailed answer review was available/);
  assert.match(teacherPage, /answer\.topicLabel/);
  assert.match(teacherPage, /answer\.difficulty/);
  assert.match(teacherPage, /formatDateTime\(recipient\.latestAttemptAt\)/);
});

test("Mistake Book queries only the signed-in student's snapshots", () => {
  assert.match(mistakePage, /studentId: userId, isCorrect: false/);
  assert.match(mistakePage, /latestSnapshotByQuestion/);
  assert.match(mistakePage, /readOptionSnapshot/);
  assert.doesNotMatch(mistakePage, /studentId:\s*(?:params|searchParams|formData)/);
});

test("Mistake Book labels answers clearly and preserves old-attempt behavior", () => {
  assert.match(mistakeClient, /Your answer/);
  assert.match(mistakeClient, /Correct answer/);
  assert.match(mistakeClient, /Explanation/);
  assert.match(mistakeClient, /Detailed answer review was not captured for this older attempt/);
  assert.match(mistakeClient, /Retry Challenge/);
  assert.match(mistakeClient, /snapshotCaptured/);
});

test("Phase 1 does not add subjective, AI, paper-attempt, or report-export flows", () => {
  const changedFeature = [attemptRoute, trackingService, teacherPage, mistakePage, mistakeClient].join("\n");
  assert.doesNotMatch(changedFeature, /AI marking|subjective marking|parent report|leaderboard/i);
  assert.doesNotMatch(changedFeature, /savedGeneratedPaper.*attempt|paperAttempt/i);
});
