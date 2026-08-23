import assert from "node:assert/strict";
import test from "node:test";

import {
  findRemedialSelectionError,
  isCompleteRemedialMcq,
  selectRemedialQuestions,
  toRemedialDraftQuestion,
  uniqueEligibleRemedialQuestions,
  validateRemedialRequest,
  validateRemedialScopeInput,
} from "./rules";
import type { RemedialQuestionCandidate, RemedialScopeInput } from "./types";

const scope: RemedialScopeInput = {
  boardId: "board-1",
  qualificationId: "qualification-1",
  subjectId: "subject-1",
  topicId: "topic-1",
  dateRange: "7",
};

function question(
  id: string,
  overrides: Partial<RemedialQuestionCandidate> = {},
): RemedialQuestionCandidate {
  return {
    id,
    updatedAt: "2026-08-23T00:00:00.000Z",
    subjectId: "subject-1",
    topicId: "topic-1",
    workspaceId: null,
    questionType: "MCQ",
    questionText: `Question ${id}`,
    optionA: "A",
    optionB: "B",
    optionC: "C",
    optionD: "D",
    correctAnswer: "A",
    explanation: "Explanation",
    imageUrl: null,
    topicTag: "SQL",
    difficulty: "medium",
    marks: 1,
    ...overrides,
  };
}

test("requires a complete relational academic scope", () => {
  assert.equal(validateRemedialScopeInput(scope), null);
  assert.match(validateRemedialScopeInput({ ...scope, topicId: "" }) ?? "", /relational syllabus topic/i);
  assert.match(validateRemedialScopeInput({ ...scope, subjectId: "" }) ?? "", /subject/i);
});

test("accepts only supported difficulty and whole-number MCQ counts", () => {
  assert.equal(validateRemedialRequest(scope, "all", 5), null);
  assert.match(validateRemedialRequest(scope, "all", 0) ?? "", /between 1 and 30/i);
  assert.match(validateRemedialRequest(scope, "all", 2.5) ?? "", /between 1 and 30/i);
});

test("complete remedial questions must be global image-free MCQs", () => {
  assert.equal(isCompleteRemedialMcq(question("valid")), true);
  assert.equal(isCompleteRemedialMcq(question("workspace", { workspaceId: "workspace-1" })), false);
  assert.equal(isCompleteRemedialMcq(question("written", { questionType: "SHORT_ANSWER" })), false);
  assert.equal(isCompleteRemedialMcq(question("image", { imageUrl: "https://blob.example/image.png" })), false);
});

test("incomplete MCQs are excluded", () => {
  assert.equal(isCompleteRemedialMcq(question("missing-option", { optionD: null })), false);
  assert.equal(isCompleteRemedialMcq(question("bad-answer", { correctAnswer: "TRUE" })), false);
  assert.equal(isCompleteRemedialMcq(question("bad-marks", { marks: 0 })), false);
});

test("eligibility enforces exact subject and topic relations", () => {
  const eligible = uniqueEligibleRemedialQuestions([
    question("valid"),
    question("wrong-subject", { subjectId: "subject-2" }),
    question("wrong-topic", { topicId: "topic-2" }),
  ], scope, "all");
  assert.deepEqual(eligible.map((item) => item.id), ["valid"]);
});

test("difficulty filters are exact", () => {
  const questions = [
    question("easy", { difficulty: "easy" }),
    question("medium", { difficulty: "medium" }),
    question("hard", { difficulty: "hard" }),
  ];
  assert.equal(uniqueEligibleRemedialQuestions(questions, scope, "all").length, 3);
  assert.deepEqual(
    uniqueEligibleRemedialQuestions(questions, scope, "hard").map((item) => item.id),
    ["hard"],
  );
});

test("duplicate BankQuestion IDs are removed", () => {
  const duplicate = question("same", { questionText: "A different question" });
  assert.equal(uniqueEligibleRemedialQuestions([question("same"), duplicate], scope, "all").length, 1);
});

test("normalized duplicate question text is removed", () => {
  const questions = [
    question("one", { questionText: "Which SQL clause filters rows?" }),
    question("two", { questionText: " which sql clause filters rows " }),
  ];
  assert.equal(uniqueEligibleRemedialQuestions(questions, scope, "all").length, 1);
});

test("insufficient availability blocks generation without a partial selection", () => {
  const result = selectRemedialQuestions([question("one")], scope, "all", 2, () => 0.5);
  assert.equal(result.success, false);
  if (!result.success) assert.match(result.error, /No worksheet was created/i);
});

test("selection returns the exact requested count with unique records", () => {
  const result = selectRemedialQuestions(
    [question("one"), question("two"), question("three")],
    scope,
    "all",
    2,
    () => 0.25,
  );
  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.questions.length, 2);
    assert.equal(new Set(result.questions.map((item) => item.id)).size, 2);
  }
});

test("draft mapping preserves the MCQ answer, explanation, and source version", () => {
  const mapped = toRemedialDraftQuestion(question("mapped", { correctAnswer: "b" }));
  assert.equal(mapped.correctAnswer, "B");
  assert.equal(mapped.explanation, "Explanation");
  assert.equal(mapped.sourceUpdatedAt, "2026-08-23T00:00:00.000Z");
});

test("saved selections reject duplicate IDs and normalized duplicate text", () => {
  assert.match(
    findRemedialSelectionError([question("same")], scope, "all", ["same", "same"]) ?? "",
    /Duplicate Question Bank IDs/i,
  );
  const duplicatedText = [
    question("one", { questionText: "Define a query" }),
    question("two", { questionText: "define a query" }),
  ];
  assert.match(
    findRemedialSelectionError(duplicatedText, scope, "all", ["one", "two"]) ?? "",
    /duplicated by text/i,
  );
});
