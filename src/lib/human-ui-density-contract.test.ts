import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (file: string) => readFileSync(path.join(root, file), "utf8");

const practicePage = read("src/app/workspace/quick-practice/page.tsx");
const practiceClient = read("src/app/workspace/quick-practice/QuickPracticeClient.tsx");
const studentProfile = read("src/app/workspace/classes/[id]/students/[studentId]/page.tsx");
const assignmentDetail = read("src/app/workspace/classes/[id]/assignments/[batchId]/page.tsx");
const trackingService = read("src/lib/workspace-assignment-tracking.ts");
const profileService = read("src/lib/teacher-class-student-profile.ts");

test("practice worklist keeps workspace and academic scope while batching assignment context", () => {
  assert.match(practicePage, /requireActiveWorkspace\(\)/);
  assert.match(practicePage, /listActiveWorkspaceScopes/);
  assert.match(practicePage, /workspaceId: user\.workspaceId/);
  assert.match(practicePage, /status: "ACTIVE"/);
  assert.match(practicePage, /revokedAt: null/);
  assert.match(practicePage, /activeStudentIds/);
  assert.match(practicePage, /assignmentBatches: \{[\s\S]*status: "ACTIVE"/);
  assert.match(practicePage, /class: \{ workspaceId: user\.workspaceId, status: "ACTIVE" \}/);
  assert.match(practicePage, /recipients: \{[\s\S]*where: \{ revokedAt: null \}/);
  assert.match(practicePage, /const contexts = new Map/);
  assert.doesNotMatch(practicePage, /practices\.map\([\s\S]*prisma\./);
});

test("legacy assignment usage requires the established active workspace membership boundary", () => {
  assert.match(practicePage, /assignments: \{[\s\S]*where: \{/);
  assert.match(practicePage, /user: \{[\s\S]*classEnrollments: \{/);
  assert.match(practicePage, /some: \{[\s\S]*status: "ACTIVE"/);
  assert.match(practicePage, /workspaceId: user\.workspaceId/);
  assert.match(practicePage, /class: \{[\s\S]*status: "ACTIVE"/);
  assert.match(practicePage, /workspace: \{ status: "ACTIVE" \}/);
  assert.match(practicePage, /validLegacyAssignmentCount: practice\._count\.assignments/);
  assert.doesNotMatch(practicePage, /assignments: true/);
});

test("practice worklist exposes real segments and composable filters", () => {
  assert.match(practiceClient, /All/);
  assert.match(practiceClient, /Unassigned/);
  assert.match(practiceClient, /Assigned/);
  assert.match(practiceClient, /practice-class-filter/);
  assert.match(practiceClient, /practice-subject-filter/);
  assert.match(practiceClient, /practice-topic-filter/);
  assert.match(practiceClient, /practice-difficulty-filter/);
  assert.match(practiceClient, /filterPracticeSets/);
});

test("practice items remain reusable content and multi-class context does not duplicate rows", () => {
  assert.match(practiceClient, /filteredPractices\.map/);
  assert.match(practiceClient, /assignmentContexts\.map/);
  assert.match(practiceClient, /Assigned to \{practice\.assignmentContexts\.length\} classes/);
  assert.doesNotMatch(practiceClient, /assignmentContexts\.flatMap\([\s\S]*<article/);
});

test("practice worklist keeps primary and secondary actions without card-wall density", () => {
  assert.match(practiceClient, /AssignContentDialog/);
  assert.match(practiceClient, /href=\{`\/workspace\/print\/\$\{practice\.id\}`\}/);
  assert.match(practiceClient, /aria-label=\{`Delete \$\{practice\.title\}`\}/);
  assert.match(practiceClient, /divide-y/);
  assert.doesNotMatch(practiceClient, /<Card key=\{w\.id\}/);
});

test("practice empty states distinguish unassigned, assigned, and filtered results", () => {
  assert.match(practiceClient, /No unassigned practice sets/);
  assert.match(practiceClient, /Everything here has already been used with a class/);
  assert.match(practiceClient, /No assigned practice sets yet/);
  assert.match(practiceClient, /No practice sets match these filters/);
  assert.match(practiceClient, /Clear filters/);
});

test("student profile groups work by existing status and removes untouched metric grids", () => {
  assert.match(studentProfile, /groupStudentAssignments/);
  assert.match(studentProfile, /Needs attention/);
  assert.match(studentProfile, /In progress/);
  assert.match(studentProfile, /Completed/);
  assert.match(studentProfile, /Not attempted yet/);
  assert.match(studentProfile, /Latest \{assignment\.recipient\.latestPercentage\}% · Best/);
  assert.doesNotMatch(studentProfile, /grid grid-cols-2 gap-3 text-sm sm:grid-cols-3/);
});

test("class-specific profile and review routes remain access-scoped", () => {
  assert.match(profileService, /workspaceId,/);
  assert.match(profileService, /classId,/);
  assert.match(profileService, /studentId,/);
  assert.match(profileService, /status: "ACTIVE"/);
  assert.match(studentProfile, /workspace\/classes\/\$\{profile\.class\.id\}\/assignments\/\$\{assignment\.id\}/);
});

test("assignment detail groups compact recipient rows and retains progressive answer review", () => {
  assert.match(assignmentDetail, /groupAssignmentRecipients/);
  assert.match(assignmentDetail, /Needs attention/);
  assert.match(assignmentDetail, /Pending/);
  assert.match(assignmentDetail, /Completed/);
  assert.match(assignmentDetail, /No attempt yet/);
  assert.match(assignmentDetail, /Answer details/);
  assert.match(assignmentDetail, /Review answers/);
  assert.match(assignmentDetail, /workspace\/classes\/\$\{classId\}\/students\/\$\{recipient\.studentId\}/);
  assert.doesNotMatch(assignmentDetail, /repeat\(4,minmax\(0,1fr\)\)/);
});

test("tracking calculations and recipient visibility remain in the established service", () => {
  assert.match(trackingService, /revokedAt: null/);
  assert.match(trackingService, /status: "ACTIVE"/);
  assert.match(trackingService, /getAttemptTracking/);
  assert.match(trackingService, /getAssignmentTrackingStatus/);
  assert.match(trackingService, /summarizeTrackedRecipients/);
  assert.doesNotMatch(assignmentDetail, /prisma\.challengeAttempt/);
});

test("density-only surfaces introduce no persistence", () => {
  for (const source of [practicePage, studentProfile, assignmentDetail]) {
    assert.doesNotMatch(source, /\.create\(|\.update\(|\.delete\(|\.upsert\(|\$transaction/);
  }
});
