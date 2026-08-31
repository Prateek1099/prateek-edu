import assert from "node:assert/strict";
import test from "node:test";

import { assembleBlueprintSelections } from "./blueprint-rules";
import type { BlueprintPaperDraft, BlueprintRowDraft } from "./blueprint-types";
import {
  reviewTeacherBlueprintQuestionAvailability,
  TEACHER_BLUEPRINT_LIMITS,
  validateTeacherBlueprintDraft,
} from "./teacher-blueprint-rules";
import type { PaperBuilderQuestion } from "./types";

function row(patch: Partial<BlueprintRowDraft> = {}): BlueprintRowDraft {
  return {
    id: "row-1",
    topicId: "topic-1",
    sectionLabel: "Section A",
    questionType: "MCQ",
    questionCount: 1,
    marksPerQuestion: 1,
    difficulty: "any",
    ...patch,
  };
}

function draft(rows: BlueprintRowDraft[] = [row()]): BlueprintPaperDraft {
  return {
    version: 1,
    details: {
      institutionName: "Vexa",
      examLabel: "Class Test",
      title: "",
      courseLine: "",
      topicLine: "",
      durationMinutes: 30,
      dateText: "",
      classText: "",
      showStudentName: true,
      showRollNumber: true,
      instructions: "Attempt all questions.",
    },
    boardId: "board-1",
    qualificationId: "qualification-1",
    subjectId: "subject-1",
    targetMarks: rows.reduce(
      (total, item) => total + item.questionCount * item.marksPerQuestion,
      0,
    ),
    chapters: [
      {
        id: "chapter-1",
        topicId: "topic-1",
        topicName: "SQL",
        sortOrder: 0,
        rows,
      },
    ],
  };
}

function question(patch: Partial<PaperBuilderQuestion> = {}): PaperBuilderQuestion {
  return {
    id: "question-1",
    subjectId: "subject-1",
    topicId: "topic-1",
    questionType: "MCQ",
    questionText: "Which SQL clause filters rows?",
    optionA: "WHERE",
    optionB: "GROUP BY",
    optionC: "ORDER BY",
    optionD: "SELECT",
    correctAnswer: "A",
    modelAnswer: null,
    explanation: null,
    topicTag: null,
    difficulty: "easy",
    marks: 1,
    topicName: "SQL",
    ...patch,
  };
}

test("valid teacher blueprint accepts all seven global question types", () => {
  const types = [
    "MCQ",
    "TRUE_FALSE",
    "FILL_BLANK",
    "ASSERTION_REASON",
    "VERY_SHORT_ANSWER",
    "SHORT_ANSWER",
    "LONG_ANSWER",
  ] as const;
  const rows = types.map((questionType, index) =>
    row({
      id: `row-${index}`,
      sectionLabel: `Section ${index + 1}`,
      questionType,
    }),
  );
  assert.equal(validateTeacherBlueprintDraft(draft(rows)), null);
});

test("forged client workspace identity is rejected", () => {
  const forged = { ...draft(), workspaceId: "other-workspace" };
  assert.match(validateTeacherBlueprintDraft(forged) ?? "", /signed-in teacher session/);
});

test("teacher limits block oversized topic, row, question, and marks totals", () => {
  const tooManyTopics = draft();
  tooManyTopics.chapters = Array.from(
    { length: TEACHER_BLUEPRINT_LIMITS.topics + 1 },
    (_, index) => ({
      id: `chapter-${index}`,
      topicId: `topic-${index}`,
      topicName: `Topic ${index}`,
      sortOrder: index,
      rows: [row({ id: `row-${index}`, topicId: `topic-${index}` })],
    }),
  );
  assert.match(validateTeacherBlueprintDraft(tooManyTopics) ?? "", /at most|between 1 and 20/);

  const tooManyRows = Array.from(
    { length: TEACHER_BLUEPRINT_LIMITS.rows + 1 },
    (_, index) => row({ id: `row-${index}`, sectionLabel: `Section ${index}` }),
  );
  assert.match(validateTeacherBlueprintDraft(draft(tooManyRows)) ?? "", /at most 40 rows/);
  assert.match(
    validateTeacherBlueprintDraft(draft([row({ questionCount: 100 }), row({ id: "row-2", sectionLabel: "Section B", questionCount: 51 })])) ?? "",
    /at most 150 questions/,
  );
  assert.match(
    validateTeacherBlueprintDraft(draft([row({ questionCount: 11, marksPerQuestion: 100 })])) ?? "",
    /between 1 and 1000/,
  );
});

test("availability deduplicates normalized text and reports a row shortage", () => {
  const input = draft([row({ questionCount: 2 })]);
  const reviewed = reviewTeacherBlueprintQuestionAvailability(input, [
    question(),
    question({ id: "question-2", questionText: "which sql clause filters rows" }),
  ]);
  assert.equal(reviewed.availability[0].matchingCount, 2);
  assert.equal(reviewed.availability[0].uniqueTextCount, 1);
  assert.equal(reviewed.availability[0].status, "insufficient");
  assert.match(reviewed.availability[0].errors[0], /Only 1 unique matching question/);
});

test("availability respects exact topic, type, marks, difficulty, and completeness", () => {
  const input = draft([row({ difficulty: "easy" })]);
  const reviewed = reviewTeacherBlueprintQuestionAvailability(input, [
    question({ id: "valid" }),
    question({ id: "wrong-topic", topicId: "topic-2", questionText: "Wrong topic" }),
    question({ id: "wrong-marks", marks: 2, questionText: "Wrong marks" }),
    question({ id: "wrong-difficulty", difficulty: "hard", questionText: "Wrong difficulty" }),
    question({ id: "incomplete", optionD: null, questionText: "Incomplete" }),
  ]);
  assert.equal(reviewed.availability[0].matchingCount, 1);
  assert.deepEqual(reviewed.pools.get("row-1")?.map((item) => item.id), ["valid"]);
});

test("scarcity-first generation remains all-or-nothing and duplicate-safe", () => {
  const firstRow = row({ id: "scarce", questionCount: 1 });
  const secondRow = row({ id: "broad", sectionLabel: "Section B", questionCount: 1 });
  const shared = question({ id: "shared" });
  const other = question({ id: "other", questionText: "A second distinct SQL question" });
  const selected = assembleBlueprintSelections(
    [secondRow, firstRow],
    new Map([
      ["scarce", [shared]],
      ["broad", [shared, other]],
    ]),
    (items) => items,
  );
  assert.equal(selected.shortages.length, 0);
  assert.deepEqual(selected.selected.get("scarce")?.map((item) => item.id), ["shared"]);
  assert.deepEqual(selected.selected.get("broad")?.map((item) => item.id), ["other"]);

  const impossible = assembleBlueprintSelections(
    [firstRow, secondRow],
    new Map([
      ["scarce", [shared]],
      ["broad", [question({ id: "duplicate", questionText: "which sql clause filters rows" })]],
    ]),
    (items) => items,
  );
  assert.equal(impossible.selected.size, 0);
  assert.equal(impossible.shortages.length, 1);
});
