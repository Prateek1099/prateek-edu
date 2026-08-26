import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (file: string) => readFileSync(path.join(root, file), "utf8");

const dashboard = read("src/app/workspace/page.tsx");
const printPage = read("src/app/workspace/print/[id]/page.tsx");
const worksheetsClient = read("src/app/workspace/worksheets/WorksheetsClient.tsx");
const quickPracticeClient = read("src/app/workspace/quick-practice/QuickPracticeClient.tsx");
const classActions = read("src/app/actions/class.ts");
const worksheetActions = read("src/app/actions/workspace-worksheets.ts");
const assignmentActions = read("src/app/actions/workspace-assignments.ts");
const workspaceSidebar = read("src/components/WorkspaceSidebar.tsx");
const workspaceLayout = read("src/app/workspace/layout.tsx");

test("teacher dashboard shortcuts target the real workspace tools", () => {
  assert.match(dashboard, /href="\/workspace\/worksheets"/);
  assert.match(dashboard, /href="\/workspace\/quick-practice"/);
  assert.match(dashboard, /href="\/workspace\/question-bank"/);
  assert.match(dashboard, /href="\/workspace\/classes"/);
});

test("workspace print route permits only the active teacher's owned content", () => {
  assert.match(printPage, /requireActiveWorkspace/);
  assert.match(printPage, /workspaceId: user\.workspaceId/);
  assert.match(printPage, /type: \{ in: \["WORKSHEET", "QUICK_PRACTICE"\] \}/);
  assert.match(printPage, /if \(!content\) notFound\(\)/);
  assert.doesNotMatch(printPage, /workspaceId: null/);
});

test("workspace cards use the teacher print route instead of the admin route", () => {
  for (const source of [worksheetsClient, quickPracticeClient]) {
    assert.match(source, /href=\{`\/workspace\/print\/\$\{w\.id\}`\}/);
    assert.doesNotMatch(source, /\/admin\/worksheets\/\$\{w\.id\}\/print/);
  }
});

test("Join Class returns friendly expected failures", () => {
  assert.match(classActions, /That class code is invalid\. Check the code and try again\./);
  assert.match(classActions, /This class is full\. Ask your teacher for help\./);
  assert.match(classActions, /You have already joined this class\./);
  assert.match(classActions, /Only student accounts can join a class\./);
  assert.match(classActions, /workspaceActionErrorMessage/);
});

test("class and workspace content creation return structured validation results", () => {
  assert.match(classActions, /Promise<CreateClassResult>/);
  assert.match(classActions, /validateClassAcademicRelationship/);
  assert.match(classActions, /success: false, error/);
  assert.match(worksheetActions, /Promise<CreateWorkspaceChallengeResult>/g);
  assert.match(worksheetActions, /validateWorkspaceAssessmentFields/);
  assert.match(worksheetActions, /questionType: "MCQ"/);
  assert.match(worksheetActions, /workspaceExpectedError/);
});

test("assignment mistakes remain structured while workspace security stays server-side", () => {
  assert.match(assignmentActions, /requireActiveWorkspace/);
  assert.match(assignmentActions, /workspaceId: user\.workspaceId/);
  assert.match(assignmentActions, /Every selected student must be active in this exact class/);
  assert.match(assignmentActions, /workspaceActionErrorMessage/);
  assert.match(assignmentActions, /success: false/);
});

test("teacher workspace has a mobile drawer and print-isolated navigation", () => {
  assert.match(workspaceSidebar, /aria-label="Open workspace navigation"/);
  assert.match(workspaceSidebar, /lg:hidden print:hidden/);
  assert.match(workspaceSidebar, /hidden w-64[\s\S]*lg:flex print:hidden/);
  assert.match(workspaceLayout, /min-w-0 flex-1/);
  assert.match(workspaceLayout, /print:p-0/);
});

test("workspace assessment UI explains publication and assignment visibility", () => {
  const worksheetsPage = read("src/app/workspace/worksheets/page.tsx");
  const quickPracticePage = read("src/app/workspace/quick-practice/page.tsx");
  for (const source of [worksheetsPage, quickPracticePage]) {
    assert.match(source, /Published but private until assigned/);
  }
});
