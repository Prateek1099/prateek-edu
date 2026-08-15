import assert from "node:assert/strict";
import test from "node:test";

import type { PaperBuilderQuestion } from "./types";
import type { BlueprintChapterDraft, BlueprintRowDraft } from "./blueprint-types";
import {
  assembleBlueprintSelections,
  calculateBlueprintChapterMarks,
  calculateBlueprintPaperMarks,
  findIncompatibleBlueprintSectionLabels,
  groupBlueprintRowsForOutput,
  questionMatchesBlueprintRow,
  uniqueBlueprintCandidates,
} from "./blueprint-rules";

function row(patch: Partial<BlueprintRowDraft> = {}): BlueprintRowDraft {
  return {
    id: "row-1",
    topicId: "topic-1",
    sectionLabel: "Section A",
    questionType: "MCQ",
    questionCount: 3,
    marksPerQuestion: 1,
    difficulty: "any",
    ...patch,
  };
}

function chapter(id: string, topicId: string, rows: BlueprintRowDraft[]): BlueprintChapterDraft {
  return { id, topicId, topicName: id, sortOrder: 0, rows };
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

test("calculates row, chapter, and paper totals", () => {
  const first = chapter("chapter-1", "topic-1", [
    row({ questionCount: 3, marksPerQuestion: 1 }),
    row({ id: "row-2", sectionLabel: "Section B", questionType: "VERY_SHORT_ANSWER", questionCount: 2, marksPerQuestion: 2 }),
    row({ id: "row-3", sectionLabel: "Section C", questionType: "SHORT_ANSWER", questionCount: 1, marksPerQuestion: 3 }),
  ]);
  const second = chapter("chapter-2", "topic-2", [row({ id: "row-4", topicId: "topic-2", questionCount: 5 })]);
  assert.equal(calculateBlueprintChapterMarks(first), 10);
  assert.equal(calculateBlueprintPaperMarks([first, second]), 15);
});

test("matches the exact blueprint topic instead of any selected topic", () => {
  assert.equal(questionMatchesBlueprintRow(question(), "subject-1", row()), true);
  assert.equal(questionMatchesBlueprintRow(question({ topicId: "topic-2" }), "subject-1", row()), false);
});

test("mixed difficulty accepts all difficulties but explicit difficulty does not", () => {
  assert.equal(questionMatchesBlueprintRow(question({ difficulty: "hard" }), "subject-1", row()), true);
  assert.equal(questionMatchesBlueprintRow(question({ difficulty: "hard" }), "subject-1", row({ difficulty: "easy" })), false);
});

test("candidate availability removes normalized duplicate text", () => {
  const candidates = uniqueBlueprintCandidates([
    question(),
    question({ id: "question-2", questionText: "which sql clause filters rows" }),
  ], "subject-1", row());
  assert.equal(candidates.length, 1);
});

test("allows compatible repeated section labels and rejects incompatible definitions", () => {
  const compatible = [
    chapter("one", "topic-1", [row()]),
    chapter("two", "topic-2", [row({ id: "row-2", topicId: "topic-2" })]),
  ];
  assert.equal(findIncompatibleBlueprintSectionLabels(compatible), null);
  assert.match(
    findIncompatibleBlueprintSectionLabels([
      ...compatible,
      chapter("three", "topic-3", [row({ id: "row-3", topicId: "topic-3", questionType: "SHORT_ANSWER", marksPerQuestion: 3 })]),
    ]) ?? "",
    /same question type and marks/,
  );
});

test("groups compatible chapter rows into one printable section", () => {
  const sections = groupBlueprintRowsForOutput([
    { ...row({ questionCount: 1 }), questions: [question()] },
    { ...row({ id: "row-2", topicId: "topic-2", questionCount: 1 }), questions: [question({ id: "question-2", topicId: "topic-2", questionText: "What does SELECT do?" })] },
  ]);
  assert.equal(sections.length, 1);
  assert.equal(sections[0].questionCount, 2);
  assert.deepEqual(sections[0].questions.map((item) => item.id), ["question-1", "question-2"]);
});

test("selection is all-or-nothing when any row cannot be filled", () => {
  const rows = [row({ id: "enough", questionCount: 1 }), row({ id: "short", questionCount: 2 })];
  const result = assembleBlueprintSelections(rows, new Map([
    ["enough", [question()]],
    ["short", [question({ id: "question-2", questionText: "Second question" })]],
  ]), (items) => items);
  assert.equal(result.selected.size, 0);
  assert.deepEqual(result.shortages, [{ rowId: "short", usableCount: 1 }]);
});

test("scarcity-first selection preserves a shared candidate for the constrained row", () => {
  const shared = question({ id: "shared" });
  const broadOnly = question({ id: "broad-only", questionText: "A different usable question" });
  const broad = row({ id: "broad", questionCount: 1 });
  const scarce = row({ id: "scarce", questionCount: 1 });
  const result = assembleBlueprintSelections([broad, scarce], new Map([
    ["broad", [shared, broadOnly]],
    ["scarce", [shared]],
  ]), (items) => items);
  assert.equal(result.shortages.length, 0);
  assert.deepEqual(result.selected.get("scarce")?.map((item) => item.id), ["shared"]);
  assert.deepEqual(result.selected.get("broad")?.map((item) => item.id), ["broad-only"]);
});

test("selection blocks normalized duplicate text across rows", () => {
  const first = question({ id: "first", questionText: "Define SQL." });
  const duplicate = question({ id: "second", questionText: "define sql" });
  const result = assembleBlueprintSelections(
    [row({ id: "one", questionCount: 1 }), row({ id: "two", questionCount: 1 })],
    new Map([["one", [first]], ["two", [duplicate]]]),
    (items) => items,
  );
  assert.equal(result.selected.size, 0);
  assert.equal(result.shortages.length, 1);
});
