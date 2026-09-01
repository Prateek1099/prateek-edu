import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (file: string) => readFileSync(path.join(root, file), "utf8");

const actions = read("src/lib/paper-builder/teacher-blueprint-actions.ts");
const service = read("src/lib/paper-builder/teacher-blueprint-service.ts");
const reviewRules = read("src/lib/paper-builder/teacher-blueprint-review-rules.ts");
const teacherClient = read(
  "src/app/workspace/paper-builder/blueprint/BlueprintBuilderClient.tsx",
);
const sharedClient = read("src/components/paper-builder/BlueprintBuilderClient.tsx");
const adminClient = read(
  "src/app/admin/paper-builder/blueprint/BlueprintBuilderClient.tsx",
);
const schema = read("prisma/schema.prisma");
const packageJson = read("package.json");

function exportedFunctionBody(source: string, name: string) {
  const start = source.indexOf(`export async function ${name}`);
  assert.notEqual(start, -1, `${name} must be exported`);
  const next = source.indexOf("\nexport async function ", start + 1);
  return source.slice(start, next === -1 ? source.length : next);
}

test("all four teacher review actions independently require the active workspace session", () => {
  for (const name of [
    "getTeacherBlueprintReplacementCandidates",
    "replaceTeacherBlueprintQuestion",
    "regenerateTeacherBlueprintRow",
    "regenerateTeacherBlueprintTopic",
  ]) {
    const body = exportedFunctionBody(actions, name);
    assert.match(body, /requireActiveWorkspace\(\)/);
    assert.doesNotMatch(body, /requireSuperAdmin|input\.workspaceId/);
  }
});

test("review context rejects forged workspace identity and requeries scoped questions", () => {
  const body = exportedFunctionBody(service, "validateTeacherBlueprintReviewContext");
  assert.match(body, /validateTeacherBlueprintDraft\(input\)/);
  assert.match(body, /hasClientWorkspaceId\(selections\)/);
  assert.match(body, /hasClientWorkspaceId\(selection\)/);
  assert.match(body, /loadTeacherBlueprintScope\(workspaceId, input\)/);
  assert.match(body, /questionMatchesBlueprintRow/);
  assert.match(body, /findDuplicateSelection/);
  assert.match(service, /requireWorkspaceSubjectScope\(workspaceId, input\.subjectId\)/);
  assert.match(service, /workspaceId: null/);
  assert.match(service, /question\.workspaceId !== workspaceId/);
});

test("candidate action validates the target and returns at most ten eligible alternatives", () => {
  const body = exportedFunctionBody(
    service,
    "getTeacherBlueprintReplacementCandidatesForWorkspace",
  );
  assert.match(body, /validateTeacherBlueprintReviewContext/);
  assert.match(body, /question\.id === replaceQuestionId/);
  assert.match(body, /teacherBlueprintReplacementCandidates/);
  assert.match(reviewRules, /TEACHER_BLUEPRINT_REPLACEMENT_LIMIT = 10/);
  assert.match(reviewRules, /question\.difficulty === replacedQuestion\.difficulty/);
  assert.match(reviewRules, /\.slice\(0, TEACHER_BLUEPRINT_REPLACEMENT_LIMIT\)/);
});

test("replace action preserves the row and recalculates the complete paper", () => {
  const body = exportedFunctionBody(
    service,
    "replaceTeacherBlueprintQuestionForWorkspace",
  );
  assert.match(body, /question\.id === replaceQuestionId/);
  assert.match(body, /question\.id === candidateId/);
  assert.match(body, /nextSelected\.set\(rowId, nextRow\)/);
  assert.match(body, /findDuplicateSelection/);
  assert.match(body, /buildTeacherBlueprintGenerationResult/);
  assert.doesNotMatch(
    body,
    /\.(?:create|createMany|update|updateMany|upsert|delete|deleteMany)\(/,
  );
});

test("row regeneration requires a complete fresh replacement and preserves other rows", () => {
  const body = exportedFunctionBody(
    service,
    "regenerateTeacherBlueprintRowForWorkspace",
  );
  assert.match(body, /incompleteUntouchedRowError/);
  assert.match(body, /teacherBlueprintFreshRegenerationPool/);
  assert.match(body, /candidates\.length < target\.row\.questionCount/);
  assert.match(body, /nextSelected\.set\(rowId, questions\)/);
  assert.match(body, /buildTeacherBlueprintGenerationResult/);
  assert.doesNotMatch(
    body,
    /\.(?:create|createMany|update|updateMany|upsert|delete|deleteMany)\(/,
  );
});

test("topic regeneration is all-or-nothing and preserves rows outside the topic", () => {
  const body = exportedFunctionBody(
    service,
    "regenerateTeacherBlueprintTopicForWorkspace",
  );
  assert.match(body, /candidate\.id === topicOrChapterId/);
  assert.match(body, /candidate\.topicId === topicOrChapterId/);
  assert.match(body, /incompleteUntouchedRowError/);
  assert.match(body, /assembleBlueprintSelections\(chapter\.rows, pools\)/);
  assert.match(body, /assembled\.shortages\.length > 0/);
  assert.match(body, /nextSelected\.set\(row\.id/);
  assert.doesNotMatch(
    body,
    /\.(?:create|createMany|update|updateMany|upsert|delete|deleteMany)\(/,
  );
});

test("teacher UI enables review tools without importing admin actions", () => {
  assert.match(teacherClient, /replacement: true/);
  assert.match(teacherClient, /rowRegeneration: true/);
  assert.match(teacherClient, /chapterRegeneration: true/);
  assert.match(teacherClient, /replacementButtonLabel: "Replace Question"/);
  assert.match(teacherClient, /chapterRegenerationLabel: "Regenerate Topic"/);
  assert.match(teacherClient, /confirmRegeneration: true/);
  assert.doesNotMatch(teacherClient, /@\/app\/admin|\/admin\/paper-builder/);
  assert.match(sharedClient, /Paper modified and not saved/);
  assert.match(sharedClient, /Regeneration may fail if enough unique questions are not available/);
});

test("admin capabilities remain unchanged", () => {
  assert.match(adminClient, /replacement: true/);
  assert.match(adminClient, /rowRegeneration: true/);
  assert.match(adminClient, /chapterRegeneration: true/);
  assert.doesNotMatch(adminClient, /confirmRegeneration/);
  assert.doesNotMatch(adminClient, /Regenerate Topic/);
});

test("templates and archive keep their separation and final save revalidates", () => {
  const save = exportedFunctionBody(
    service,
    "saveTeacherBlueprintGeneratedPaperForWorkspace",
  );
  assert.match(save, /getWorkspaceBlueprintTemplateSnapshot/);
  assert.match(save, /validateTeacherBlueprintSelectionForWorkspace/);
  assert.match(save, /validateSourceVersions/);
  assert.match(save, /validateAndApplyFinalOrder/);
  assert.match(save, /sourceBlueprintTemplateId: null/);
  assert.match(save, /sourceBlueprintTemplateName: sourceTemplate\?\.name \?\? null/);
  assert.doesNotMatch(
    `${service}\n${actions}`,
    /(?:assignment|attempt|mistake|progress)\.(?:create|createMany|update|upsert)\(/,
  );
});

test("review phase adds no alternate schema models or dependencies", () => {
  assert.doesNotMatch(
    schema,
    /model TeacherBlueprintReview|model BlueprintReplacement|replacementHistory/,
  );
  assert.match(packageJson, /"next": "16\.2\.3"/);
});
