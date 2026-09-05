import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (file: string) => readFileSync(path.join(root, file), "utf8");

const home = read("src/app/workspace/page.tsx");
const classesPage = read("src/app/workspace/classes/page.tsx");
const classesClient = read("src/app/workspace/classes/WorkspaceClassesClient.tsx");
const classPage = read("src/app/workspace/classes/[id]/page.tsx");
const classClient = read("src/app/workspace/classes/[id]/ClassDetailClient.tsx");
const assignmentPage = read("src/app/workspace/classes/[id]/assignments/[batchId]/page.tsx");
const studentsPage = read("src/app/workspace/students/page.tsx");
const studentsClient = read("src/app/workspace/students/StudentsClient.tsx");
const profilePage = read("src/app/workspace/classes/[id]/students/[studentId]/page.tsx");
const profileService = read("src/lib/teacher-class-student-profile.ts");
const trackingService = read("src/lib/workspace-assignment-tracking.ts");

test("teacher home stays protected and derives attention from scoped production data", () => {
  assert.match(home, /getServerSession\(authOptions\)/);
  assert.match(home, /workspace\.findUnique\(\{ where: \{ ownerId: user\.id \} \}\)/);
  assert.match(home, /listActiveWorkspaceScopes\(workspace\.id\)/);
  assert.match(home, /getWorkspaceClassAssignmentTracking/);
  assert.match(home, /buildTeacherAttentionItems/);
  assert.match(home, /Needs attention/);
  assert.doesNotMatch(home, /Alex Smith|John Doe|fake|demo data|unreviewed/i);
});

test("classes remain workspace and academic-scope bound while showing real work summaries", () => {
  assert.match(classesPage, /requireActiveWorkspace\(\)/);
  assert.match(classesPage, /workspaceId: user\.workspaceId/);
  assert.match(classesPage, /subjectId: \{ in: subjectIds \}/);
  assert.match(classesPage, /getWorkspaceClassAssignmentTracking/);
  assert.match(classesPage, /summarizeClassWork/);
  assert.match(classesClient, /Open class/);
  assert.match(classesClient, /workSummary\.pending/);
  assert.match(classesClient, /workSummary\.overdue/);
});

test("class hub prioritizes assigned work without changing class or recipient actions", () => {
  assert.match(classPage, /where: \{ id, workspaceId: user\.workspaceId \}/);
  assert.match(classPage, /requireWorkspaceSubjectScope/);
  assert.match(classPage, /getWorkspaceClassAssignmentTracking/);
  assert.match(classPage, /: "assignments"/);
  assert.match(classClient, /value="assignments"[\s\S]*Assigned Work/);
  assert.match(classClient, /View details/);
  assert.match(classClient, /md:hidden/);
  assert.doesNotMatch(classClient, /opacity-0 group-hover:opacity-100/);
});

test("assignment detail preserves access and calculations while adding actionable hierarchy", () => {
  assert.match(assignmentPage, /requireActiveWorkspace\(\)/);
  assert.match(assignmentPage, /workspaceId: user\.workspaceId/);
  assert.match(assignmentPage, /requireWorkspaceSubjectScope/);
  assert.match(assignmentPage, /getWorkspaceClassAssignmentTracking/);
  assert.match(assignmentPage, /Students who may need attention/);
  assert.match(assignmentPage, /Review answers/);
  assert.match(assignmentPage, /Student Profile/);
  assert.match(trackingService, /revokedAt: null/);
  assert.match(trackingService, /status: "ACTIVE"/);
  assert.match(trackingService, /getAttemptTracking/);
  assert.match(trackingService, /getAssignmentTrackingStatus/);
});

test("all students is clearly workspace-wide and class profile links keep class context", () => {
  assert.match(studentsPage, /requireActiveWorkspace\(\)/);
  assert.match(studentsPage, /workspaceId: user\.workspaceId/);
  assert.match(studentsPage, /status: "ACTIVE"/);
  assert.match(studentsPage, /workspace-wide directory/);
  assert.match(studentsClient, /workspace\/classes\/\$\{classData\.id\}\/students\/\$\{student\.id\}/);
  assert.match(studentsClient, /Open in \{primaryClass\.name\}/);
  assert.match(studentsClient, /md:hidden/);
});

test("class-specific student profile keeps membership scope, review links, and human breadcrumbs", () => {
  assert.match(profileService, /classId,/);
  assert.match(profileService, /studentId,/);
  assert.match(profileService, /workspaceId,/);
  assert.match(profileService, /status: "ACTIVE"/);
  assert.match(profileService, /requireWorkspaceSubjectScope/);
  assert.match(profilePage, /aria-label="Breadcrumb"/);
  assert.match(profilePage, /Learning snapshot/);
  assert.match(profilePage, /Recent Assigned Work/);
  assert.match(profilePage, /Areas to revisit/);
  assert.match(profilePage, /Review Answers/);
  assert.doesNotMatch(profilePage, /Snapshot-backed|scoped candidate|intervention/);
  assert.doesNotMatch(profilePage, /opacity-0 group-hover:opacity-100/);
});

test("human breadcrumb labels preserve established route URLs and never render IDs as copy", () => {
  for (const source of [classClient, assignmentPage, profilePage]) {
    assert.match(source, /aria-label="Breadcrumb"/);
    assert.doesNotMatch(source, />\s*\{classId\}\s*</);
    assert.doesNotMatch(source, />\s*\{studentId\}\s*</);
    assert.doesNotMatch(source, />\s*\{batchId\}\s*</);
  }
  assert.match(assignmentPage, /workspace\/classes\/\$\{classId\}\/students\/\$\{recipient\.studentId\}/);
  assert.match(profilePage, /workspace\/classes\/\$\{profile\.class\.id\}\/assignments\/\$\{assignment\.id\}/);
});

test("touched teacher surfaces do not introduce writes or change paper builder", () => {
  for (const source of [home, classesPage, classPage, assignmentPage, studentsPage, profilePage]) {
    assert.doesNotMatch(source, /\.create\(|\.update\(|\.delete\(|\.upsert\(|\$transaction/);
  }
  assert.doesNotMatch(home, /paper-builder\/actions|ValidatedPaper|BankQuestionType/);
});
