import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (file: string) => readFileSync(path.join(root, file), "utf8");

const schema = read("prisma/schema.prisma");
const migration = read(
  "prisma/migrations/20260826120000_add_workspace_assignment_batches/migration.sql",
);
const actions = read("src/app/actions/workspace-assignments.ts");
const classActions = read("src/app/actions/class.ts");
const access = read("src/lib/challenge-access.ts");
const service = read("src/lib/workspace-assignment-service.ts");
const attemptRoute = read("src/app/api/challenges/[id]/attempt/route.ts");
const workspaceContentActions = read("src/app/actions/workspace-worksheets.ts");
const studentDashboard = read("src/app/dashboard/page.tsx");
const studentWork = read("src/app/dashboard/worksheets/page.tsx");
const remedialService = read("src/lib/remedial-worksheets/service.ts");

test("migration is additive and leaves the legacy assignment table untouched", () => {
  assert.match(migration, /CREATE TABLE "workspace_assignment_batches"/);
  assert.match(migration, /CREATE TABLE "workspace_assignment_recipients"/);
  assert.doesNotMatch(migration, /DROP TABLE|ALTER TABLE "worksheet_assignments"/);
  assert.match(schema, /model WorksheetAssignment \{/);
  assert.match(schema, /model WorkspaceAssignmentBatch \{/);
  assert.match(schema, /model WorkspaceAssignmentRecipient \{/);
});

test("assignment creation verifies active exact workspace class and published owned content", () => {
  assert.match(actions, /requireActiveWorkspace/);
  assert.match(actions, /workspaceId: user\.workspaceId/);
  assert.match(actions, /status: "ACTIVE"/);
  assert.match(actions, /challenge\.workspaceId !== user\.workspaceId/);
  assert.match(actions, /!challenge\.isPublished/);
  assert.match(actions, /isWorkspaceAssignableChallengeType/);
  assert.match(actions, /classData\.subjectId !== challenge\.subjectId/);
});

test("selected recipients must be active members of the exact class", () => {
  assert.match(actions, /activeStudentIds\.includes\(studentId\)/);
  assert.match(actions, /Every selected student must be active in this exact class/);
  assert.match(actions, /audience: input\.audience/);
});

test("new assignments write only durable batches and recipients", () => {
  const createAt = actions.indexOf("createWorkspaceAssignment");
  const legacyCompatibilityAt = actions.indexOf("Legacy compatibility");
  const newWritePath = actions.slice(createAt, legacyCompatibilityAt);
  assert.match(newWritePath, /workspaceAssignmentBatch\.(findFirst|create)/);
  assert.match(newWritePath, /workspaceAssignmentRecipient\.createMany/);
  assert.doesNotMatch(newWritePath, /worksheetAssignment\.create/);
  assert.match(actions, /isolationLevel: "Serializable"/);
});

test("duplicate submissions reuse an active class-content batch", () => {
  assert.match(actions, /workspaceAssignmentBatch\.findFirst/);
  assert.match(actions, /classId: classData\.id/);
  assert.match(actions, /challengeId: challenge\.id/);
  assert.match(actions, /skipDuplicates: true/);
  assert.match(actions, /keepExistingClassAudience/);
  assert.match(actions, /input\.audience === "CLASS" \? activeStudentIds : recipientIds/);
});

test("late joiners receive only eligible active class-wide batches", () => {
  assert.match(service, /audience: "CLASS"/);
  assert.match(service, /includeLateJoiners: true/);
  assert.match(service, /status: "ACTIVE"/);
  assert.match(service, /OR: \[\{ dueDate: null \}, \{ dueDate: \{ gte: now \} \}\]/);
  assert.equal((classActions.match(/syncLateJoinerAssignmentRecipients/g) || []).length, 3);
});

test("student access uses active exact-class durable recipients and keeps legacy compatibility", () => {
  assert.match(access, /workspaceAssignmentRecipient\.findFirst/);
  assert.match(access, /revokedAt: null/);
  assert.match(access, /challengeId: challenge\.id/);
  assert.match(access, /students: \{ some: \{ studentId: userId, status: "ACTIVE" \} \}/);
  assert.match(access, /worksheetAssignment\.findUnique/);
  assert.doesNotMatch(access, /user\.workspaceId|sessionUser\.workspaceId/);
});

test("student assignment listings enforce exact active membership and active publication", () => {
  assert.match(service, /workspaceAssignmentRecipient\.findMany/);
  assert.match(service, /students: \{ some: \{ studentId: userId, status: "ACTIVE" \} \}/);
  assert.match(service, /workspace: \{ status: "ACTIVE" \}/);
  assert.match(service, /challenge: \{ isPublished: true \}/);
  assert.match(studentDashboard, /Assigned Work/);
  assert.match(studentWork, /use Mark as Done when you finish/);
});

test("cancel and recipient revoke preserve assignment history", () => {
  assert.match(actions, /status: "CANCELLED", cancelledAt: new Date\(\)/);
  assert.match(actions, /data: \{ revokedAt: new Date\(\) \}/);
  assert.doesNotMatch(actions, /workspaceAssignmentBatch\.delete/);
  assert.doesNotMatch(actions, /workspaceAssignmentRecipient\.delete/);
});

test("interactive attempt atomically completes durable recipients while document scoring stays blocked", () => {
  assert.match(attemptRoute, /prisma\.\$transaction/);
  assert.match(attemptRoute, /tx\.workspaceAssignmentRecipient\.updateMany/);
  assert.match(attemptRoute, /status: "COMPLETED"/);
  assert.match(attemptRoute, /completedAt: new Date\(\)/);
  assert.match(attemptRoute, /isInteractiveChallengeType/);
  assert.match(attemptRoute, /Document worksheets cannot be submitted through challenge scoring/);
});

test("teacher hard deletion is blocked when durable assignment history exists", () => {
  assert.match(workspaceContentActions, /assignmentBatches: true/);
  assert.match(workspaceContentActions, /has assignment or student history/);
});

test("global remedial drafts stay unassignable", () => {
  assert.match(remedialService, /workspaceId: null/);
  assert.match(remedialService, /isPublished: false/);
  assert.match(actions, /challenge\.workspaceId !== user\.workspaceId/);
  assert.match(actions, /!challenge\.isPublished/);
});
