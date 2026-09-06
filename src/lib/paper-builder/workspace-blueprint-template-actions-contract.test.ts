import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const schema = readFileSync("prisma/schema.prisma", "utf8");
const migration = readFileSync(
  "prisma/migrations/20260831180000_add_workspace_blueprint_templates/migration.sql",
  "utf8",
);
const actions = readFileSync(
  "src/app/workspace/paper-builder/blueprint/templates/actions.ts",
  "utf8",
);
const data = readFileSync(
  "src/lib/paper-builder/workspace-blueprint-template-data.ts",
  "utf8",
);
const teacherPage = readFileSync(
  "src/app/workspace/paper-builder/blueprint/page.tsx",
  "utf8",
);
const teacherAdapter = readFileSync(
  "src/app/workspace/paper-builder/blueprint/BlueprintBuilderClient.tsx",
  "utf8",
);
const managerPage = readFileSync(
  "src/app/workspace/paper-builder/blueprint/templates/page.tsx",
  "utf8",
);
const managerClient = readFileSync(
  "src/app/workspace/paper-builder/blueprint/templates/BlueprintTemplatesManagerClient.tsx",
  "utf8",
);
const sharedClient = readFileSync(
  "src/components/paper-builder/BlueprintBuilderClient.tsx",
  "utf8",
);
const navigation = readFileSync(
  "src/components/paper-builder/PaperBuilderModeNav.tsx",
  "utf8",
);

function modelBlock(name: string) {
  const start = schema.indexOf(`model ${name} {`);
  const end = schema.indexOf("\n}\n", start);
  assert.notEqual(start, -1, `${name} must exist`);
  return schema.slice(start, end + 2);
}

test("migration adds only three workspace Blueprint template tables", () => {
  const createTables = [...migration.matchAll(/CREATE TABLE "([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(createTables, [
    "workspace_blueprint_templates",
    "workspace_blueprint_template_topics",
    "workspace_blueprint_template_rows",
  ]);
  assert.doesNotMatch(migration, /DROP TABLE|DROP COLUMN|ALTER COLUMN|TRUNCATE|DELETE FROM/i);
  assert.match(migration, /ON DELETE RESTRICT/);
});

test("workspace Blueprint template schema stores no question IDs or generated paper state", () => {
  const blocks = [
    modelBlock("WorkspaceBlueprintTemplate"),
    modelBlock("WorkspaceBlueprintTemplateTopic"),
    modelBlock("WorkspaceBlueprintTemplateRow"),
  ].join("\n");
  assert.doesNotMatch(blocks, /questionId|questionIds|generatedPaper|selectedQuestion/i);
  assert.match(blocks, /workspaceId/);
  assert.match(blocks, /createdById/);
  assert.match(blocks, /preferredHeaderTemplateId/);
  assert.match(blocks, /archivedAt/);
});

test("existing admin Blueprint and saved-paper models remain separate", () => {
  assert.match(schema, /model PaperBlueprintTemplate \{/);
  assert.match(schema, /model SavedGeneratedPaper \{/);
  assert.doesNotMatch(modelBlock("PaperBlueprintTemplate"), /workspaceId/);
  assert.doesNotMatch(modelBlock("SavedGeneratedPaper"), /workspaceBlueprintTemplate/);
});

test("every teacher Blueprint template action authenticates an active teacher workspace", () => {
  const exportedActions = [
    "listTeacherBlueprintTemplates",
    "getTeacherBlueprintTemplate",
    "createTeacherBlueprintTemplate",
    "updateTeacherBlueprintTemplate",
    "duplicateTeacherBlueprintTemplate",
    "archiveTeacherBlueprintTemplate",
    "restoreTeacherBlueprintTemplate",
    "applyTeacherBlueprintTemplate",
  ];
  exportedActions.forEach((name) => assert.match(actions, new RegExp(`export async function ${name}`)));
  assert.ok((actions.match(/requireActiveWorkspace\(\)/g) ?? []).length >= 7);
  assert.doesNotMatch(actions, /requireSuperAdmin/);
});

test("workspace ownership is session-derived and cross-workspace records are filtered", () => {
  assert.match(actions, /workspaceId: teacher\.workspaceId/);
  assert.match(actions, /validateWorkspaceBlueprintTemplateInput/);
  assert.match(data, /where: \{ id: templateId, workspaceId, archivedAt: null \}/);
  assert.match(data, /requireWorkspaceSubjectScope\(workspaceId, input\.subjectId\)/);
  assert.match(data, /workspaceId,[\s\S]*archivedAt: null/);
});

test("create and update revalidate published hierarchy, subject scope, topics, and header ownership", () => {
  assert.match(data, /status: "PUBLISHED"/);
  assert.match(data, /subjectId: input\.subjectId/);
  assert.match(data, /topics\.length !== input\.topicIds\.length/);
  assert.match(data, /preferredHeaderTemplateId[\s\S]*workspaceId[\s\S]*archivedAt: null/);
  assert.match(actions, /validateContext\(teacher\.workspaceId, validated\)/);
});

test("archive and restore are soft-only and hard delete is unavailable", () => {
  assert.match(actions, /data: \{ archivedAt: new Date\(\) \}/);
  assert.match(actions, /data: \{ archivedAt: null \}/);
  assert.doesNotMatch(actions, /workspaceBlueprintTemplate\.delete/);
  assert.doesNotMatch(actions, /deleteTeacherBlueprintTemplate/);
});

test("apply returns setup only and blocks stale subject/topic scope", () => {
  assert.match(actions, /applyTeacherBlueprintTemplate/);
  assert.match(data, /This template uses a subject\/topic no longer available to your workspace/);
  assert.match(data, /headerDefaults/);
  assert.match(data, /applyWarnings/);
  assert.doesNotMatch(data, /bankQuestion|questionIds|generatedRows/);
});

test("Teacher Blueprint page exposes template management alongside scoped review tools", () => {
  assert.match(teacherAdapter, /templates: true/);
  assert.match(teacherAdapter, /createTeacherBlueprintTemplate/);
  assert.match(teacherAdapter, /updateTeacherBlueprintTemplate/);
  assert.match(teacherAdapter, /applyTeacherBlueprintTemplate/);
  assert.match(teacherAdapter, /templateManagementHref: "\/workspace\/paper-builder\/blueprint\/templates"/);
  assert.match(teacherAdapter, /replacement: true/);
  assert.match(teacherAdapter, /rowRegeneration: true/);
  assert.match(teacherAdapter, /chapterRegeneration: true/);
  assert.match(sharedClient, /Using chapter pattern/);
  assert.match(sharedClient, /Update pattern/);
  assert.match(sharedClient, /clearGenerated\(\)/);
});

test("teacher template management route supports use, edit, duplicate, archive, and restore", () => {
  assert.match(managerPage, /requireActiveWorkspace/);
  assert.match(managerPage, /mode="blueprint-templates"/);
  ["Use pattern", "Edit", "Duplicate", "Archive", "Restore"].forEach((label) => {
    assert.match(managerClient, new RegExp(`>${label}<|${label}`));
  });
  assert.doesNotMatch(managerClient, /permanent|Delete pattern|hard delete/i);
});

test("teacher navigation shows Saved chapter patterns while admin navigation is unchanged", () => {
  assert.match(navigation, /\/workspace\/paper-builder\/blueprint\/templates/);
  assert.match(navigation, /label: "Saved chapter patterns"/);
  const adminBlock = navigation.slice(
    navigation.indexOf("ADMIN_PAPER_BUILDER_NAV_ITEMS"),
    navigation.indexOf("WORKSPACE_PAPER_BUILDER_NAV_ITEMS"),
  );
  assert.doesNotMatch(adminBlock, /\/workspace\//);
  assert.match(adminBlock, /\/admin\/paper-builder\/blueprint\/templates/);
});

test("page data exposes only assigned published subjects and topics", () => {
  assert.match(teacherPage, /listActiveWorkspaceScopes/);
  assert.match(teacherPage, /listWorkspaceBlueprintTemplateSummaries/);
  assert.match(teacherPage, /getWorkspaceBlueprintTemplateSnapshot/);
  assert.match(teacherPage, /initialBlueprintTemplate=\{initialBlueprintTemplate\}/);
  assert.match(managerPage, /listActiveWorkspaceScopes/);
  assert.match(managerPage, /status: "PUBLISHED"/);
});

test("no teacher Blueprint template path generates questions or assigns student work", () => {
  const implementation = [actions, data, managerClient].join("\n");
  assert.doesNotMatch(implementation, /generateTeacherBlueprintPaper|bankQuestion\.findMany/);
  assert.doesNotMatch(implementation, /workspaceAssignment|assignmentBatch|ChallengeAttempt|MistakeEntry/);
});
