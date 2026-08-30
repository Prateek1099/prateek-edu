import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (file: string) => readFileSync(path.join(root, file), "utf8");

const schema = read("prisma/schema.prisma");
const migration = read("prisma/migrations/20260830120000_add_workspace_paper_header_templates/migration.sql");
const actions = read("src/app/workspace/paper-builder/header-templates/actions.ts");
const page = read("src/app/workspace/paper-builder/page.tsx");
const managerPage = read("src/app/workspace/paper-builder/header-templates/page.tsx");
const sharedClient = read("src/components/paper-builder/SimplePaperBuilderClient.tsx");
const adminActions = read("src/app/admin/paper-builder/template-actions.ts");
const adminClient = read("src/app/admin/paper-builder/PaperBuilderClient.tsx");

function actionBody(name: string) {
  const start = actions.indexOf(`export async function ${name}`);
  assert.notEqual(start, -1, `${name} must exist`);
  const next = actions.indexOf("export async function", start + 1);
  return actions.slice(start, next === -1 ? actions.length : next);
}

test("workspace header model and migration are additive and workspace-owned", () => {
  assert.match(schema, /model WorkspacePaperHeaderTemplate \{/);
  assert.match(schema, /@@unique\(\[workspaceId, nameKey\]\)/);
  assert.match(schema, /@@index\(\[workspaceId, archivedAt, updatedAt\]\)/);
  assert.match(schema, /workspace Workspace[^\n]+onDelete: Restrict/);
  assert.match(schema, /createdBy User[^\n]+onDelete: Restrict/);
  assert.match(migration, /CREATE TABLE "workspace_paper_header_templates"/);
  assert.match(migration, /ON DELETE RESTRICT ON UPDATE CASCADE/g);
  assert.doesNotMatch(migration, /ALTER TABLE "paper_header_templates"/);
  assert.doesNotMatch(migration, /ALTER TABLE "saved_generated_papers"/);
  assert.doesNotMatch(migration, /INSERT INTO|UPDATE "|DELETE FROM/);
});

test("every workspace template action independently requires an active teacher workspace", () => {
  for (const name of [
    "listWorkspacePaperHeaderTemplates",
    "createWorkspacePaperHeaderTemplate",
    "updateWorkspacePaperHeaderTemplate",
    "archiveWorkspacePaperHeaderTemplate",
    "restoreWorkspacePaperHeaderTemplate",
  ]) {
    assert.match(actionBody(name), /requireActiveWorkspace\(\)/, `${name} must authorize independently`);
  }
  assert.doesNotMatch(actions, /requireSuperAdmin|workspaceId:\s*input|input\.workspaceId/);
});

test("list and mutations are constrained to the session workspace", () => {
  assert.match(actionBody("listWorkspacePaperHeaderTemplates"), /workspaceId: teacher\.workspaceId/);
  assert.match(actionBody("createWorkspacePaperHeaderTemplate"), /workspaceId: teacher\.workspaceId/);
  for (const name of [
    "updateWorkspacePaperHeaderTemplate",
    "archiveWorkspacePaperHeaderTemplate",
    "restoreWorkspacePaperHeaderTemplate",
  ]) {
    const body = actionBody(name);
    assert.match(body, /workspaceId: teacher\.workspaceId/);
    assert.match(body, /Header template not found/);
  }
});

test("archive lifecycle prevents archived templates from reaching Paper Builder", () => {
  assert.match(actionBody("archiveWorkspacePaperHeaderTemplate"), /archivedAt: null/);
  assert.match(actionBody("archiveWorkspacePaperHeaderTemplate"), /archivedAt: new Date\(\)/);
  assert.match(actionBody("restoreWorkspacePaperHeaderTemplate"), /archivedAt: \{ not: null \}/);
  assert.match(actionBody("restoreWorkspacePaperHeaderTemplate"), /archivedAt: null/);
  assert.match(page, /workspaceId: user\.workspaceId, archivedAt: null/);
  assert.match(managerPage, /status === "archived" \? \{ not: null \} : null/);
});

test("Teacher Paper Builder receives active workspace templates without changing generation", () => {
  assert.match(page, /headerTemplates=\{headerTemplates\.map/);
  assert.match(page, /create: createWorkspacePaperHeaderTemplate/);
  assert.match(page, /update: updateWorkspacePaperHeaderTemplate/);
  assert.match(page, /archive: archiveWorkspacePaperHeaderTemplate/);
  assert.match(page, /headerTemplateManageHref="\/workspace\/paper-builder\/header-templates"/);
  assert.match(sharedClient, /Applied .*Header fields remain editable/);
  assert.match(sharedClient, /downloadPaperDocx/);
  assert.match(sharedClient, /window\.print\(\)/);
  assert.doesNotMatch(actions, /bankQuestion|savedGeneratedPaper|challenge|assignment|attempt|mistake/);
});

test("global admin header templates remain on their original model and actions", () => {
  assert.match(adminActions, /prisma\.paperHeaderTemplate\.create/);
  assert.match(adminActions, /requireSuperAdmin\(\)/);
  assert.doesNotMatch(adminActions, /workspacePaperHeaderTemplate/);
  assert.match(adminClient, /delete: deletePaperHeaderTemplate/);
  assert.doesNotMatch(adminClient, /archiveWorkspacePaperHeaderTemplate/);
});
