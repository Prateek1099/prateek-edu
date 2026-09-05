import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(path, "utf8");

const page = read("src/app/workspace/classes/[id]/students/[studentId]/page.tsx");
const service = read("src/lib/teacher-class-student-profile.ts");
const classPage = read("src/app/workspace/classes/[id]/page.tsx");
const classClient = read("src/app/workspace/classes/[id]/ClassDetailClient.tsx");
const assignmentPage = read(
  "src/app/workspace/classes/[id]/assignments/[batchId]/page.tsx",
);
const legacyProfile = read("src/app/workspace/students/[id]/page.tsx");

test("teacher class student profile requires the active teacher workspace", () => {
  assert.match(page, /requireActiveWorkspace\(\)/);
  assert.match(page, /workspaceId: user\.workspaceId/);
  assert.match(service, /workspace: \{ status: "ACTIVE" \}/);
  assert.doesNotMatch(page, /workspaceId.*searchParams|workspaceId.*params/);
});

test("service rejects cross-workspace, cross-class, unrelated, and inactive students", () => {
  assert.match(service, /classId,/);
  assert.match(service, /studentId,/);
  assert.match(service, /status: "ACTIVE"/);
  assert.match(service, /workspaceId,/);
  assert.match(service, /student: \{ role: "STUDENT" \}/);
  assert.match(service, /requireWorkspaceSubjectScope\(workspaceId, membership\.class\.subjectId\)/);
  assert.match(service, /candidate\.studentId === studentId/);
});

test("profile reuses class assignment tracking and remains read-only", () => {
  assert.match(service, /getWorkspaceClassAssignmentTracking/);
  assert.match(service, /workspaceId,/);
  assert.match(service, /classId,/);
  assert.doesNotMatch(service, /\.create\(|\.update\(|\.delete\(|\.upsert\(|\$transaction/);
  assert.doesNotMatch(page, /"use server"|action=/);
});

test("profile shows all approved statuses, attempt metrics, review states, and empty states", () => {
  for (const copy of [
    "Assigned Work",
    "Areas to revisit",
    "Review answers",
    "Open assignment",
    "This student has no assigned work in this class yet.",
    "Not attempted yet",
    "Detailed answer review was not captured for this older attempt.",
    "No recorded mistakes yet. They’ll appear after this student completes assigned practice.",
  ]) {
    assert.match(page, new RegExp(copy.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(page, /latestPercentage/);
  assert.match(page, /bestPercentage/);
  assert.match(page, /attemptCount/);
  assert.match(page, /mistakesCount/);
  assert.match(page, /latestAttemptAt/);
});

test("class member list and assignment detail provide class-scoped profile entry points", () => {
  assert.match(classClient, /workspace\/classes\/\$\{classData\.id\}\/students\/\$\{enrollment\.student\.id\}/);
  assert.match(classClient, />View Profile</);
  assert.match(assignmentPage, /workspace\/classes\/\$\{classId\}\/students\/\$\{recipient\.studentId\}/);
  assert.match(assignmentPage, /aria-label="Open Student Profile"/);
  assert.match(assignmentPage, /View student/);
});

test("review shortcut safely focuses the matching assignment recipient", () => {
  assert.match(page, /studentId=\$\{profile\.student\.id\}#answer-review-\$\{profile\.student\.id\}/);
  assert.match(assignmentPage, /typeof query\.studentId === "string"/);
  assert.match(assignmentPage, /assignment\.recipients\.some/);
  assert.match(assignmentPage, /id=\{`answer-review-\$\{recipient\.studentId\}`\}/);
  assert.match(assignmentPage, /open=\{focusedStudentId === recipient\.studentId\}/);
});

test("back links open the exact class and its Assigned Work tab", () => {
  assert.match(page, /Back to Class/);
  assert.match(page, /tab=assignments#assigned-work/);
  assert.match(classPage, /query\.tab === "assignments"/);
  assert.match(classClient, /defaultValue=\{defaultTab\}/);
  assert.match(classClient, /id="assigned-work"/);
});

test("legacy workspace student profile redirects into one class-scoped experience", () => {
  assert.match(legacyProfile, /requireActiveWorkspace/);
  assert.match(legacyProfile, /listActiveWorkspaceSubjectIds/);
  assert.match(legacyProfile, /workspaceId: user\.workspaceId/);
  assert.match(legacyProfile, /status: "ACTIVE"/);
  assert.match(legacyProfile, /redirect\(`\/workspace\/classes\/\$\{membership\.classId\}\/students\/\$\{studentId\}`\)/);
});

test("responsive profile uses compact rows and avoids a wide data table", () => {
  assert.match(page, /divide-y overflow-hidden rounded-xl border bg-card/);
  assert.match(page, /Learning snapshot/);
  assert.match(page, /flex flex-col gap-2 sm:flex-row/);
  assert.doesNotMatch(page, /<Table|overflow-x-auto/);
});

test("class entry point uses deterministic dates during server and client rendering", () => {
  assert.match(classClient, /function formatClassDate/);
  assert.match(classClient, /getUTCDate/);
  assert.doesNotMatch(classClient, /toLocaleDateString/);
});
