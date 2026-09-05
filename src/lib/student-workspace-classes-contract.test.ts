import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (file: string) => readFileSync(path.join(root, file), "utf8");

const service = read("src/lib/student-workspace-classes.ts");
const classesPage = read("src/app/dashboard/classes/page.tsx");
const classDetailPage = read("src/app/dashboard/classes/[id]/page.tsx");
const studentDashboard = read("src/app/dashboard/page.tsx");
const assignedWorkPage = read("src/app/dashboard/worksheets/page.tsx");
const teacherDashboard = read("src/app/workspace/page.tsx");
const joinAction = read("src/app/actions/class.ts");

test("student class list uses only active memberships and active classes/workspaces", () => {
  assert.match(service, /studentId/);
  assert.match(service, /status: "ACTIVE"/);
  assert.match(service, /class: \{ status: "ACTIVE", workspace: \{ status: "ACTIVE" \} \}/);
  assert.doesNotMatch(service, /user\.workspaceId|sessionUser\.workspaceId/);
});

test("class assignments require exact membership and hide revoked, cancelled, and unpublished work", () => {
  assert.match(service, /classId/);
  assert.match(service, /revokedAt: null/);
  assert.match(service, /batch: \{/);
  assert.match(service, /status: "ACTIVE"/);
  assert.match(service, /students: \{ some: \{ studentId: userId, status: "ACTIVE" \} \}/);
  assert.match(service, /challenge: \{[\s\S]*?isPublished: true/);
  assert.match(service, /type: \{ in: \["WORKSHEET", "PDF_WORKSHEET", "QUICK_PRACTICE"\] \}/);
  assert.match(service, /recipient\.batch\.workspaceId !== expectedWorkspaceId/);
  assert.match(service, /recipient\.batch\.challenge\.workspaceId !== expectedWorkspaceId/);
  assert.match(service, /workspaceId: membership\.class\.workspaceId/);
  assert.doesNotMatch(service, /worksheetAssignment/);
});

test("student pages expose class cards, exact class work, and honest document tracking", () => {
  assert.match(classesPage, /My Classes/);
  assert.match(classesPage, /assignmentCounts\.pending/);
  assert.match(classesPage, /assignmentCounts\.completed/);
  assert.match(classesPage, /assignmentCounts\.overdue/);
  assert.match(classDetailPage, /Only work assigned to you in this class appears here/);
  assert.match(classDetailPage, /use Mark as Done when you finish/);
  assert.match(studentDashboard, /href=\{`\/dashboard\/classes\/\$\{studentClass\.id\}`\}/);
});

test("existing Join Class and consolidated Assigned Work flows remain available", () => {
  assert.match(studentDashboard, /href="\/dashboard\/join"/);
  assert.match(joinAction, /Only student accounts can join a class/);
  assert.match(assignedWorkPage, /getStudentWorkspaceAssignments/);
  assert.match(assignedWorkPage, /use Mark as Done when you finish/);
});

test("teacher dashboard contains no named demo students or fabricated AI insight", () => {
  for (const fakeValue of ["Alex Smith", "John Doe", "Missing HW", "45% Avg", "Logic Gates", "AI Insight"]) {
    assert.doesNotMatch(teacherDashboard, new RegExp(fakeValue));
  }
  assert.match(teacherDashboard, /workspaceId: workspace\.id/);
  assert.match(teacherDashboard, /Activity will appear after students join or you create and assign work/);
  assert.match(teacherDashboard, /No active assigned work currently needs attention/);
  assert.doesNotMatch(teacherDashboard, /No intervention data yet/);
});
