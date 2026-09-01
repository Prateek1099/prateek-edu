import assert from "node:assert/strict";
import test from "node:test";

import type { BlueprintRowDraft } from "./blueprint-types";
import {
  teacherBlueprintFreshRegenerationPool,
  teacherBlueprintReplacementCandidates,
  TEACHER_BLUEPRINT_REPLACEMENT_LIMIT,
} from "./teacher-blueprint-review-rules";
import type { PaperBuilderQuestion } from "./types";

const row: BlueprintRowDraft = {
  id: "row-1",
  topicId: "topic-1",
  sectionLabel: "Section A",
  questionType: "MCQ",
  questionCount: 2,
  marksPerQuestion: 1,
  difficulty: "any",
};

function question(
  id: string,
  patch: Partial<PaperBuilderQuestion> = {},
): PaperBuilderQuestion {
  return {
    id,
    subjectId: "subject-1",
    topicId: "topic-1",
    questionType: "MCQ",
    questionText: `Question ${id}`,
    optionA: "A",
    optionB: "B",
    optionC: "C",
    optionD: "D",
    correctAnswer: "A",
    modelAnswer: null,
    explanation: null,
    source: null,
    imageUrl: null,
    imageAlt: null,
    imageCaption: null,
    topicTag: null,
    difficulty: "easy",
    marks: 1,
    topicName: "SQL",
    ...patch,
  };
}

test("teacher replacements keep exact row rules and the replaced question difficulty", () => {
  const current = question("current", { difficulty: "medium" });
  const candidates = teacherBlueprintReplacementCandidates(
    [
      current,
      question("valid", { difficulty: "medium" }),
      question("wrong-topic", { topicId: "topic-2", difficulty: "medium" }),
      question("wrong-type", { questionType: "TRUE_FALSE", difficulty: "medium" }),
      question("wrong-marks", { marks: 2, difficulty: "medium" }),
      question("wrong-difficulty", { difficulty: "hard" }),
    ],
    "subject-1",
    row,
    [current],
    current.id,
  );

  assert.deepEqual(candidates.map((candidate) => candidate.id), ["valid"]);
});

test("teacher replacements exclude current IDs and normalized duplicate text", () => {
  const first = question("first", { questionText: "What is SQL?" });
  const second = question("second", { questionText: "Choose a database command" });
  const candidates = teacherBlueprintReplacementCandidates(
    [
      first,
      second,
      question("same-text", { questionText: "  what   is sql  " }),
      question("new", { questionText: "Which clause filters rows?" }),
    ],
    "subject-1",
    row,
    [first, second],
    second.id,
  );

  assert.deepEqual(candidates.map((candidate) => candidate.id), ["new"]);
});

test("teacher replacement results are capped at ten", () => {
  const current = question("current");
  const candidates = teacherBlueprintReplacementCandidates(
    [current, ...Array.from({ length: 15 }, (_, index) => question(`candidate-${index}`))],
    "subject-1",
    row,
    [current],
    current.id,
  );

  assert.equal(TEACHER_BLUEPRINT_REPLACEMENT_LIMIT, 10);
  assert.equal(candidates.length, 10);
});

test("fresh regeneration excludes every current paper ID and normalized text", () => {
  const current = question("current", { questionText: "Current question" });
  const retained = question("retained", { questionText: "Retained question" });
  const pool = teacherBlueprintFreshRegenerationPool(
    [
      current,
      retained,
      question("duplicate-current", { questionText: " current   question " }),
      question("fresh", { questionText: "Fresh replacement" }),
    ],
    "subject-1",
    row,
    [current, retained],
  );

  assert.deepEqual(pool.map((candidate) => candidate.id), ["fresh"]);
});
