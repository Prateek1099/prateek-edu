import assert from "node:assert/strict";
import test from "node:test";

import type { WorkspacePaperTemplateInput } from "./workspace-paper-template-types";
import {
  calculateWorkspacePaperTemplateMarks,
  nextWorkspacePaperTemplateCopyName,
  validateWorkspacePaperTemplateInput,
  workspacePaperTemplateNameKey,
  workspacePaperTemplateRowsToPatterns,
} from "./workspace-paper-template-rules";

function input(overrides: Partial<WorkspacePaperTemplateInput> = {}): WorkspacePaperTemplateInput {
  return {
    name: "  SQL   Class Test  ",
    description: "  Reusable   SQL paper  ",
    subjectId: "subject-ip",
    topicIds: ["topic-sql", "topic-functions"],
    rows: [
      {
        sectionLabel: " Section A ",
        questionType: "MCQ",
        questionCount: 3,
        marksPerQuestion: 1,
        difficulty: "any",
      },
      {
        sectionLabel: " Section B ",
        questionType: "SHORT_ANSWER",
        questionCount: 2,
        marksPerQuestion: 3,
        difficulty: "medium",
      },
    ],
    targetMarks: 9,
    preferredHeaderTemplateId: "header-1",
    ...overrides,
  };
}

test("template names use a normalized subject-scoped uniqueness key", () => {
  assert.equal(workspacePaperTemplateNameKey("  SQL   CLASS Test "), "sql class test");
  assert.equal(workspacePaperTemplateNameKey("ＳＱＬ Test"), "sql test");
});

test("template validation preserves rules but strips selected/generated question state", () => {
  const unsafe = {
    ...input(),
    questionIds: ["bank-1"],
    selectedQuestions: [{ id: "bank-1" }],
    preview: { sections: [] },
  } as WorkspacePaperTemplateInput;
  const validated = validateWorkspacePaperTemplateInput(unsafe);
  assert.equal(validated.name, "SQL Class Test");
  assert.equal(validated.description, "Reusable SQL paper");
  assert.equal(validated.rows[0].sectionLabel, "Section A");
  assert.equal(validated.targetMarks, 9);
  assert.equal("questionIds" in validated, false);
  assert.equal("selectedQuestions" in validated, false);
  assert.equal("preview" in validated, false);
});

test("all seven teacher global question types are valid template rules", () => {
  const questionTypes = [
    "MCQ",
    "TRUE_FALSE",
    "FILL_BLANK",
    "ASSERTION_REASON",
    "VERY_SHORT_ANSWER",
    "SHORT_ANSWER",
    "LONG_ANSWER",
  ] as const;
  const rows = questionTypes.map((questionType, index) => ({
    sectionLabel: `Section ${index + 1}`,
    questionType,
    questionCount: 1,
    marksPerQuestion: 1,
    difficulty: "any" as const,
  }));
  const validated = validateWorkspacePaperTemplateInput(input({ rows, targetMarks: 7 }));
  assert.deepEqual(validated.rows.map((row) => row.questionType), questionTypes);
});

test("marks are calculated from section count and marks per question", () => {
  assert.equal(calculateWorkspacePaperTemplateMarks(input().rows), 9);
  assert.throws(
    () => validateWorkspacePaperTemplateInput(input({ targetMarks: 10 })),
    /totals 9 marks, but the target is 10/,
  );
});

test("topics and section rows must be present and unique within safety limits", () => {
  assert.throws(() => validateWorkspacePaperTemplateInput(input({ topicIds: [] })), /1 and 30 topics/);
  assert.throws(
    () => validateWorkspacePaperTemplateInput(input({ topicIds: ["topic-sql", "topic-sql"] })),
    /topic must be unique/,
  );
  assert.throws(() => validateWorkspacePaperTemplateInput(input({ rows: [] })), /1 and 50 paper sections/);
  assert.throws(
    () => validateWorkspacePaperTemplateInput(input({
      rows: [{ ...input().rows[0], questionCount: 0 }],
      targetMarks: 0,
    })),
    /1 to 100 questions/,
  );
});

test("invalid types, difficulty, counts, marks, and oversized papers are rejected", () => {
  assert.throws(
    () => validateWorkspacePaperTemplateInput(input({
      rows: [{ ...input().rows[0], questionType: "CASE_BASED" as never }],
      targetMarks: 3,
    })),
    /valid question type/,
  );
  assert.throws(
    () => validateWorkspacePaperTemplateInput(input({
      rows: [{ ...input().rows[0], difficulty: "extreme" as never }],
      targetMarks: 3,
    })),
    /valid difficulty/,
  );
  assert.throws(
    () => validateWorkspacePaperTemplateInput(input({
      rows: [{ ...input().rows[0], marksPerQuestion: 0 }],
      targetMarks: 0,
    })),
    /1 to 100 marks/,
  );
  assert.throws(
    () => validateWorkspacePaperTemplateInput(input({
      rows: [
        { ...input().rows[0], questionCount: 100 },
        { ...input().rows[0], sectionLabel: "Section B", questionCount: 100 },
        { ...input().rows[0], sectionLabel: "Section C", questionCount: 1 },
      ],
      targetMarks: 201,
    })),
    /at most 200 questions/,
  );
});

test("blank optional description and header normalize safely", () => {
  const validated = validateWorkspacePaperTemplateInput(input({
    description: "  ",
    preferredHeaderTemplateId: null,
  }));
  assert.equal(validated.description, null);
  assert.equal(validated.preferredHeaderTemplateId, null);
});

test("snapshot rows become fresh client pattern rows without question selections", () => {
  const patterns = workspacePaperTemplateRowsToPatterns(
    validateWorkspacePaperTemplateInput(input()).rows,
    (sortOrder) => `fresh-${sortOrder}`,
  );
  assert.deepEqual(patterns.map((pattern) => pattern.id), ["fresh-0", "fresh-1"]);
  assert.equal(patterns[1].questionType, "SHORT_ANSWER");
  assert.equal("questionIds" in patterns[0], false);
});

test("duplicate names use a unique normalized copy suffix", () => {
  assert.equal(nextWorkspacePaperTemplateCopyName("SQL Test", ["sql test"]), "SQL Test Copy");
  assert.equal(
    nextWorkspacePaperTemplateCopyName("SQL Test", ["sql test", "SQL TEST COPY"]),
    "SQL Test Copy 2",
  );
});
