import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (file: string) => readFileSync(path.join(root, file), "utf8");

const page = read("src/app/workspace/paper-builder/page.tsx");
const actions = read("src/app/workspace/paper-builder/actions.ts");
const sharedClient = read("src/components/paper-builder/SimplePaperBuilderClient.tsx");
const sharedValidation = read("src/lib/paper-builder/validate-selection.ts");
const adminActions = read("src/app/admin/paper-builder/actions.ts");
const adminClient = read("src/app/admin/paper-builder/PaperBuilderClient.tsx");
const sidebar = read("src/components/WorkspaceSidebar.tsx");

test("teacher Paper Builder route is active-workspace and academic-scope restricted", () => {
  assert.match(page, /requireActiveWorkspace\(\)/);
  assert.match(page, /listActiveWorkspaceScopes\(user\.workspaceId\)/);
  assert.match(page, /subjectId: \{ in: subjectIds \}/);
  assert.match(page, /questionType: "MCQ"/);
  assert.match(
    page,
    /OR: \[\{ workspaceId: null \}, \{ workspaceId: user\.workspaceId \}\]/,
  );
  assert.match(page, /subjects\.length === 1 \? subjects\[0\]\.id/);
  assert.match(sidebar, /href: "\/workspace\/paper-builder"/);
});

test("teacher validation independently enforces subject, topic, type, and ownership", () => {
  assert.match(actions, /requireActiveWorkspace\(\)/);
  assert.match(actions, /requireWorkspaceSubjectScope\(user\.workspaceId, input\?\.subjectId\)/);
  assert.match(
    actions,
    /requireWorkspaceTopicScope\(user\.workspaceId, input\.subjectId, topicId\)/,
  );
  assert.match(actions, /allowedQuestionTypes: \["MCQ"\]/);
  assert.match(
    actions,
    /questionScope: \{ kind: "workspace", workspaceId: user\.workspaceId \}/,
  );
  assert.doesNotMatch(actions, /requireSuperAdmin|@\/app\/admin/);
});

test("shared validation requeries selections and preserves marks and duplicate checks", () => {
  assert.match(sharedValidation, /id: \{ in: selectedIds \}/);
  assert.match(sharedValidation, /subjectId: input\.subjectId/);
  assert.match(sharedValidation, /topicId: \{ in: topicIds \}/);
  assert.match(sharedValidation, /questionType: \{ in: \[\.\.\.access\.allowedQuestionTypes\] \}/);
  assert.match(sharedValidation, /workspaceId: access\.questionScope\.workspaceId/);
  assert.match(sharedValidation, /findDuplicateSelection\(orderedQuestions\)/);
  assert.match(sharedValidation, /calculatePatternMarks\(patterns\)/);
  assert.match(sharedValidation, /calculatedQuestionMarks !== calculatedPatternMarks/);
  assert.doesNotMatch(
    sharedValidation,
    /\.(create|createMany|update|updateMany|delete|deleteMany)\(/,
  );
});

test("teacher client reuses preview, print, DOCX, and image-capable shared UI without save/archive", () => {
  assert.match(sharedClient, /PaperQuestionDocument/);
  assert.match(sharedClient, /PaperAnswerKeyDocument/);
  assert.match(sharedClient, /window\.print\(\)/);
  assert.match(sharedClient, /downloadPaperDocx/);
  assert.match(sharedClient, /question\.imageUrl/);
  assert.match(page, /allowedQuestionTypes=\{\["MCQ"\]\}/);
  assert.doesNotMatch(page, /saveGeneratedPaper|Paper Archive|PaperBuilderModeNav/);
  assert.doesNotMatch(actions, /savedGeneratedPaper|challenge|assignment|attempt|mistake/);
});

test("admin Simple Builder remains behind its SUPER_ADMIN global-only wrapper", () => {
  assert.match(adminActions, /requireSuperAdmin\(\)/);
  assert.match(adminActions, /questionScope: \{ kind: "global-only" \}/);
  assert.match(adminActions, /allowedQuestionTypes: BANK_QUESTION_TYPES/);
  assert.match(adminClient, /headerTemplateActions/);
  assert.match(adminClient, /validateSelection=\{validatePaperBuilderSelection\}/);
});
