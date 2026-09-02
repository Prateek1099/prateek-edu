import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (file: string) => readFileSync(path.join(root, file), "utf8");

const accessService = read("src/lib/challenge-access.ts");
const challengePage = read(
  "src/app/resources/[board]/[qualification]/[subject]/challenge/[id]/page.tsx",
);
const attemptPage = read(
  "src/app/resources/[board]/[qualification]/[subject]/challenge/[id]/attempt/page.tsx",
);
const resultsPage = read(
  "src/app/resources/[board]/[qualification]/[subject]/challenge/[id]/results/[attemptId]/page.tsx",
);
const worksheetPage = read(
  "src/app/resources/[board]/[qualification]/[subject]/worksheet/[id]/page.tsx",
);
const attemptRoute = read("src/app/api/challenges/[id]/attempt/route.ts");
const classActions = read("src/app/actions/class.ts");
const joinClassPage = read("src/app/dashboard/join/page.tsx");
const assignmentActions = read("src/app/actions/workspace-assignments.ts");
const classDetail = read("src/app/workspace/classes/[id]/page.tsx");
const assignmentTracking = read("src/lib/workspace-assignment-tracking.ts");
const studentDirectory = read("src/app/workspace/students/page.tsx");
const studentProfile = read("src/app/workspace/students/[id]/page.tsx");
const classStudentProfile = read("src/lib/teacher-class-student-profile.ts");

test("workspace resource routes share the centralized access service", () => {
  for (const source of [challengePage, attemptPage, resultsPage, worksheetPage, attemptRoute]) {
    assert.match(source, /canAccessChallengeOrWorksheet/);
    assert.doesNotMatch(source, /sessionUser\.workspaceId\s*===/);
  }
});

test("student access uses exact assignment and active relational membership", () => {
  assert.match(accessService, /workspaceAssignmentRecipient\.findFirst/);
  assert.match(accessService, /challengeId: challenge\.id/);
  assert.match(accessService, /students: \{ some: \{ studentId: userId, status: "ACTIVE" \} \}/);
  assert.match(accessService, /worksheetAssignment\.findUnique/);
  assert.match(accessService, /userId_worksheetId/);
  assert.match(accessService, /classStudent\.findFirst/);
  assert.match(accessService, /status: "ACTIVE"/);
  assert.doesNotMatch(accessService, /user\.workspaceId|sessionUser\.workspaceId/);
});

test("attempt route authorizes before writes and rejects mutable unsafe states", () => {
  const authorizeAt = attemptRoute.indexOf("canAccessChallengeOrWorksheet");
  const attemptWriteAt = attemptRoute.indexOf("challengeAttempt.create");
  assert.ok(authorizeAt >= 0 && authorizeAt < attemptWriteAt);
  assert.match(attemptRoute, /if \(!challenge\.isPublished\)/);
  assert.match(attemptRoute, /isInteractiveChallengeType\(challenge\.type\)/);
});

test("join class is student-only, securely generated, and transactional", () => {
  const roleCheckAt = classActions.indexOf('user.role !== "STUDENT"');
  const transactionAt = classActions.indexOf("prisma.$transaction", roleCheckAt);

  assert.match(classActions, /randomInt/);
  assert.doesNotMatch(classActions, /Math\.random/);
  assert.match(classActions, /user\.role !== "STUDENT"/);
  assert.ok(roleCheckAt >= 0 && roleCheckAt < transactionAt);
  assert.match(
    classActions,
    /return \{ success: false, error: "Only student accounts can join a class\." \}/,
  );
  assert.doesNotMatch(
    classActions,
    /throw new Error\("Only student accounts can join a class"\)/,
  );
  assert.match(classActions, /prisma\.\$transaction/);
  assert.match(classActions, /isolationLevel: "Serializable"/);
  assert.match(classActions, /classStudent\.count/);
  assert.match(joinClassPage, /if \(!result\.success\)/);
  assert.match(joinClassPage, /setError\(result\.error\)/);
  assert.match(joinClassPage, /role="alert"/);
});

test("class assignment display is scoped to the teacher workspace", () => {
  assert.match(classDetail, /where: \{ id, workspaceId: user\.workspaceId \}/);
  assert.match(classDetail, /getWorkspaceClassAssignmentTracking/);
  assert.match(classDetail, /workspaceId: user\.workspaceId/);
  assert.match(assignmentTracking, /workspaceAssignmentBatch\.findMany/);
  assert.match(assignmentTracking, /class: \{ workspaceId \}/);
  assert.match(assignmentTracking, /challenge: \{ workspaceId \}/);
});

test("assignment cancellation and recipient revocation verify the teacher workspace", () => {
  assert.match(assignmentActions, /cancelWorkspaceAssignment/);
  assert.match(assignmentActions, /revokeWorkspaceAssignmentRecipient/);
  assert.match(assignmentActions, /workspaceId: user\.workspaceId/);
  assert.match(assignmentActions, /status: "CANCELLED"/);
  assert.match(assignmentActions, /revokedAt: new Date/);
});

test("teacher student performance includes only teacher-owned workspace challenges", () => {
  assert.match(studentDirectory, /challenge: \{ workspaceId: user\.workspaceId, subjectId: \{ in: subjectIds \} \}/);
  assert.match(studentDirectory, /listActiveWorkspaceSubjectIds/);
  assert.match(studentProfile, /listActiveWorkspaceSubjectIds/);
  assert.match(studentProfile, /workspaceId: user\.workspaceId/);
  assert.match(classStudentProfile, /getWorkspaceClassAssignmentTracking/);
  assert.match(classStudentProfile, /workspaceId,/);
  assert.match(classStudentProfile, /classId,/);
  assert.doesNotMatch(classStudentProfile, /subject: \{ classes:/);
});
