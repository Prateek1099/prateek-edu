import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (file: string) => readFileSync(path.join(root, file), "utf8");

const page = read("src/app/workspace/paper-builder/blueprint/page.tsx");
const client = read("src/app/workspace/paper-builder/blueprint/BlueprintBuilderClient.tsx");
const sharedClient = read("src/components/paper-builder/BlueprintBuilderClient.tsx");
const modeNav = read("src/components/paper-builder/PaperBuilderModeNav.tsx");
const requireRole = read("src/lib/require-role.ts");
const workspaceScope = read("src/lib/workspace-academic-scope.ts");
const adminAdapter = read("src/app/admin/paper-builder/blueprint/BlueprintBuilderClient.tsx");
const schema = read("prisma/schema.prisma");

test("teacher Blueprint route requires an active TEACHER workspace", () => {
  assert.match(page, /requireActiveWorkspace\(\)/);
  assert.match(requireRole, /if \(!user \|\| !isTeacher\(user\.role\)\)/);
  assert.match(requireRole, /if \(!user\.workspaceId\)/);
  assert.match(requireRole, /user\.workspaceStatus !== "ACTIVE"/);
  assert.doesNotMatch(page, /requireSuperAdmin|requireAuth/);
});

test("teacher page loads assigned published subjects and exact published topics", () => {
  assert.match(page, /listActiveWorkspaceScopes\(teacher\.workspaceId\)/);
  assert.match(workspaceScope, /workspaceId,[\s\S]*?status: "ACTIVE"/);
  assert.match(workspaceScope, /subject: \{[\s\S]*?status: "PUBLISHED"/);
  assert.match(page, /subjectId: \{ in: subjectIds \}/);
  assert.match(page, /status: "PUBLISHED"/);
  assert.match(page, /qualification: \{[\s\S]*?status: "PUBLISHED"/);
  assert.match(page, /board: \{ status: "PUBLISHED" \}/);
  assert.doesNotMatch(page, /bankQuestion\.findMany/);
});

test("teacher page exposes only active header templates from the current session workspace", () => {
  assert.match(page, /workspacePaperHeaderTemplate\.findMany/);
  assert.match(page, /workspaceId: teacher\.workspaceId, archivedAt: null/);
  assert.doesNotMatch(page, /paperHeaderTemplate\.findMany/);
});

test("teacher adapter injects exactly the four approved A1 actions", () => {
  for (const action of [
    "reviewTeacherBlueprintAvailability",
    "generateTeacherBlueprintPaper",
    "validateTeacherBlueprintSelection",
    "saveTeacherBlueprintGeneratedPaper",
  ]) {
    assert.match(client, new RegExp(action));
  }
  for (const blocked of [
    "getReplacementCandidates",
    "selectCandidate",
    "regenerateRow",
    "regenerateChapter",
    "createTemplate",
    "applyTemplate",
  ]) {
    assert.doesNotMatch(client, new RegExp(`${blocked}:`));
  }
});

test("teacher capability config hides templates, replacement, and regeneration", () => {
  assert.match(client, /templates: false/);
  assert.match(client, /archive: true/);
  assert.match(client, /replacement: false/);
  assert.match(client, /rowRegeneration: false/);
  assert.match(client, /chapterRegeneration: false/);
  assert.match(page, /blueprintTemplates=\{\[\]\}/);
  assert.doesNotMatch(page, /template-actions|BlueprintTemplate/);
});

test("teacher adapter contains only workspace routes and Teacher Paper Archive copy", () => {
  assert.match(client, /`\/workspace\/paper-builder\/archive\/\$\{paperId\}`/);
  assert.match(client, /Teacher Paper Archive/);
  assert.doesNotMatch(`${page}\n${client}`, /@\/app\/admin|\/admin\/paper-builder|SUPER_ADMIN/);
});

test("shared client keeps safe review, output, remove, reorder, print, and DOCX controls", () => {
  assert.match(sharedClient, /reviewAvailabilityAction\(draft\)/);
  assert.match(sharedClient, /generatePaperAction\(draft\)/);
  assert.match(sharedClient, /validateSelectionAction\(draft/);
  assert.match(sharedClient, /saveGeneratedPaperAction\(/);
  assert.match(sharedClient, /onRemove=\{\(rowId, questionId\)/);
  assert.match(sharedClient, /onMove=\{moveQuestion\}/);
  assert.match(sharedClient, /Print question paper/);
  assert.match(sharedClient, /Download Question Paper DOCX/);
  assert.match(sharedClient, /Student paper/);
  assert.match(sharedClient, /Answer key/);
});

test("workspace Paper Builder navigation contains only the five teacher destinations", () => {
  for (const href of [
    "/workspace/paper-builder",
    "/workspace/paper-builder/blueprint",
    "/workspace/paper-builder/templates",
    "/workspace/paper-builder/header-templates",
    "/workspace/paper-builder/archive",
  ]) {
    assert.match(modeNav, new RegExp(`href: "${href.replaceAll("/", "\\/")}"`));
  }
  assert.doesNotMatch(
    modeNav.slice(modeNav.indexOf("WORKSPACE_PAPER_BUILDER_NAV_ITEMS")),
    /\/admin\/paper-builder/,
  );
});

test("admin Blueprint adapter and default navigation remain unchanged", () => {
  assert.match(adminAdapter, /templates: true/);
  assert.match(adminAdapter, /replacement: true/);
  assert.match(adminAdapter, /rowRegeneration: true/);
  assert.match(adminAdapter, /chapterRegeneration: true/);
  for (const href of [
    "/admin/paper-builder",
    "/admin/paper-builder/blueprint",
    "/admin/paper-builder/blueprint/templates",
    "/admin/paper-builder/archive",
  ]) {
    assert.match(modeNav, new RegExp(`href: "${href.replaceAll("/", "\\/")}"`));
  }
});

test("A2 adds no teacher Blueprint schema or persistence model", () => {
  assert.doesNotMatch(schema, /model WorkspacePaperBlueprint|model TeacherPaperBlueprint/);
  assert.doesNotMatch(`${page}\n${client}`, /prisma\..*\.(?:create|update|delete)|Assignment|Attempt|Mistake/);
});
