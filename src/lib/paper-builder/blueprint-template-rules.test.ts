import assert from "node:assert/strict";
import test from "node:test";

import type { BlueprintPaperDraft } from "./blueprint-types";
import {
  applyBlueprintTemplateSnapshot,
  calculateTemplateSnapshotMarks,
  validateBlueprintTemplateInput,
} from "./blueprint-template-rules";
import type { BlueprintTemplateSnapshot, CreateBlueprintTemplateInput } from "./blueprint-template-types";

function draft(): BlueprintPaperDraft {
  return {
    version: 1,
    details: {
      institutionName: "VEXA",
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
    },
    boardId: "board-1",
    qualificationId: "qualification-1",
    subjectId: "subject-1",
    targetMarks: 10,
    chapters: [
      {
        id: "browser-chapter-id",
        topicId: "topic-1",
        topicName: "Querying and SQL Functions",
        sortOrder: 7,
        rows: [
          {
            id: "browser-row-id",
            topicId: "topic-1",
            sectionLabel: "Section A",
            questionType: "MCQ",
            questionCount: 3,
            marksPerQuestion: 1,
            difficulty: "any",
          },
          {
            id: "browser-row-id-2",
            topicId: "topic-1",
            sectionLabel: "Section B",
            questionType: "SHORT_ANSWER",
            questionCount: 1,
            marksPerQuestion: 7,
            difficulty: "medium",
          },
        ],
      },
    ],
  };
}

function input(patch: Partial<CreateBlueprintTemplateInput> = {}): CreateBlueprintTemplateInput {
  return {
    name: "Class 12 IP · 10 marks",
    description: "Reusable SQL class-test pattern",
    includeHeaderDefaults: true,
    draft: draft(),
    ...patch,
  };
}

function snapshot(): BlueprintTemplateSnapshot {
  const validated = validateBlueprintTemplateInput(input());
  return {
    id: "template-1",
    name: validated.name,
    description: validated.description,
    boardId: validated.boardId,
    qualificationId: validated.qualificationId,
    subjectId: validated.subjectId,
    totalMarks: validated.totalMarks,
    includeHeaderDefaults: validated.includeHeaderDefaults,
    headerDefaults: validated.headerDefaults,
    chapters: validated.chapters.map((chapter) => ({
      topicId: chapter.topicId,
      topicName: "Querying and SQL Functions",
      sortOrder: chapter.sortOrder,
      rows: chapter.rows,
    })),
  };
}

test("sanitizes a blueprint down to pattern fields without browser or question IDs", () => {
  const unsafe = input() as CreateBlueprintTemplateInput & {
    generatedRows: Array<{ questionIds: string[] }>;
    selectedQuestionIds: string[];
  };
  unsafe.generatedRows = [{ questionIds: ["bank-question-1"] }];
  unsafe.selectedQuestionIds = ["bank-question-1"];

  const result = validateBlueprintTemplateInput(unsafe);
  const serialized = JSON.stringify(result);
  assert.equal(result.totalMarks, 10);
  assert.doesNotMatch(serialized, /browser-chapter-id|browser-row-id|bank-question-1|questionIds|selectedQuestionIds/);
});

test("copies optional header defaults only when requested", () => {
  assert.equal(validateBlueprintTemplateInput(input()).headerDefaults?.institutionName, "VEXA");
  assert.equal(validateBlueprintTemplateInput(input({ includeHeaderDefaults: false })).headerDefaults, null);
});

test("rejects target marks that do not equal the calculated blueprint total", () => {
  const mismatch = draft();
  mismatch.targetMarks = 11;
  assert.throws(
    () => validateBlueprintTemplateInput(input({ draft: mismatch })),
    /totals 10 marks, but the target is 11/,
  );
});

test("rejects duplicate chapters and rows attached to another topic", () => {
  const duplicate = draft();
  duplicate.chapters.push({ ...duplicate.chapters[0], id: "second-browser-chapter" });
  assert.throws(() => validateBlueprintTemplateInput(input({ draft: duplicate })), /chapter must be unique/);

  const wrongTopic = draft();
  wrongTopic.chapters[0].rows[0].topicId = "topic-2";
  assert.throws(() => validateBlueprintTemplateInput(input({ draft: wrongTopic })), /wrong chapter/);
});

test("rejects invalid question counts, marks, types, and difficulties", () => {
  for (const [field, value, expected] of [
    ["questionCount", 0, /needs 1 to 100 questions/],
    ["marksPerQuestion", 0, /needs 1 to 100 marks/],
    ["questionType", "CODING_OUTPUT", /valid question type/],
    ["difficulty", "expert", /valid difficulty/],
  ] as const) {
    const invalid = draft();
    Object.assign(invalid.chapters[0].rows[0], { [field]: value });
    assert.throws(() => validateBlueprintTemplateInput(input({ draft: invalid })), expected);
  }
});

test("applying a template creates fresh browser IDs and preserves the saved pattern", () => {
  let sequence = 0;
  const applied = applyBlueprintTemplateSnapshot(snapshot(), (prefix) => `${prefix}-fresh-${++sequence}`);
  assert.equal(applied[0].id, "blueprint-chapter-fresh-1");
  assert.equal(applied[0].rows[0].id, "blueprint-row-fresh-2");
  assert.deepEqual(
    applied[0].rows.map((row) => ({
      topicId: row.topicId,
      sectionLabel: row.sectionLabel,
      questionType: row.questionType,
      questionCount: row.questionCount,
      marksPerQuestion: row.marksPerQuestion,
      difficulty: row.difficulty,
    })),
    [
      { topicId: "topic-1", sectionLabel: "Section A", questionType: "MCQ", questionCount: 3, marksPerQuestion: 1, difficulty: "any" },
      { topicId: "topic-1", sectionLabel: "Section B", questionType: "SHORT_ANSWER", questionCount: 1, marksPerQuestion: 7, difficulty: "medium" },
    ],
  );
});

test("calculates snapshot marks from rows instead of trusting a stored total", () => {
  const template = snapshot();
  assert.equal(calculateTemplateSnapshotMarks(template.chapters), 10);
  template.totalMarks = 999;
  assert.equal(calculateTemplateSnapshotMarks(template.chapters), 10);
});
