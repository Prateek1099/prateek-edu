import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import type { PaperBuilderQuestion } from "./types";
import type { BlueprintChapterDraft, BlueprintGeneratedRow, BlueprintRowDraft } from "./blueprint-types";
import {
  assembleBlueprintSelections,
  applyBlueprintCandidate,
  applyBlueprintRegeneratedRows,
  calculateBlueprintChapterMarks,
  calculateBlueprintPaperMarks,
  findIncompatibleBlueprintSectionLabels,
  findIncompleteBlueprintRows,
  filterBlueprintReplacementCandidates,
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

function generatedRow(patch: Partial<BlueprintGeneratedRow> = {}): BlueprintGeneratedRow {
  return {
    ...row({ questionCount: 1 }),
    topicName: "SQL",
    questions: [question()],
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

test("replacement candidates match the exact topic, type, marks, and difficulty", () => {
  const target = row({ difficulty: "easy" });
  const valid = question({ id: "valid" });
  const candidates = filterBlueprintReplacementCandidates([
    valid,
    question({ id: "wrong-topic", topicId: "topic-2", questionText: "Wrong topic" }),
    question({ id: "wrong-type", questionType: "SHORT_ANSWER", modelAnswer: "Answer", optionA: null, optionB: null, optionC: null, optionD: null, correctAnswer: null, questionText: "Wrong type" }),
    question({ id: "wrong-marks", marks: 2, questionText: "Wrong marks" }),
    question({ id: "wrong-difficulty", difficulty: "hard", questionText: "Wrong difficulty" }),
  ], "subject-1", target, []);
  assert.deepEqual(candidates.map((item) => item.id), ["valid"]);
});

test("replacement candidates exclude question IDs already used elsewhere", () => {
  const used = question({ id: "used" });
  const available = question({ id: "available", questionText: "A fresh SQL question" });
  const candidates = filterBlueprintReplacementCandidates([used, available], "subject-1", row(), [used]);
  assert.deepEqual(candidates.map((item) => item.id), ["available"]);
});

test("replacement candidates exclude normalized duplicate text used elsewhere", () => {
  const used = question({ id: "used", questionText: "Define a SQL query." });
  const duplicate = question({ id: "duplicate", questionText: "define a sql query" });
  const available = question({ id: "available", questionText: "Explain SELECT." });
  const candidates = filterBlueprintReplacementCandidates([duplicate, available], "subject-1", row(), [used]);
  assert.deepEqual(candidates.map((item) => item.id), ["available"]);
});

test("removing a question creates an incomplete row that blocks output readiness", () => {
  const incomplete = generatedRow({ questionCount: 2, questions: [question()] });
  assert.deepEqual(findIncompleteBlueprintRows([incomplete]), [incomplete.id]);
});

test("manual replacement completes an incomplete row", () => {
  const incomplete = generatedRow({ questionCount: 2, questions: [question()] });
  const candidate = question({ id: "second", questionText: "What is a database?" });
  const completed = applyBlueprintCandidate([incomplete], incomplete.id, candidate);
  assert.equal(completed[0].questions.length, 2);
  assert.deepEqual(findIncompleteBlueprintRows(completed), []);
});

test("individual replacement preserves totals and row position", () => {
  const current = generatedRow({ questions: [question({ marks: 1 })] });
  const candidate = question({ id: "replacement", questionText: "Replacement SQL question", marks: 1 });
  const replaced = applyBlueprintCandidate([current], current.id, candidate, "question-1");
  assert.deepEqual(replaced[0].questions.map((item) => item.id), ["replacement"]);
  assert.equal(replaced.flatMap((item) => item.questions).reduce((total, item) => total + item.marks, 0), 1);
});

test("regenerate row preserves every other row", () => {
  const first = generatedRow();
  const second = generatedRow({ id: "row-2", sectionLabel: "Section B", questions: [question({ id: "q-2", questionText: "Second row" })] });
  const replacement = generatedRow({ ...first, questions: [question({ id: "replacement", questionText: "Replacement row" })] });
  const result = applyBlueprintRegeneratedRows([first, second], [replacement], [first.id]);
  assert.equal(result.errors.length, 0);
  assert.equal(result.rows[1], second);
  assert.equal(result.rows[0].questions[0].id, "replacement");
});

test("failed row regeneration keeps the old row unchanged", () => {
  const current = [generatedRow()];
  const incompleteReplacement = generatedRow({ questionCount: 2, questions: [question()] });
  const result = applyBlueprintRegeneratedRows(current, [incompleteReplacement], [current[0].id]);
  assert.equal(result.rows, current);
  assert.equal(result.errors.length, 1);
});

test("regenerate chapter preserves rows from other chapters", () => {
  const chapterOneA = generatedRow({ id: "chapter-1-a" });
  const chapterOneB = generatedRow({ id: "chapter-1-b", sectionLabel: "Section B", questions: [question({ id: "old-b", questionText: "Old B" })] });
  const otherChapter = generatedRow({ id: "chapter-2-a", topicId: "topic-2", topicName: "Networks", questions: [question({ id: "other", topicId: "topic-2", questionText: "Other chapter" })] });
  const replacements = [
    generatedRow({ ...chapterOneA, questions: [question({ id: "new-a", questionText: "New A" })] }),
    generatedRow({ ...chapterOneB, questions: [question({ id: "new-b", questionText: "New B" })] }),
  ];
  const result = applyBlueprintRegeneratedRows([chapterOneA, chapterOneB, otherChapter], replacements, [chapterOneA.id, chapterOneB.id]);
  assert.equal(result.errors.length, 0);
  assert.equal(result.rows[2], otherChapter);
});

test("failed chapter regeneration keeps the entire old chapter unchanged", () => {
  const current = [generatedRow({ id: "row-a" }), generatedRow({ id: "row-b" })];
  const result = applyBlueprintRegeneratedRows(current, [generatedRow({ id: "row-a" })], ["row-a", "row-b"]);
  assert.equal(result.rows, current);
  assert.equal(result.errors.length, 1);
});

test("chapter regeneration reports all incomplete row errors together", () => {
  const current = [generatedRow({ id: "row-a" }), generatedRow({ id: "row-b" })];
  const incomplete = generatedRow({ id: "row-b", questionCount: 2, questions: [] });
  const result = applyBlueprintRegeneratedRows(current, [incomplete], ["row-a", "row-b"]);
  assert.equal(result.rows, current);
  assert.equal(result.errors.length, 2);
});

test("Blueprint V3B server actions contain no Prisma write operation", () => {
  const actions = readFileSync(new URL("../../app/admin/paper-builder/blueprint/actions.ts", import.meta.url), "utf8");
  assert.doesNotMatch(actions, /prisma\.[A-Za-z]+\.(create|createMany|update|updateMany|upsert|delete|deleteMany)\s*\(/);
});
