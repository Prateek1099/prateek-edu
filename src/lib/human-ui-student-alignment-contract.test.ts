import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (file: string) => readFileSync(path.join(root, file), "utf8");

const dashboard = read("src/app/dashboard/page.tsx");
const classesPage = read("src/app/dashboard/classes/page.tsx");
const classDetail = read("src/app/dashboard/classes/[id]/page.tsx");
const assignedWork = read("src/app/dashboard/worksheets/page.tsx");
const classService = read("src/lib/student-workspace-classes.ts");
const assignmentService = read("src/lib/workspace-assignment-service.ts");
const publicNav = read("src/components/NavbarClient.tsx");
const appChrome = read("src/components/AppChrome.tsx");
const dashboardLayout = read("src/app/dashboard/layout.tsx");
const studentNav = read("src/components/student/StudentWorkspaceNav.tsx");
const mistakes = read("src/app/dashboard/mistakes/MistakeBookClient.tsx");
const mistakesPage = read("src/app/dashboard/mistakes/page.tsx");
const worksheetControl = read("src/components/worksheets/WorksheetCompletionControl.tsx");
const resultsPage = read("src/app/resources/[board]/[qualification]/[subject]/challenge/[id]/results/[attemptId]/page.tsx");

test("student home puts real assigned work before classes and discovery", () => {
  const today = dashboard.indexOf('aria-labelledby="today-work-heading"');
  const classes = dashboard.indexOf('aria-labelledby="my-classes-heading"');
  const discovery = dashboard.indexOf('aria-labelledby="explore-heading"');
  assert.ok(today > -1 && classes > today && discovery > classes);
  assert.match(dashboard, /orderStudentWork\(assignments, now\)/);
  assert.match(dashboard, /getStudentWorkDisplayState\(assignment, now\)/);
  assert.match(dashboard, /Nothing is waiting for you right now/);
});

test("student work states use actual completion and due dates without fake urgency", () => {
  const rules = read("src/lib/student-work-presentation.ts");
  assert.match(rules, /if \(!assignment\.dueDate\) return "NO_DUE_DATE"/);
  assert.match(rules, /dueDate\.getTime\(\) < now\.getTime\(\)/);
  assert.match(rules, /utcDateKey\(dueDate\) === utcDateKey\(now\)/);
  assert.match(rules, /state === "NO_DUE_DATE"\) return "No due date"/);
  assert.doesNotMatch(dashboard, /recommend|priority score|mastery|risk score/i);
});

test("student-only pages retain authentication and role redirects", () => {
  for (const page of [dashboard, classesPage, classDetail, assignedWork]) {
    assert.match(page, /getServerSession\(authOptions\)/);
    assert.match(page, /redirect\("\/login"\)/);
  }
  for (const page of [classesPage, classDetail, assignedWork]) {
    assert.match(page, /user\.role !== "STUDENT"/);
  }
});

test("class and assignment queries preserve exact active membership and recipient access", () => {
  assert.match(classService, /studentId: userId/);
  assert.match(classService, /status: "ACTIVE"/);
  assert.match(classService, /revokedAt: null/);
  assert.match(classService, /workspaceId: membership\.class\.workspaceId/);
  assert.match(assignmentService, /students: \{ some: \{ studentId: userId, status: "ACTIVE" \} \}/);
  assert.match(assignmentService, /revokedAt: null/);
  assert.match(assignmentService, /status: "ACTIVE"/);
  assert.doesNotMatch(classService, /User\.workspaceId|sessionUser\.workspaceId/);
});

test("practice completion and score summaries reuse the established attempt tracker", () => {
  assert.match(classService, /getAttemptTracking/);
  assert.match(assignmentService, /getAttemptTracking/);
  assert.match(assignmentService, /attemptTracking\.attemptCount > 0/);
  assert.match(assignmentService, /latestPercentage: latestAttempt\.percentage/);
  assert.match(assignmentService, /bestPercentage: attemptTracking\.bestPercentage/);
  assert.match(assignedWork, /Latest \$\{Math\.round\(assignment\.attemptSummary\.latestPercentage\)\}% · Best/);
});

test("student class and assigned work are compact, segmented, and action-led", () => {
  assert.match(classDetail, />To do</);
  assert.match(classDetail, />Completed</);
  assert.match(assignedWork, />To do</);
  assert.match(assignedWork, />Completed</);
  assert.match(assignedWork, /StudentAssignmentRow/);
  assert.match(assignedWork, /Open worksheet/);
  assert.match(assignedWork, /Start practice/);
  assert.match(assignedWork, /Review answers/);
  assert.doesNotMatch(assignedWork, /Attempts: 0|Latest score: —|Best score: —/);
});

test("dashboard has a dedicated student workspace shell without public chrome", () => {
  assert.match(appChrome, /\["\/admin", "\/workspace", "\/dashboard"\]/);
  assert.match(dashboardLayout, /<StudentWorkspaceNav \/>/);
  assert.doesNotMatch(dashboardLayout, /<Footer|<Navbar|GlobalSearch|EcosystemSwitcher/);
});

test("student workspace navigation contains only primary student tasks", () => {
  for (const item of [
    '{ label: "Home", href: "/dashboard" }',
    '{ label: "My Classes", href: "/dashboard/classes" }',
    '{ label: "Assigned Work", href: "/dashboard/worksheets" }',
    '{ label: "Mistake Book", href: "/dashboard/mistakes" }',
  ]) {
    assert.ok(studentNav.includes(item), `${item} should remain in student navigation`);
  }
  assert.doesNotMatch(studentNav, /GlobalSearch|EcosystemSwitcher|\/resources|\/courses/);
  assert.match(studentNav, /aria-label="Student workspace"/);
  assert.match(studentNav, /aria-label="Student workspace mobile"/);
  assert.match(studentNav, /aria-current=\{active \? "page" : undefined\}/);
});

test("student workspace navigation keeps comfortable desktop rhythm and switches before tablet links crowd", () => {
  assert.match(studentNav, /max-w-6xl/);
  assert.match(studentNav, /gap-8 xl:gap-9/);
  assert.match(studentNav, /gap-2 lg:flex xl:gap-3/);
  assert.match(studentNav, /whitespace-nowrap/);
  assert.match(studentNav, /ml-auto flex shrink-0 items-center gap-2/);
  assert.match(studentNav, /lg:hidden/);
});

test("public Vexa navigation keeps global discovery outside the student workspace", () => {
  assert.match(publicNav, /GlobalSearchTrigger/);
  assert.match(publicNav, /EcosystemSwitcher/);
  assert.match(publicNav, /label: "Courses", href: "\/courses"/);
  assert.match(publicNav, /routes\.push\(\{ label: 'Resources', href: '\/resources' \}\)/);
  assert.doesNotMatch(publicNav, /label: "My Classes"|label: "Assigned Work"|label: "Mistake Book"/);
});

test("Mistake Book uses learning language and keeps existing status mutation", () => {
  assert.match(mistakes, /Needs review/);
  assert.match(mistakes, /Mark revised/);
  assert.match(mistakes, /Your answer/);
  assert.match(mistakes, /Correct answer/);
  assert.match(mistakes, /Explanation/);
  assert.match(mistakes, /method: "PATCH"/);
  assert.match(mistakes, /body: JSON\.stringify\(\{ id, status: newStatus \}\)/);
  assert.doesNotMatch(mistakes, /Preserved attempt snapshot|immutable answer|snapshot-backed/i);
});

test("zero-mistake state is compact while non-zero accounts keep their summary", () => {
  assert.match(mistakesPage, /\{total > 0 \? \(/);
  assert.match(mistakesPage, /aria-label="Mistake Book summary"/);
  assert.match(mistakes, /if \(mistakes\.length === 0\)/);
  assert.match(mistakes, /No mistakes to review yet/);
  assert.match(mistakes, /Questions you miss in practice will appear here automatically/);
  assert.doesNotMatch(mistakes, /py-16 text-center/);
});

test("worksheet completion and result ownership semantics remain unchanged", () => {
  assert.match(worksheetControl, /markAssignedWorksheetDone\(recipientId\)/);
  assert.match(worksheetControl, /initialCompleted/);
  assert.match(resultsPage, /attempt\.userId !== userId/);
  assert.match(resultsPage, /attempt\.challengeId !== id/);
  assert.match(resultsPage, /canAccessChallengeOrWorksheet/);
  assert.match(resultsPage, /where: \{[\s\S]*userId,[\s\S]*questionId:/);
});

test("student presentation introduces no persistence or schema-facing writes", () => {
  for (const page of [dashboard, classesPage, classDetail, assignedWork]) {
    assert.doesNotMatch(page, /\.create\(|\.update\(|\.delete\(|\.upsert\(|\$transaction/);
  }
});
