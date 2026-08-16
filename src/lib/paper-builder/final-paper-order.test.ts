import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import type { PaperBuilderQuestion, ValidatedPaper, ValidatedPaperSection } from "./types";
import {
  applyFinalQuestionOrder,
  createFinalQuestionOrder,
  hasSameQuestionOrder,
  reconcileFinalQuestionOrder,
  replaceFinalQuestionId,
  reshuffleFinalQuestionOrder,
} from "./final-paper-order";

function question(id: string, topicId: string, questionType: PaperBuilderQuestion["questionType"] = "MCQ", marks = 1): PaperBuilderQuestion {
  return {
    id,
    subjectId: "subject-1",
    topicId,
    questionType,
    questionText: `Question ${id}`,
    optionA: questionType === "MCQ" ? "A" : null,
    optionB: questionType === "MCQ" ? "B" : null,
    optionC: questionType === "MCQ" ? "C" : null,
    optionD: questionType === "MCQ" ? "D" : null,
    correctAnswer: questionType === "MCQ" ? "A" : null,
    modelAnswer: questionType === "MCQ" ? null : `Answer ${id}`,
    explanation: `Explanation ${id}`,
    topicTag: null,
    difficulty: "easy",
    marks,
    topicName: topicId,
  };
}

function section(id: string, questions: PaperBuilderQuestion[]): ValidatedPaperSection {
  return {
    patternId: id,
    label: id === "a" ? "Section A" : "Section B",
    questionType: questions[0].questionType,
    questionCount: questions.length,
    marksPerQuestion: questions[0].marks,
    difficulty: "any",
    questions,
  };
}

function paper(): ValidatedPaper {
  return {
    details: {
      institutionName: "Vexa",
      examLabel: "Class Test",
      title: "",
      courseLine: "Class 12",
      topicLine: "",
      durationMinutes: 30,
      dateText: "",
      classText: "",
      showStudentName: true,
      showRollNumber: true,
      instructions: "Attempt all questions.",
    },
    boardTitle: "CBSE",
    qualificationTitle: "Class 12",
    subjectName: "IP",
    topicNames: ["topic-1", "topic-2"],
    totalMarks: 10,
    sections: [
      section("a", [question("a1", "topic-1"), question("a2", "topic-1"), question("a3", "topic-2"), question("a4", "topic-2")]),
      section("b", [question("b1", "topic-1", "SHORT_ANSWER", 3), question("b2", "topic-2", "SHORT_ANSWER", 3)]),
    ],
  };
}

function ids(value: ValidatedPaper) {
  return value.sections.flatMap((item) => item.questions.map((questionItem) => questionItem.id));
}

test("chapter-wise mode preserves existing output order", () => {
  const source = paper();
  const order = createFinalQuestionOrder(source.sections, "chapter_wise", 1);
  assert.deepEqual(order, ["a1", "a2", "a3", "a4", "b1", "b2"]);
  assert.equal(applyFinalQuestionOrder(source, "chapter_wise", order), source);
});

test("shuffle-within-sections preserves section groups", () => {
  const source = paper();
  const order = createFinalQuestionOrder(source.sections, "shuffle_within_sections", 4);
  const output = applyFinalQuestionOrder(source, "shuffle_within_sections", order);
  assert.deepEqual(output.sections.map((item) => item.label), ["Section A", "Section B"]);
  assert.deepEqual(output.sections.map((item) => item.questions.length), [4, 2]);
});

test("shuffle-within-sections mixes chapters when possible", () => {
  const source = paper();
  const order = createFinalQuestionOrder(source.sections, "shuffle_within_sections", 4);
  const firstSection = applyFinalQuestionOrder(source, "shuffle_within_sections", order).sections[0];
  assert.notEqual(firstSection.questions[0].topicId, firstSection.questions[1].topicId);
  assert.notEqual(firstSection.questions[2].topicId, firstSection.questions[3].topicId);
});

test("fully shuffled mode includes every question exactly once", () => {
  const source = paper();
  const order = createFinalQuestionOrder(source.sections, "fully_shuffled", 7);
  const output = applyFinalQuestionOrder(source, "fully_shuffled", order);
  assert.equal(output.sections.length, 1);
  assert.equal(output.sections[0].isMixedOutput, true);
  assert.deepEqual(new Set(ids(output)), new Set(ids(source)));
});

test("all ordering modes prevent duplicate IDs", () => {
  const source = paper();
  for (const mode of ["chapter_wise", "shuffle_within_sections", "fully_shuffled"] as const) {
    const order = createFinalQuestionOrder(source.sections, mode, 9);
    assert.equal(order.length, new Set(order).size);
  }
});

test("student paper and answer key share the exact ordered paper", () => {
  const source = paper();
  const order = createFinalQuestionOrder(source.sections, "fully_shuffled", 3);
  const sharedOutput = applyFinalQuestionOrder(source, "fully_shuffled", order);
  assert.deepEqual(ids(sharedOutput), order);
  assert.deepEqual(ids(sharedOutput), ids(sharedOutput));
});

test("repeated application is stable until reshuffle", () => {
  const source = paper();
  const order = createFinalQuestionOrder(source.sections, "fully_shuffled", 3);
  assert.deepEqual(ids(applyFinalQuestionOrder(source, "fully_shuffled", order)), ids(applyFinalQuestionOrder(source, "fully_shuffled", order)));
});

test("reshuffle changes order when enough questions exist", () => {
  const source = paper();
  const current = createFinalQuestionOrder(source.sections, "fully_shuffled", 2);
  const next = reshuffleFinalQuestionOrder(source.sections, "fully_shuffled", current, 3);
  assert.equal(hasSameQuestionOrder(current, next.ids), false);
});

test("replacement preserves the former output position", () => {
  const current = ["a3", "a1", "a4", "a2"];
  assert.deepEqual(replaceFinalQuestionId(current, "a1", "replacement"), ["a3", "replacement", "a4", "a2"]);
});

test("removal drops the missing question and leaves output incomplete upstream", () => {
  const source = paper();
  source.sections[0].questions = source.sections[0].questions.filter((item) => item.id !== "a2");
  const reconciled = reconcileFinalQuestionOrder(source.sections, "fully_shuffled", ["a3", "a1", "a4", "a2", "b1", "b2"]);
  assert.equal(reconciled.includes("a2"), false);
  assert.equal(reconciled.length, 5);
});

test("an applied template can clear ordering state without persistence", () => {
  assert.deepEqual(reconcileFinalQuestionOrder([], "shuffle_within_sections", ["a1", "a2"]), []);
});

test("row regeneration preserves unaffected IDs and appends new valid IDs", () => {
  const source = paper();
  source.sections[0].questions = [question("new-a", "topic-1"), question("a2", "topic-1"), question("a3", "topic-2"), question("a4", "topic-2")];
  const reconciled = reconcileFinalQuestionOrder(source.sections, "shuffle_within_sections", ["a3", "a1", "a4", "a2", "b2", "b1"]);
  assert.deepEqual(reconciled.slice(0, 3), ["a3", "a4", "a2"]);
  assert.equal(reconciled.includes("new-a"), true);
});

test("DOCX receives the same ordered paper used by preview and print", () => {
  const client = readFileSync(new URL("../../app/admin/paper-builder/blueprint/BlueprintBuilderClient.tsx", import.meta.url), "utf8");
  assert.match(client, /<PreviewStep[\s\S]*?paper=\{orderedPaper\}/);
  assert.match(client, /downloadPaperDocx\(orderedPaper, mode\)/);
});

test("print actions are gated by the same ordered paper", () => {
  const client = readFileSync(new URL("../../app/admin/paper-builder/blueprint/BlueprintBuilderClient.tsx", import.meta.url), "utf8");
  assert.match(client, /if \(!orderedPaper\) return toast\.error\("Validate the current blueprint before printing\."\)/);
  assert.match(client, /paperPrintMode = mode/);
});
