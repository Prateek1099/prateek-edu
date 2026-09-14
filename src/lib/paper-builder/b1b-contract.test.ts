import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path: string) => fs.readFileSync(new URL(path, import.meta.url), "utf8");
const adminClient = read("../../app/admin/question-bank/AdminBankClient.tsx");
const adminActions = read("../../app/admin/question-bank/actions.ts");
const adminSimple = read("../../app/admin/paper-builder/page.tsx");
const teacherSimple = read("../../app/workspace/paper-builder/page.tsx");
const adminBlueprint = read("../../app/admin/paper-builder/blueprint/actions.ts");
const teacherBlueprint = read("./teacher-blueprint-service.ts");
const savedService = read("./saved-paper-service.ts");
const savedRules = read("./saved-paper-rules.ts");
const documents = read("../../components/paper-builder/PaperBuilderDocuments.tsx");
const docx = read("./docx.ts");
const assessmentRules = read("../assessments/rules.ts");
const studentDto = read("../assessments/student-dto.ts");

test("admin authoring exposes accessible Fill aliases and stable Match pair controls", () => {
  assert.match(adminClient, /Additional accepted answers/);
  assert.match(adminClient, /Add accepted answer/);
  assert.match(adminClient, /Left item \$\{index \+ 1\}/);
  assert.match(adminClient, /Correct match \$\{index \+ 1\}/);
  assert.match(adminClient, /newMatchPair/);
  assert.match(adminClient, /disabled=\{matchPairs\.length <= 2\}/);
  assert.match(adminClient, /disabled=\{matchPairs\.length >= 12\}/);
});

test("admin writes shared validated structures and keeps SUPER_ADMIN enforcement", () => {
  assert.equal((adminActions.match(/requireSuperAdmin\(\)/g) ?? []).length >= 3, true);
  assert.match(adminActions, /structuredContent: validation\.data\.structuredContent/);
  assert.match(adminActions, /gradingData: validation\.data\.gradingData/);
});

test("all simple and Blueprint candidate queries eagerly carry structure without N+1", () => {
  for (const source of [adminSimple, teacherSimple, adminBlueprint, teacherBlueprint]) {
    assert.match(source, /structuredContent: true/);
    assert.match(source, /gradingData: true/);
    assert.doesNotMatch(source, /for \([^)]*\)[\s\S]{0,120}bankQuestion\.find/);
  }
});

test("saved-paper persistence freezes Fill and Match evidence into the snapshot", () => {
  assert.match(savedService, /freezeQuestionStructureForSavedPaper/);
  assert.match(savedService, /\.\.\.snapshotStructure\(question\)/);
  assert.match(savedRules, /structuredContent: question\.structuredContent/);
  assert.match(savedRules, /gradingData: question\.gradingData/);
});

test("preview and print use frozen visible Match order and separate answer mapping", () => {
  assert.match(documents, /visibleMatchRows\(question\.structuredContent\)/);
  assert.match(documents, /matchAnswerRows\(question\)/);
  assert.doesNotMatch(documents, /correctPairs/);
});

test("DOCX renders a Match table and answer key from displayed numbering", () => {
  assert.match(docx, /new Table\(/);
  assert.match(docx, /Column A/);
  assert.match(docx, /Column B/);
  assert.match(docx, /matchAnswerRows\(question\)/);
});

test("online assessment publication remains objective-only", () => {
  assert.match(assessmentRules, /OBJECTIVE_ASSESSMENT_TYPES = \["MCQ", "TRUE_FALSE", "ASSERTION_REASON"\]/);
  assert.doesNotMatch(assessmentRules.match(/OBJECTIVE_ASSESSMENT_TYPES = \[[^\]]+\]/)?.[0] ?? "", /FILL_BLANK|MATCH_THE_FOLLOWING/);
});

test("student assessment DTO remains a visible-field whitelist without grading data", () => {
  const assessmentBody = studentDto.slice(studentDto.indexOf("export function studentAssessmentDto"), studentDto.indexOf("export type StudentAssessmentDto"));
  assert.doesNotMatch(assessmentBody, /gradingData|correctPairs|acceptedAnswers|modelAnswer/);
});
