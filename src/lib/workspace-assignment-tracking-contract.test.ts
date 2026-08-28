import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(path, "utf8");

test("teacher assignment tracking is workspace, class, and academic-scope bound", () => {
  const page = read("src/app/workspace/classes/[id]/assignments/[batchId]/page.tsx");
  const service = read("src/lib/workspace-assignment-tracking.ts");

  assert.match(page, /requireActiveWorkspace/);
  assert.match(page, /requireWorkspaceSubjectScope/);
  assert.match(service, /workspaceId,/);
  assert.match(service, /classId,/);
  assert.match(service, /class: \{ workspaceId \}/);
  assert.match(service, /challenge: \{ workspaceId \}/);
  assert.doesNotMatch(service, /User\.workspaceId/);
});

test("worksheet completion is student-only and revalidates exact active assignment boundaries", () => {
  const action = read("src/app/actions/workspace-assignment-completion.ts");

  assert.match(action, /user\.role !== "STUDENT"/);
  assert.match(action, /studentId,/);
  assert.match(action, /revokedAt: null/);
  assert.match(action, /status: "ACTIVE" as const/);
  assert.match(action, /students: \{ some: \{ studentId, status: "ACTIVE" as const \} \}/);
  assert.match(action, /isPublished: true/);
  assert.match(action, /\["WORKSHEET", "PDF_WORKSHEET"\]/);
  assert.doesNotMatch(action, /QUICK_PRACTICE/);
  assert.doesNotMatch(action, /workspaceId\s*:\s*user\./);
});

test("student worksheet context uses the exact durable recipient id", () => {
  const classPage = read("src/app/dashboard/classes/[id]/page.tsx");
  const assignedWorkPage = read("src/app/dashboard/worksheets/page.tsx");
  const viewerPage = read("src/app/resources/[board]/[qualification]/[subject]/worksheet/[id]/page.tsx");

  assert.match(classPage, /assignment\.id/);
  assert.match(assignedWorkPage, /assignment\.source === "DURABLE"/);
  assert.match(viewerPage, /id: assignmentId/);
  assert.match(viewerPage, /studentId: sessionUser\.id/);
  assert.match(viewerPage, /challengeId: worksheet\.id/);
});

test("Quick Practice remains attempt-driven and existing attempt completion sync stays active", () => {
  const tracking = read("src/lib/workspace-assignment-tracking-rules.ts");
  const attemptRoute = read("src/app/api/challenges/[id]/attempt/route.ts");

  assert.match(tracking, /challengeType === "QUICK_PRACTICE"/);
  assert.match(tracking, /hasCompletedAttempt/);
  assert.match(attemptRoute, /workspaceAssignmentRecipient\.updateMany/);
  assert.match(attemptRoute, /status: "COMPLETED"/);
  assert.match(attemptRoute, /mistakeEntry\.upsert/);
});
