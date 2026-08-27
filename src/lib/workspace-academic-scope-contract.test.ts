import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (file: string) => readFileSync(path.join(root, file), "utf8");

const schema = read("prisma/schema.prisma");
const migration = read(
  "prisma/migrations/20260827120000_add_workspace_academic_scopes/migration.sql",
);
const scopeService = read("src/lib/workspace-academic-scope.ts");
const scopeActions = read("src/app/actions/workspace-academic-scopes.ts");
const workspaceActions = read("src/app/actions/workspace.ts");
const classActions = read("src/app/actions/class.ts");
const bankActions = read("src/app/actions/workspace-bank.ts");
const assessmentActions = read("src/app/actions/workspace-worksheets.ts");
const assignmentActions = read("src/app/actions/workspace-assignments.ts");
const printPage = read("src/app/workspace/print/[id]/page.tsx");
const dashboard = read("src/app/workspace/page.tsx");
const students = read("src/app/workspace/students/page.tsx");

test("schema adds a normalized workspace-to-subject authorization grant", () => {
  const scopeModel = schema.slice(
    schema.indexOf("model WorkspaceAcademicScope"),
    schema.indexOf("model Class", schema.indexOf("model WorkspaceAcademicScope")),
  );
  assert.match(schema, /enum WorkspaceAcademicScopeStatus/);
  assert.match(scopeModel, /model WorkspaceAcademicScope \{/);
  assert.match(scopeModel, /@@unique\(\[workspaceId, subjectId\]\)/);
  assert.match(scopeModel, /assignedById\s+String/);
  assert.doesNotMatch(scopeModel, /boardId/);
  assert.doesNotMatch(scopeModel, /qualificationId/);
});

test("migration is additive and backfills every valid workspace subject source", () => {
  assert.match(migration, /CREATE TABLE "workspace_academic_scopes"/);
  assert.match(migration, /FROM "classes"/);
  assert.match(migration, /FROM "challenges"/);
  assert.match(migration, /FROM "bank_questions"/);
  assert.match(migration, /FROM "workspace_content"/);
  assert.match(migration, /WHERE "role" = 'SUPER_ADMIN'/);
  assert.doesNotMatch(migration, /DROP TABLE|DROP COLUMN|TRUNCATE|DELETE FROM/);
});

test("scope service validates active workspace, published hierarchy, subject, and topic", () => {
  assert.match(scopeService, /workspace: \{ status: "ACTIVE" \}/);
  assert.match(scopeService, /status: "PUBLISHED"/);
  assert.match(scopeService, /qualification: \{ status: "PUBLISHED", board: \{ status: "PUBLISHED" \} \}/);
  assert.match(scopeService, /requireWorkspaceSubjectScope/);
  assert.match(scopeService, /requireWorkspaceTopicScope/);
  assert.match(scopeService, /where: \{ id: topicId, subjectId: scopedSubjectId \}/);
});

test("scope mutations and workspace approval are SUPER_ADMIN protected", () => {
  assert.ok((scopeActions.match(/requireSuperAdmin\(\)/g) || []).length >= 2);
  assert.match(scopeActions, /qualificationId: input\.qualificationId/);
  assert.match(scopeActions, /boardId: input\.boardId/);
  assert.match(workspaceActions, /Assign at least one academic scope before approving this workspace/);
});

test("teacher content creation and listing enforce active subject grants", () => {
  assert.match(classActions, /requireWorkspaceSubjectScope/);
  assert.match(bankActions, /listActiveWorkspaceSubjectIds/);
  assert.match(bankActions, /requireWorkspaceTopicScope/);
  assert.match(assessmentActions, /requireWorkspaceTopicScope/);
  assert.match(assessmentActions, /subjectId,/);
});

test("assignment and print paths reject null or unscoped subjects", () => {
  assert.match(assignmentActions, /This class has no assigned subject and cannot receive work/);
  assert.ok((assignmentActions.match(/requireWorkspaceSubjectScope/g) || []).length >= 2);
  assert.match(printPage, /requireWorkspaceSubjectScope/);
});

test("teacher dashboard and performance queries are scope filtered", () => {
  assert.match(dashboard, /listActiveWorkspaceScopes/);
  assert.match(dashboard, /subjectId: \{ in: subjectIds \}/);
  assert.match(students, /listActiveWorkspaceSubjectIds/);
  assert.match(students, /subjectId: \{ in: subjectIds \}/);
});

test("scope deactivation blocks active dependencies and preserves records", () => {
  assert.match(scopeActions, /getWorkspaceScopeDependencyCounts/);
  assert.match(scopeActions, /scopeDeactivationError/);
  assert.doesNotMatch(scopeActions, /\.delete\(|deleteMany/);
});
