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
const assignmentActions = read("src/app/actions/workspace-assignments.ts");
const classDetail = read("src/app/workspace/classes/[id]/page.tsx");
const studentDirectory = read("src/app/workspace/students/page.tsx");
const studentProfile = read("src/app/workspace/students/[id]/page.tsx");

test("workspace resource routes share the centralized access service", () => {
  for (const source of [challengePage, attemptPage, resultsPage, worksheetPage, attemptRoute]) {
    assert.match(source, /canAccessChallengeOrWorksheet/);
    assert.doesNotMatch(source, /sessionUser\.workspaceId\s*===/);
  }
});

test("student access uses exact assignment and active relational membership", () => {
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
  assert.match(classActions, /randomInt/);
  assert.doesNotMatch(classActions, /Math\.random/);
  assert.match(classActions, /user\.role !== "STUDENT"/);
  assert.match(classActions, /prisma\.\$transaction/);
  assert.match(classActions, /isolationLevel: "Serializable"/);
  assert.match(classActions, /classStudent\.count/);
});

test("class assignment display is scoped to the teacher workspace", () => {
  assert.match(classDetail, /worksheet: \{ workspaceId: workspace\.id \}/);
});

test("assignment removal verifies teacher worksheet and active student membership", () => {
  assert.match(assignmentActions, /worksheet\.workspaceId !== user\.workspaceId/);
  assert.match(assignmentActions, /classStudent\.findFirst/);
  assert.match(assignmentActions, /studentId: userId/);
  assert.match(assignmentActions, /class: \{ workspaceId: user\.workspaceId, status: "ACTIVE" \}/);
});

test("teacher student performance includes only teacher-owned workspace challenges", () => {
  for (const source of [studentDirectory, studentProfile]) {
    assert.match(source, /challenge: \{ workspaceId: workspace\.id \}/);
    assert.doesNotMatch(source, /subject: \{ classes:/);
  }
});
