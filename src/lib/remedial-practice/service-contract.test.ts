import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (file: string) => readFileSync(path.join(root, file), "utf8");

const service = read("src/lib/remedial-practice/service.ts");
const detailPage = read("src/app/workspace/classes/[id]/assignments/[batchId]/page.tsx");
const remedialPage = read("src/app/workspace/classes/[id]/assignments/[batchId]/remedial/page.tsx");
const remedialAction = read("src/app/workspace/classes/[id]/assignments/[batchId]/remedial/actions.ts");
const attemptRoute = read("src/app/api/challenges/[id]/attempt/route.ts");
const access = read("src/lib/challenge-access.ts");
const tracking = read("src/lib/workspace-assignment-tracking.ts");

test("remedial entry point and every read/write path require an active teacher workspace", () => {
  assert.match(detailPage, /Create follow-up practice/);
  assert.match(remedialPage, /getTeacherRemedialPracticeContext/);
  assert.match(remedialAction, /createTeacherRemedialPractice/);
  assert.ok((service.match(/requireActiveWorkspace\(\)/g) ?? []).length >= 2);
});

test("source assignment is exact-class, exact-workspace Quick Practice only", () => {
  assert.match(service, /id: batchId/);
  assert.match(service, /classId/);
  assert.match(service, /workspaceId/);
  assert.match(service, /class: \{ id: classId, workspaceId, status: "ACTIVE"/);
  assert.match(service, /challenge: \{ workspaceId, type: "QUICK_PRACTICE" \}/);
  assert.match(service, /requireWorkspaceSubjectScope\(workspaceId, batch\.challenge\.subjectId, db\)/);
});

test("mistake evidence is restricted to active exact recipients and post-assignment attempts", () => {
  assert.match(service, /revokedAt: null/);
  assert.match(service, /classEnrollments: \{ some: \{ classId, status: "ACTIVE" \} \}/);
  assert.match(service, /userId: \{ in: batch\.recipients\.map/);
  assert.match(service, /extractRemedialWrongAnswerEvidence/);
});

test("candidate queries are MCQ-only, weak-topic scoped, and global-or-current-workspace only", () => {
  assert.match(service, /subjectId: batch\.challenge\.subjectId/);
  assert.match(service, /topicId: \{ in: weakTopicIds \}/);
  assert.match(service, /questionType: "MCQ"/);
  assert.match(service, /OR: \[\{ workspaceId: null \}, \{ workspaceId \}\]/);
  assert.match(service, /isMcqCompatibleQuestion/);
});

test("final submission revalidates recipients, questions, topics, duplicates, and ownership", () => {
  assert.match(service, /validateRemedialSelection/);
  assert.match(service, /Every selected student must be active in this exact class/);
  assert.match(service, /loaded\.context\.weakTopics\.some/);
  assert.match(service, /question\.workspaceId !== null && question\.workspaceId !== user\.workspaceId/);
  assert.match(service, /unique normalized question text/);
  assert.match(service, /isolationLevel: "Serializable"/);
});

test("explicit confirmation atomically creates normal private-workspace Quick Practice and selected assignment", () => {
  assert.match(service, /tx\.challenge\.create/);
  assert.match(service, /type: "QUICK_PRACTICE"/);
  assert.match(service, /isPublished: true/);
  assert.match(service, /workspaceId: user\.workspaceId/);
  assert.match(service, /tx\.workspaceAssignmentBatch\.create/);
  assert.match(service, /audience: "SELECTED_STUDENTS"/);
  assert.match(service, /includeLateJoiners: false/);
  assert.match(service, /recipients:/);
  assert.doesNotMatch(service, /worksheetAssignment\.create|studentReflection\.create/);
});

test("existing student access, attempts, tracking, and Mistake Book remain the execution path", () => {
  assert.match(access, /workspaceAssignmentRecipient\.findFirst/);
  assert.match(access, /revokedAt: null/);
  assert.match(attemptRoute, /MistakeEntry|mistakeEntry/);
  assert.match(attemptRoute, /workspaceAssignmentRecipient\.updateMany/);
  assert.match(tracking, /challengeAttempt\.findMany/);
  assert.doesNotMatch(service, /challengeAttempt\.create|mistakeEntry\.(create|upsert)|workspaceAssignmentRecipient\.updateMany/);
});

test("Phase 1 introduces no remedial schema flag or separate student route", () => {
  const schema = read("prisma/schema.prisma");
  assert.doesNotMatch(schema, /isRemedial|REMEDIAL_PRACTICE|RemedialAssignment/);
  assert.match(service, /Remedial Practice:/);
  assert.equal(existsSync(path.join(root, "src/app/dashboard/remedial")), false);
});
