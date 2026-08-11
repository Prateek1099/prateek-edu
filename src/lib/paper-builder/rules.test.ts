import assert from "node:assert/strict";
import test from "node:test";

import {
  calculatePatternMarks,
  isCompletePaperQuestion,
  normalizeQuestionText,
  questionMatchesPattern,
} from "./rules";
import type { PaperBuilderQuestion, PaperPatternRow } from "./types";

test("calculates mixed paper marks from question count multiplied by marks per question", () => {
  const rows: PaperPatternRow[] = [
    { id: "a", label: "Section A", questionType: "MCQ", questionCount: 2, marksPerQuestion: 1, difficulty: "easy" },
    { id: "b", label: "Section B", questionType: "TRUE_FALSE", questionCount: 1, marksPerQuestion: 1, difficulty: "medium" },
    { id: "c", label: "Section C", questionType: "SHORT_ANSWER", questionCount: 2, marksPerQuestion: 2, difficulty: "hard" },
    { id: "d", label: "Section D", questionType: "LONG_ANSWER", questionCount: 1, marksPerQuestion: 4, difficulty: "any" },
  ];

  assert.equal(calculatePatternMarks(rows), 11);
  assert.notEqual(calculatePatternMarks(rows), 15);
});

test("calculates the V2 smoke pattern as 10 marks", () => {
  const rows: PaperPatternRow[] = [
    { id: "mcq", label: "Section A", questionType: "MCQ", questionCount: 3, marksPerQuestion: 1, difficulty: "any" },
    { id: "vsa", label: "Section B", questionType: "VERY_SHORT_ANSWER", questionCount: 2, marksPerQuestion: 2, difficulty: "any" },
    { id: "short", label: "Section C", questionType: "SHORT_ANSWER", questionCount: 1, marksPerQuestion: 3, difficulty: "any" },
  ];

  assert.equal(calculatePatternMarks(rows), 10);
});

test("normalizes case, punctuation, and repeated whitespace for duplicate detection", () => {
  assert.equal(
    normalizeQuestionText("  Which SQL clause filters rows?  "),
    normalizeQuestionText("which sql clause filters rows"),
  );
});

test("accepts complete written questions and matches the configured mixed section", () => {
  const question: PaperBuilderQuestion = {
    id: "written-1",
    subjectId: "subject-1",
    topicId: "topic-1",
    questionType: "SHORT_ANSWER",
    questionText: "Explain the difference between WHERE and HAVING.",
    optionA: null,
    optionB: null,
    optionC: null,
    optionD: null,
    correctAnswer: null,
    modelAnswer: "WHERE filters rows; HAVING filters groups.",
    explanation: null,
    topicTag: null,
    difficulty: "medium",
    marks: 3,
    topicName: "SQL",
  };
  const pattern: PaperPatternRow = {
    id: "section-c",
    label: "Section C",
    questionType: "SHORT_ANSWER",
    questionCount: 1,
    marksPerQuestion: 3,
    difficulty: "any",
  };

  assert.equal(isCompletePaperQuestion(question), true);
  assert.equal(questionMatchesPattern(question, "subject-1", ["topic-1"], pattern), true);
  assert.equal(questionMatchesPattern({ ...question, questionType: "LONG_ANSWER" }, "subject-1", ["topic-1"], pattern), false);
});

test("rejects incomplete type-specific questions", () => {
  const base: PaperBuilderQuestion = {
    id: "fill-1",
    subjectId: "subject-1",
    topicId: "topic-1",
    questionType: "FILL_BLANK",
    questionText: "The SQL filtering clause is ____.",
    optionA: null,
    optionB: null,
    optionC: null,
    optionD: null,
    correctAnswer: null,
    modelAnswer: null,
    explanation: null,
    topicTag: null,
    difficulty: "easy",
    marks: 1,
    topicName: "SQL",
  };

  assert.equal(isCompletePaperQuestion(base), false);
  assert.equal(isCompletePaperQuestion({ ...base, correctAnswer: "WHERE" }), true);
});
