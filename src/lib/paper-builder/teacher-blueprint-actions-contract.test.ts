import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  TEACHER_GLOBAL_PAPER_QUESTION_TYPES,
  TEACHER_WORKSPACE_PAPER_QUESTION_TYPES,
} from "../teacher-paper-builder-policy";
import { TEACHER_BLUEPRINT_LIMITS } from "./teacher-blueprint-rules";

const root = process.cwd();
const read = (file: string) => readFileSync(path.join(root, file), "utf8");

const actions = read("src/lib/paper-builder/teacher-blueprint-actions.ts");
const service = read("src/lib/paper-builder/teacher-blueprint-service.ts");
const rules = read("src/lib/paper-builder/teacher-blueprint-rules.ts");
const requireRole = read("src/lib/require-role.ts");
const workspaceScope = read("src/lib/workspace-academic-scope.ts");
const adminActions = read("src/app/admin/paper-builder/blueprint/actions.ts");
const teacherClient = read("src/app/workspace/paper-builder/blueprint/BlueprintBuilderClient.tsx");
const workspaceSidebar = read("src/components/WorkspaceSidebar.tsx");
const schema = read("prisma/schema.prisma");

function exportedFunctionBody(source: string, name: string) {
  const start = source.indexOf(`export async function ${name}`);
  assert.notEqual(start, -1, `${name} must be exported`);
  const next = source.indexOf("\nexport async function ", start + 1);
  return source.slice(start, next === -1 ? source.length : next);
}

test("teacher Blueprint actions independently require an active teacher workspace", () => {
  const actionNames = [
    "reviewTeacherBlueprintAvailability",
    "generateTeacherBlueprintPaper",
    "getTeacherBlueprintReplacementCandidates",
    "replaceTeacherBlueprintQuestion",
    "regenerateTeacherBlueprintRow",
    "regenerateTeacherBlueprintTopic",
    "validateTeacherBlueprintSelection",
    "saveTeacherBlueprintGeneratedPaper",
  ];
  for (const name of actionNames) {
    assert.match(exportedFunctionBody(actions, name), /requireActiveWorkspace\(\)/);
  }
  assert.match(requireRole, /if \(!user \|\| !isTeacher\(user\.role\)\)/);
  assert.match(requireRole, /if \(!user\.workspaceId\)/);
  assert.match(requireRole, /user\.workspaceStatus !== "ACTIVE"/);
  assert.doesNotMatch(actions, /requireSuperAdmin|@\/app\/admin/);
});

test("teacher Blueprint scope is active, relational, published, and session-owned", () => {
  assert.match(service, /requireWorkspaceSubjectScope\(workspaceId, input\.subjectId\)/);
  assert.match(workspaceScope, /workspaceId,/);
  assert.match(workspaceScope, /status: "ACTIVE"/);
  assert.match(workspaceScope, /workspace: \{ status: "ACTIVE" \}/);
  assert.match(
    service,
    /qualification: \{[\s\S]*?id: input\.qualificationId,[\s\S]*?status: "PUBLISHED"/,
  );
  assert.match(service, /board: \{ id: input\.boardId, status: "PUBLISHED" \}/);
  assert.match(service, /subjectId: input\.subjectId,[\s\S]*?status: "PUBLISHED"/);
  assert.match(service, /scope\.topics\.length !== input\.chapters\.length/);
  assert.doesNotMatch(actions, /input\.workspaceId/);
  assert.match(rules, /hasClientWorkspaceId\(input\)/);
});

test("question query enforces global mixed types and current-workspace MCQ only", () => {
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
  assert.match(
    service,
    /workspaceId: null,[\s\S]*?questionType: \{ in: \[\.\.\.TEACHER_GLOBAL_PAPER_QUESTION_TYPES\] \}/,
  );
  assert.match(
    service,
    /workspaceId,[\s\S]*?questionType: \{ in: \[\.\.\.TEACHER_WORKSPACE_PAPER_QUESTION_TYPES\] \}/,
  );
  assert.match(service, /question\.workspaceId !== workspaceId/);
  assert.match(service, /!workspaceTypes\.has\(question\.questionType\)/);
});

test("availability and generation use fresh data, safe limits, and no writes", () => {
  assert.deepEqual(TEACHER_BLUEPRINT_LIMITS, {
    topics: 20,
    rows: 40,
    questions: 150,
    marks: 1_000,
  });
  const review = exportedFunctionBody(
    service,
    "reviewTeacherBlueprintAvailabilityForWorkspace",
  );
  const generate = exportedFunctionBody(
    service,
    "generateTeacherBlueprintPaperForWorkspace",
  );
  for (const body of [review, generate]) {
    assert.match(body, /loadTeacherBlueprintScope\(workspaceId, input\)/);
    assert.doesNotMatch(
      body,
      /\.(?:create|createMany|update|updateMany|upsert|delete|deleteMany)\(/,
    );
  }
  assert.match(rules, /uniqueBlueprintCandidates/);
  assert.match(rules, /normalizeQuestionText/);
  assert.match(generate, /assembleBlueprintSelections\(rows, pools\)/);
  assert.match(generate, /assembled\.shortages\.length > 0/);
});

test("final validation requeries IDs and checks exact rows and duplicate text", () => {
  const validate = exportedFunctionBody(
    service,
    "validateTeacherBlueprintSelectionForWorkspace",
  );
  assert.match(validate, /new Set\(selectedIds\)\.size !== selectedIds\.length/);
  assert.match(validate, /loadTeacherBlueprintScope\(workspaceId, input, selectedIds\)/);
  assert.match(validate, /scope\.questions\.length !== selectedIds\.length/);
  assert.match(validate, /questionMatchesBlueprintRow\(question, input\.subjectId, row\)/);
  assert.match(validate, /findDuplicateSelection\(\[\.\.\.selected\.values\(\)\]\.flat\(\)\)/);
  assert.match(validate, /buildTeacherBlueprintGenerationResult\(input, scope, selected\)/);
  assert.doesNotMatch(
    validate,
    /\.(?:create|createMany|update|updateMany|upsert|delete|deleteMany)\(/,
  );
});

test("teacher review actions revalidate context, limit candidates, and never write", () => {
  const reviewActionNames = [
    "getTeacherBlueprintReplacementCandidatesForWorkspace",
    "replaceTeacherBlueprintQuestionForWorkspace",
    "regenerateTeacherBlueprintRowForWorkspace",
    "regenerateTeacherBlueprintTopicForWorkspace",
  ];
  for (const name of reviewActionNames) {
    const body = exportedFunctionBody(service, name);
    assert.match(body, /validateTeacherBlueprintReviewContext/);
    assert.doesNotMatch(
      body,
      /\.(?:create|createMany|update|updateMany|upsert|delete|deleteMany)\(/,
    );
  }
  assert.match(service, /teacherBlueprintReplacementCandidates/);
  assert.match(service, /teacherBlueprintFreshRegenerationPool/);
  assert.match(service, /findDuplicateSelection/);
  assert.match(service, /buildTeacherBlueprintGenerationResult/);
});

test("teacher save revalidates and writes only a workspace-owned immutable paper", () => {
  const save = exportedFunctionBody(
    service,
    "saveTeacherBlueprintGeneratedPaperForWorkspace",
  );
  assert.match(save, /validateTeacherBlueprintSelectionForWorkspace/);
  assert.match(save, /validateSourceVersions/);
  assert.match(save, /validateAndApplyFinalOrder/);
  assert.match(save, /persistSavedGeneratedPaper/);
  assert.match(save, /createdById: teacher\.id/);
  assert.match(save, /workspaceId: teacher\.workspaceId/);
  assert.match(save, /sourceBlueprintTemplateId: null/);
  assert.match(save, /getWorkspaceBlueprintTemplateSnapshot/);
  assert.match(save, /sourceBlueprintTemplateName: sourceTemplate\?\.name \?\? null/);
  assert.doesNotMatch(
    save,
    /(?:assignment|challenge|worksheet|attempt|mistake|progress)\.(?:create|createMany|update|upsert)\(/,
  );
});

test("admin Blueprint remains SUPER_ADMIN-only and the teacher UI uses only the teacher adapter", () => {
  assert.match(adminActions, /requireSuperAdmin\(\)/);
  assert.equal(
    existsSync(path.join(root, "src/app/workspace/paper-builder/blueprint")),
    true,
  );
  assert.match(teacherClient, /reviewTeacherBlueprintAvailability/);
  assert.match(teacherClient, /generateTeacherBlueprintPaper/);
  assert.match(teacherClient, /validateTeacherBlueprintSelection/);
  assert.match(teacherClient, /saveTeacherBlueprintGeneratedPaper/);
  assert.doesNotMatch(teacherClient, /@\/app\/admin|\/admin\/paper-builder/);
  assert.doesNotMatch(workspaceSidebar, /\/workspace\/paper-builder\/blueprint/);
  assert.doesNotMatch(schema, /model WorkspacePaperBlueprint|model TeacherPaperBlueprint/);
});
