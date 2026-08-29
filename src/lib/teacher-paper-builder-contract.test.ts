import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  TEACHER_GLOBAL_PAPER_QUESTION_TYPES,
  TEACHER_WORKSPACE_PAPER_QUESTION_TYPES,
} from "./teacher-paper-builder-policy";

const root = process.cwd();
const read = (file: string) => readFileSync(path.join(root, file), "utf8");

const page = read("src/app/workspace/paper-builder/page.tsx");
const actions = read("src/app/workspace/paper-builder/actions.ts");
const teacherService = read("src/lib/teacher-paper-builder-service.ts");
const archiveActions = read("src/app/workspace/paper-builder/archive/actions.ts");
const sharedClient = read("src/components/paper-builder/SimplePaperBuilderClient.tsx");
const sharedValidation = read("src/lib/paper-builder/validate-selection.ts");
const adminActions = read("src/app/admin/paper-builder/actions.ts");
const adminClient = read("src/app/admin/paper-builder/PaperBuilderClient.tsx");
const sidebar = read("src/components/WorkspaceSidebar.tsx");

test("teacher Paper Builder route is active-workspace and academic-scope restricted", () => {
  assert.match(page, /requireActiveWorkspace\(\)/);
  assert.match(page, /listActiveWorkspaceScopes\(user\.workspaceId\)/);
  assert.match(page, /subjectId: \{ in: subjectIds \}/);
  assert.match(page, /workspaceId: null/);
  assert.match(page, /questionType: \{ in: \[\.\.\.TEACHER_GLOBAL_PAPER_QUESTION_TYPES\] \}/);
  assert.match(page, /workspaceId: user\.workspaceId/);
  assert.match(page, /questionType: \{ in: \[\.\.\.TEACHER_WORKSPACE_PAPER_QUESTION_TYPES\] \}/);
  assert.match(page, /subjects\.length === 1 \? subjects\[0\]\.id/);
  assert.match(sidebar, /href: "\/workspace\/paper-builder"/);
  assert.match(sidebar, /href: "\/workspace\/paper-builder\/archive"/);
});

test("teacher validation independently enforces subject, topic, type, and ownership", () => {
  assert.match(actions, /requireActiveWorkspace\(\)/);
  assert.match(actions, /validateTeacherPaperSelectionForWorkspace\(user\.workspaceId, input\)/);
  assert.match(teacherService, /requireWorkspaceSubjectScope\(workspaceId, input\?\.subjectId\)/);
  assert.match(
    teacherService,
    /requireWorkspaceTopicScope\(workspaceId, input\.subjectId, topicId\)/,
  );
  assert.match(teacherService, /allowedQuestionTypes: TEACHER_GLOBAL_PAPER_QUESTION_TYPES/);
  assert.match(
    teacherService,
    /workspaceOwnedQuestionTypes: TEACHER_WORKSPACE_PAPER_QUESTION_TYPES/,
  );
  assert.doesNotMatch(`${actions}\n${teacherService}`, /requireSuperAdmin|@\/app\/admin/);
});

test("shared validation requeries selections and preserves marks and duplicate checks", () => {
  assert.match(sharedValidation, /id: \{ in: selectedIds \}/);
  assert.match(sharedValidation, /subjectId: input\.subjectId/);
  assert.match(sharedValidation, /topicId: \{ in: topicIds \}/);
  assert.match(sharedValidation, /questionType: \{ in: \[\.\.\.access\.allowedQuestionTypes\] \}/);
  assert.match(sharedValidation, /workspaceId: access\.questionScope\.workspaceId/);
  assert.match(sharedValidation, /workspaceOwnedQuestionTypes/);
  assert.match(sharedValidation, /findDuplicateSelection\(orderedQuestions\)/);
  assert.match(sharedValidation, /calculatePatternMarks\(patterns\)/);
  assert.match(sharedValidation, /calculatedQuestionMarks !== calculatedPatternMarks/);
  assert.doesNotMatch(
    sharedValidation,
    /\.(create|createMany|update|updateMany|delete|deleteMany)\(/,
  );
});

test("teacher client reuses preview, print, DOCX, images, and workspace archive save", () => {
  assert.match(sharedClient, /PaperQuestionDocument/);
  assert.match(sharedClient, /PaperAnswerKeyDocument/);
  assert.match(sharedClient, /window\.print\(\)/);
  assert.match(sharedClient, /downloadPaperDocx/);
  assert.match(sharedClient, /question\.imageUrl/);
  assert.match(page, /allowedQuestionTypes=\{TEACHER_GLOBAL_PAPER_QUESTION_TYPES\}/);
  assert.match(page, /saveTeacherGeneratedPaper/);
  assert.match(page, /archiveHref: "\/workspace\/paper-builder\/archive"/);
  assert.doesNotMatch(actions, /savedGeneratedPaper|challenge|assignment|attempt|mistake/);
});

test("teacher policy allows every supported global type but only workspace MCQs", () => {
  assert.deepEqual(TEACHER_GLOBAL_PAPER_QUESTION_TYPES, [
    "MCQ",
    "TRUE_FALSE",
    "FILL_BLANK",
    "ASSERTION_REASON",
    "VERY_SHORT_ANSWER",
    "SHORT_ANSWER",
    "LONG_ANSWER",
  ]);
  assert.deepEqual(TEACHER_WORKSPACE_PAPER_QUESTION_TYPES, ["MCQ"]);
});

test("teacher save creates only an immutable workspace-owned paper snapshot", () => {
  assert.match(page, /private to this workspace/);
  assert.match(archiveActions, /requireActiveWorkspace\(\)/);
  assert.match(archiveActions, /validateTeacherPaperSelectionForWorkspace/);
  assert.match(archiveActions, /workspaceId: teacher\.workspaceId/);
  assert.match(archiveActions, /createdById: teacher\.id/);
  assert.match(archiveActions, /persistSavedGeneratedPaper/);
  assert.doesNotMatch(actions, /savedGeneratedPaper|challenge|assignment|attempt|mistake/);
  assert.doesNotMatch(
    archiveActions,
    /(?:challenge|worksheet|assignment|attempt|mistake)\.(create|createMany|update|upsert)\(/,
  );
});

test("admin Simple Builder remains behind its SUPER_ADMIN global-only wrapper", () => {
  assert.match(adminActions, /requireSuperAdmin\(\)/);
  assert.match(adminActions, /questionScope: \{ kind: "global-only" \}/);
  assert.match(adminActions, /allowedQuestionTypes: BANK_QUESTION_TYPES/);
  assert.match(adminClient, /headerTemplateActions/);
  assert.match(adminClient, /validateSelection=\{validatePaperBuilderSelection\}/);
});
