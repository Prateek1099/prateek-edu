import assert from "node:assert/strict";
import test from "node:test";

import type { WorkspaceBlueprintTemplateInput } from "./workspace-blueprint-template-types";
import {
  nextWorkspaceBlueprintTemplateCopyName,
  validateWorkspaceBlueprintTemplateInput,
  workspaceBlueprintTemplateDraft,
  workspaceBlueprintTemplateNameKey,
} from "./workspace-blueprint-template-rules";

const details = {
  institutionName: "Lucky International School",
  examLabel: "Class Test",
  title: "",
  courseLine: "Informatics Practices · Class 12",
  topicLine: "SQL",
  durationMinutes: 30,
  dateText: "",
  classText: "Class 12",
  showStudentName: true,
  showRollNumber: true,
  instructions: "Attempt all questions.",
};

function input(overrides: Partial<WorkspaceBlueprintTemplateInput> = {}): WorkspaceBlueprintTemplateInput {
  return {
    name: "  PT-1   Blueprint ",
    description: "  Topic-wise   pattern ",
    includeHeaderDefaults: true,
    preferredHeaderTemplateId: "header-1",
    draft: {
      version: 1,
      details,
      boardId: "board-cbse",
      qualificationId: "class-12",
      subjectId: "subject-ip",
      targetMarks: 7,
      chapters: [
        {
          id: "chapter-sql",
          topicId: "topic-sql",
          topicName: "Querying and SQL Functions",
          sortOrder: 0,
          rows: [
            {
              id: "row-a",
              topicId: "topic-sql",
              sectionLabel: " Section A ",
              questionType: "MCQ",
              questionCount: 3,
              marksPerQuestion: 1,
              difficulty: "any",
            },
            {
              id: "row-b",
              topicId: "topic-sql",
              sectionLabel: "Section B",
              questionType: "VERY_SHORT_ANSWER",
              questionCount: 2,
              marksPerQuestion: 2,
              difficulty: "medium",
            },
          ],
        },
      ],
    },
    ...overrides,
  };
}

test("teacher Blueprint template names use a normalized workspace subject key", () => {
  assert.equal(workspaceBlueprintTemplateNameKey("  PT-1   BLUEPRINT "), "pt-1 blueprint");
  assert.equal(workspaceBlueprintTemplateNameKey("ＰＴ Test"), "pt test");
});

test("validation stores only reusable Blueprint structure", () => {
  const unsafe = {
    ...input(),
    workspaceId: "attacker-workspace",
  } as WorkspaceBlueprintTemplateInput;
  assert.throws(
    () => validateWorkspaceBlueprintTemplateInput(unsafe),
    /derived from the signed-in teacher session/,
  );

  const withQuestionState = {
    ...input(),
    questionIds: ["bank-1"],
    generatedRows: [{ questionIds: ["bank-1"] }],
    preview: { sections: [] },
  } as WorkspaceBlueprintTemplateInput;
  const validated = validateWorkspaceBlueprintTemplateInput(withQuestionState);
  assert.equal(validated.name, "PT-1 Blueprint");
  assert.equal(validated.description, "Topic-wise pattern");
  assert.equal(validated.targetMarks, 7);
  assert.equal("questionIds" in validated, false);
  assert.equal("generatedRows" in validated, false);
  assert.equal("preview" in validated, false);
});

test("all seven teacher global question types can be saved in Blueprint rows", () => {
  const types = [
    "MCQ",
    "TRUE_FALSE",
    "FILL_BLANK",
    "ASSERTION_REASON",
    "VERY_SHORT_ANSWER",
    "SHORT_ANSWER",
    "LONG_ANSWER",
  ] as const;
  const draft = input().draft;
  const rows = types.map((questionType, index) => ({
    id: `row-${index}`,
    topicId: "topic-sql",
    sectionLabel: `Section ${index + 1}`,
    questionType,
    questionCount: 1,
    marksPerQuestion: 1,
    difficulty: "any" as const,
  }));
  const validated = validateWorkspaceBlueprintTemplateInput(input({
    draft: { ...draft, targetMarks: 7, chapters: [{ ...draft.chapters[0], rows }] },
  }));
  assert.deepEqual(validated.chapters[0].rows.map((row) => row.questionType), types);
});

test("paper-wide section labels keep one question type and marks value", () => {
  const draft = input().draft;
  const second = {
    id: "chapter-python",
    topicId: "topic-python",
    topicName: "Python",
    sortOrder: 1,
    rows: [{
      id: "row-conflict",
      topicId: "topic-python",
      sectionLabel: "Section A",
      questionType: "SHORT_ANSWER" as const,
      questionCount: 1,
      marksPerQuestion: 3,
      difficulty: "any" as const,
    }],
  };
  assert.throws(
    () => validateWorkspaceBlueprintTemplateInput(input({
      draft: { ...draft, targetMarks: 10, chapters: [...draft.chapters, second] },
    })),
    /Section A.*same question type and marks/i,
  );
});

test("teacher Blueprint limits remain stricter than admin limits", () => {
  const draft = input().draft;
  const rows = Array.from({ length: 41 }, (_, index) => ({
    id: `row-${index}`,
    topicId: "topic-sql",
    sectionLabel: `Section ${index + 1}`,
    questionType: "MCQ" as const,
    questionCount: 1,
    marksPerQuestion: 1,
    difficulty: "any" as const,
  }));
  assert.throws(
    () => validateWorkspaceBlueprintTemplateInput(input({
      draft: { ...draft, targetMarks: 41, chapters: [{ ...draft.chapters[0], rows }] },
    })),
    /at most 40 rows/,
  );
});

test("target marks must match the topic-wise Blueprint rows", () => {
  const draft = input().draft;
  assert.throws(
    () => validateWorkspaceBlueprintTemplateInput(input({
      draft: { ...draft, targetMarks: 8 },
    })),
    /totals 7 marks, but the target is 8/,
  );
});

test("preferred teacher header reference is optional and normalized", () => {
  const validated = validateWorkspaceBlueprintTemplateInput(input({
    preferredHeaderTemplateId: null,
  }));
  assert.equal(validated.preferredHeaderTemplateId, null);
});

test("template snapshots rebuild fresh client rows without question identifiers", () => {
  const draft = workspaceBlueprintTemplateDraft({
    boardId: "board-cbse",
    qualificationId: "class-12",
    subjectId: "subject-ip",
    totalMarks: 7,
    chapters: [{
      topicId: "topic-sql",
      topicName: "SQL",
      sortOrder: 0,
      rows: validateWorkspaceBlueprintTemplateInput(input()).chapters[0].rows,
    }],
  }, details);
  assert.equal(draft.chapters[0].rows[0].id, "template-row-0-0");
  assert.equal("questionIds" in draft.chapters[0].rows[0], false);
  assert.equal("questions" in draft.chapters[0].rows[0], false);
});

test("duplicate templates use Copy of naming inside the same workspace subject", () => {
  assert.equal(
    nextWorkspaceBlueprintTemplateCopyName("PT-1", ["pt-1"]),
    "Copy of PT-1",
  );
  assert.equal(
    nextWorkspaceBlueprintTemplateCopyName("PT-1", ["pt-1", "copy of pt-1"]),
    "Copy of PT-1 2",
  );
});
