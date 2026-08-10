import assert from "node:assert/strict";
import test from "node:test";

import { parseBankQuestionCsv } from "./bank-question-csv";
import { normalizeBankQuestionType, validateBankQuestionInput } from "./bank-questions";

test("normalizes supported question type aliases without guessing unknown types", () => {
  assert.equal(normalizeBankQuestionType("TRUE/FALSE"), "TRUE_FALSE");
  assert.equal(normalizeBankQuestionType("VSA"), "VERY_SHORT_ANSWER");
  assert.equal(normalizeBankQuestionType("case based"), null);
});

test("clears hidden MCQ fields for written questions", () => {
  const result = validateBankQuestionInput({
    subjectId: "subject-1",
    topicId: "topic-1",
    questionType: "SHORT_ANSWER",
    questionText: "Explain normalization.",
    optionA: "untrusted hidden value",
    correctAnswer: "A",
    modelAnswer: "Normalization reduces redundancy.",
    difficulty: "medium",
    marks: 3,
  });
  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.optionA, null);
    assert.equal(result.data.correctAnswer, null);
  }
});

test("validates every Phase A question shape without hard-coding marks by type", () => {
  const common = {
    subjectId: "subject-1",
    topicId: "topic-1",
    questionText: "Question text",
    difficulty: "hard",
    marks: 7,
  };
  const cases = [
    { ...common, questionType: "MCQ" as const, optionA: "A", optionB: "B", optionC: "C", optionD: "D", correctAnswer: "B" },
    { ...common, questionType: "TRUE_FALSE" as const, correctAnswer: "false" },
    { ...common, questionType: "FILL_BLANK" as const, correctAnswer: "canonical value" },
    { ...common, questionType: "ASSERTION_REASON" as const, optionA: "A", optionB: "B", optionC: "C", optionD: "D", correctAnswer: "D" },
    { ...common, questionType: "VERY_SHORT_ANSWER" as const, modelAnswer: "One marking point" },
    { ...common, questionType: "SHORT_ANSWER" as const, modelAnswer: "Several marking points" },
    { ...common, questionType: "LONG_ANSWER" as const, modelAnswer: "Detailed marking rubric" },
  ];
  for (const input of cases) assert.equal(validateBankQuestionInput(input).success, true, input.questionType);
});

test("rejects missing type-specific content and invalid marks", () => {
  const result = validateBankQuestionInput({
    subjectId: "subject-1",
    topicId: "topic-1",
    questionType: "MCQ",
    questionText: "Incomplete MCQ",
    difficulty: "easy",
    marks: 0,
  });
  assert.equal(result.success, false);
  if (!result.success) {
    assert.match(result.errors.join(" "), /Options A, B, C, and D/);
    assert.match(result.errors.join(" "), /positive whole number/);
  }
});

test("blocks the entire CSV preview when any row is invalid and warns about Importance", () => {
  const result = parseBankQuestionCsv(
    [
      "TopicID,QuestionType,Question,OptionA,OptionB,OptionC,OptionD,Answer,ModelAnswer,Explanation,Difficulty,Marks,Source,Importance",
      "topic-1,MCQ,Valid question,A,B,C,D,A,,,easy,1,Book,High",
      "topic-1,CASE_BASED,Unsupported question,,,,,,,,medium,4,Book,",
    ].join("\n"),
    "subject-1",
    [{ id: "topic-1", subjectId: "subject-1", name: "Chapter 1" }],
  );
  assert.equal(result.canImport, false);
  assert.match(result.rows[0].warnings[0], /unsupported/i);
  assert.match(result.rows[1].errors.join(" "), /Unsupported question type/i);
});

test("accepts ChapterID and quoted mixed-type CSV content", () => {
  const result = parseBankQuestionCsv(
    [
      "ChapterID,QuestionType,Question,OptionA,OptionB,OptionC,OptionD,Answer,ModelAnswer,Explanation,Difficulty,Marks,Source",
      'topic-1,TRUE/FALSE,"SQL is a query language, not a database.",,,,,TRUE,,,easy,1,Textbook',
      'topic-1,VSA,"Define a primary key.",,,,,,"A field that uniquely identifies a record.",,medium,2,Teacher',
    ].join("\n"),
    "subject-1",
    [{ id: "topic-1", subjectId: "subject-1", name: "Chapter 1" }],
  );
  assert.equal(result.canImport, true);
  assert.equal(result.rows[0].questionType, "TRUE_FALSE");
  assert.equal(result.rows[1].questionType, "VERY_SHORT_ANSWER");
});
