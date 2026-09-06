import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (file: string) => readFileSync(path.join(root, file), "utf8");

const schema = read("prisma/schema.prisma");
const migration = read("prisma/migrations/20260831120000_add_workspace_paper_templates/migration.sql");
const actions = read("src/app/workspace/paper-builder/templates/actions.ts");
const data = read("src/lib/paper-builder/workspace-paper-template-data.ts");
const rules = read("src/lib/paper-builder/workspace-paper-template-rules.ts");
const builderPage = read("src/app/workspace/paper-builder/page.tsx");
const builderClient = read("src/components/paper-builder/SimplePaperBuilderClient.tsx");
const managementPage = read("src/app/workspace/paper-builder/templates/page.tsx");
const managementClient = read("src/app/workspace/paper-builder/templates/TemplatesManagerClient.tsx");
const adminBuilder = read("src/app/admin/paper-builder/PaperBuilderClient.tsx");
const adminBlueprint = read("src/app/admin/paper-builder/blueprint/BlueprintBuilderClient.tsx");
const archiveActions = read("src/app/workspace/paper-builder/archive/actions.ts");

test("migration creates separate additive workspace template tables and requested relations", () => {
  assert.match(migration, /CREATE TABLE "workspace_paper_templates"/);
  assert.match(migration, /CREATE TABLE "workspace_paper_template_topics"/);
  assert.match(migration, /CREATE TABLE "workspace_paper_template_rows"/);
  assert.match(migration, /ON DELETE RESTRICT/);
  assert.match(migration, /ON DELETE CASCADE/);
  assert.match(migration, /ON DELETE SET NULL/);
  assert.doesNotMatch(migration, /(?:DROP|TRUNCATE|DELETE FROM|ALTER COLUMN)/);
});

test("schema stores reusable rules and contains no generated question relationship", () => {
  const templateModel = schema.slice(
    schema.indexOf("model WorkspacePaperTemplate {"),
    schema.indexOf("model PaperBlueprintTemplate {"),
  );
  assert.match(templateModel, /@@unique\(\[workspaceId, subjectId, nameKey\]\)/);
  assert.match(templateModel, /preferredHeaderTemplate.*onDelete: SetNull/);
  assert.match(templateModel, /workspace.*onDelete: Restrict/);
  assert.match(templateModel, /subject.*onDelete: Restrict/);
  assert.match(templateModel, /topic.*onDelete: Restrict/);
  assert.doesNotMatch(templateModel, /questionId|selectedQuestion|SavedGeneratedPaper/);
});

test("all seven server actions authenticate through the active workspace session", () => {
  const exportedActions = [
    "listWorkspacePaperTemplates",
    "createWorkspacePaperTemplate",
    "updateWorkspacePaperTemplate",
    "applyWorkspacePaperTemplate",
    "duplicateWorkspacePaperTemplate",
    "archiveWorkspacePaperTemplate",
    "restoreWorkspacePaperTemplate",
  ];
  for (const action of exportedActions) assert.match(actions, new RegExp(`function ${action}`));
  assert.equal((actions.match(/requireActiveWorkspace\(\)/g) ?? []).length, 7);
  assert.doesNotMatch(actions, /input\.workspaceId|workspaceId:\s*input/);
  assert.doesNotMatch(actions, /requireSuperAdmin/);
});

test("all reads and writes are scoped to the current workspace and generic not-found semantics", () => {
  assert.match(actions, /workspaceId: teacher\.workspaceId/g);
  assert.match(actions, /workspaceId: teacher\.workspaceId, archivedAt: null/);
  assert.match(actions, /workspaceId: teacher\.workspaceId, archivedAt: \{ not: null \}/);
  assert.match(data, /where: \{ id: templateId, workspaceId, archivedAt: null \}/);
  assert.match(actions, /Paper template not found/);
});

test("server validation rechecks active subject, exact topics, and same-workspace active header", () => {
  assert.match(data, /workspaceId,[\s\S]*subjectId: input\.subjectId,[\s\S]*status: "ACTIVE"/);
  assert.match(data, /status: "PUBLISHED"/);
  assert.match(data, /id: \{ in: input\.topicIds \}, subjectId: input\.subjectId/);
  assert.match(data, /id: input\.preferredHeaderTemplateId,[\s\S]*workspaceId,[\s\S]*archivedAt: null/);
  assert.match(rules, /TEACHER_GLOBAL_PAPER_QUESTION_TYPES/);
  assert.match(rules, /allowedDifficulties = new Set<string>\(\["any", "easy", "medium", "hard"\]\)/);
});

test("removed academic scope preserves templates but disables apply and restore", () => {
  assert.match(data, /This subject is not currently assigned to your workspace/);
  assert.match(data, /if \(unavailableReason\) throw new Error\(unavailableReason\)/);
  assert.match(actions, /validateWorkspacePaperTemplateContext\(teacher\.workspaceId/);
  assert.doesNotMatch(actions, /workspacePaperTemplate\.delete/);
});

test("builder save sends only settings and apply clears all generated browser state", () => {
  assert.match(builderClient, /currentPaperTemplateInput/);
  assert.match(builderClient, /rows: patterns\.map/);
  assert.match(builderClient, /preferredHeaderTemplateId: selectedTemplateId \|\| null/);
  assert.match(builderClient, /const clearGeneratedPaperState/);
  assert.match(builderClient, /setSections\(\{\}\)/);
  assert.match(builderClient, /setValidatedPaper\(null\)/);
  assert.match(builderClient, /setSavePaperName\(""\)/);
  assert.match(builderClient, /setSavedPaperId\(null\)/);
  assert.doesNotMatch(actions, /questionIds|selectedQuestions|validatedPaper|preview/);
});

test("builder applies active preferred headers and always generates from fresh availability", () => {
  assert.match(builderClient, /template\.preferredHeaderTemplate/);
  assert.match(builderClient, /setPatterns\(nextPatterns\)/);
  assert.match(builderClient, /uniqueEligibleQuestions\(questions, subjectId, topicIds, pattern\)/);
  assert.match(builderPage, /getWorkspacePaperTemplateSnapshot/);
  assert.match(builderPage, /validateTeacherPaperBuilderSelection/);
  assert.match(archiveActions, /validateTeacherPaperSelectionForWorkspace/);
});

test("management UI includes required metadata and safe lifecycle actions without delete", () => {
  assert.match(managementPage, /requireActiveWorkspace\(\)/);
  assert.match(managementClient, /Target marks/);
  assert.match(managementClient, /Topics/);
  assert.match(managementClient, /Structure/);
  assert.match(managementClient, /Preferred paper header/);
  assert.match(managementClient, /Use setup/);
  assert.match(managementClient, /Edit/);
  assert.match(managementClient, /Duplicate/);
  assert.match(managementClient, /Archive/);
  assert.match(managementClient, /Restore/);
  assert.doesNotMatch(`${actions}\n${managementClient}`, /deleteWorkspacePaperTemplate|Permanently delete/);
});

test("template actions create only template parent/children and no learning records", () => {
  assert.match(actions, /workspacePaperTemplate\.create/);
  assert.match(actions, /topics: \{ create: nestedTopics/);
  assert.match(actions, /rows: \{ create: nestedRows/);
  assert.doesNotMatch(
    actions,
    /(?:challenge|worksheet|assignment|attempt|mistake|savedGeneratedPaper)\.(?:create|createMany|update|upsert)/,
  );
});

test("admin builders and global admin template models remain isolated", () => {
  assert.doesNotMatch(adminBuilder, /WorkspacePaperTemplate|paperTemplateActions/);
  assert.doesNotMatch(adminBlueprint, /WorkspacePaperTemplate|paperTemplateActions/);
  assert.match(schema, /model PaperHeaderTemplate \{/);
  assert.match(schema, /model PaperBlueprintTemplate \{/);
  assert.doesNotMatch(migration, /ALTER TABLE "(?:paper_header_templates|paper_blueprint_templates)"/);
});
