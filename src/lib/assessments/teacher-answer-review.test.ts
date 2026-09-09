import assert from "node:assert/strict";
import { test } from "node:test";

import type { BankQuestionType } from "@prisma/client";

import { buildTeacherQuestionReview } from "./teacher-review";

const options = { A: "Alpha", B: "Beta", C: "Gamma", D: "Delta" };
const question = (
  id: string,
  questionNumber: number,
  questionType: BankQuestionType,
  marks: number,
  correctAnswer: string,
) => ({
  id,
  sectionLabel: questionNumber < 3 ? "Section A" : "Section B",
  questionNumber,
  questionType,
  questionText: `Question ${questionNumber}`,
  options: questionType === "TRUE_FALSE" ? {} : options,
  marks,
  correctAnswer,
  explanation: `Explanation ${questionNumber}`,
});

const questions = [
  question("mcq", 1, "MCQ", 1, "A"),
  question("tf", 2, "TRUE_FALSE", 2, "TRUE"),
  question("ar", 3, "ASSERTION_REASON", 4, "B"),
];
const responses = [
  { questionId: "mcq", versionId: "version", state: "ANSWERED", value: { kind: "choice", value: "A" } },
  { questionId: "tf", versionId: "version", state: "ANSWERED", value: { kind: "boolean", value: false } },
  { questionId: "ar", versionId: "version", state: "UNANSWERED", value: null },
];

const build = (overrides: Partial<Parameters<typeof buildTeacherQuestionReview>[0]> = {}) => buildTeacherQuestionReview({
  versionId: "version",
  totalMarks: 7,
  awardedMarks: 1,
  questions,
  responses,
  ...overrides,
});

test("Teacher detailed answer review derives safe objective evidence", async (t) => {
  await t.test("preserves immutable paper question order", () => {
    assert.deepEqual(build({ questions: [...questions].reverse() }).map((item) => item.number), [1, 2, 3]);
  });

  await t.test("shows a correct MCQ response and weighted marks", () => {
    const item = build()[0];
    assert.equal(item.status, "CORRECT");
    assert.equal(item.studentAnswer, "A. Alpha");
    assert.equal(item.correctAnswer, "A. Alpha");
    assert.equal(item.marksAwarded, 1);
  });

  await t.test("shows an incorrect True/False response without hiding the key", () => {
    const item = build()[1];
    assert.equal(item.status, "INCORRECT");
    assert.equal(item.studentAnswer, "False");
    assert.equal(item.correctAnswer, "True");
    assert.equal(item.marksAwarded, 0);
  });

  await t.test("shows unanswered Assertion & Reasoning distinctly", () => {
    const item = build()[2];
    assert.equal(item.status, "UNANSWERED");
    assert.equal(item.studentAnswer, null);
    assert.equal(item.correctAnswer, "B. Beta");
    assert.equal(item.marksAwarded, 0);
  });

  await t.test("includes immutable explanations and section labels", () => {
    assert.deepEqual(build().map((item) => [item.sectionLabel, item.explanation]), [
      ["Section A", "Explanation 1"],
      ["Section A", "Explanation 2"],
      ["Section B", "Explanation 3"],
    ]);
  });

  await t.test("keeps all four immutable choice options", () => {
    assert.deepEqual(build()[0].options.map((item) => item.key), ["A", "B", "C", "D"]);
  });

  await t.test("does not emit live Question Bank provenance", () => {
    const serialized = JSON.stringify(build());
    assert.equal(serialized.includes("sourceQuestionId"), false);
    assert.equal(serialized.includes("originalBankQuestionId"), false);
    assert.equal(serialized.includes("BankQuestion"), false);
  });

  await t.test("rejects a stored total that disagrees with immutable evidence", () => {
    assert.throws(() => build({ awardedMarks: 2 }), { code: "LOCKED" });
  });

  await t.test("rejects missing response evidence", () => {
    assert.throws(() => build({ responses: responses.slice(0, 2) }), { code: "INVALID_SOURCE" });
  });

  await t.test("rejects cross-version response evidence", () => {
    assert.throws(() => build({ responses: responses.map((item, index) => index === 0 ? { ...item, versionId: "other" } : item) }), { code: "INVALID_SOURCE" });
  });

  await t.test("rejects an unanswered state that carries hidden response data", () => {
    assert.throws(() => build({ responses: responses.map((item, index) => index === 2 ? { ...item, value: { kind: "choice", value: "B" } } : item) }), { code: "INVALID_SOURCE" });
  });

  await t.test("rejects unsupported subjective question types", () => {
    assert.throws(() => build({
      questions: [question("written", 1, "SHORT_ANSWER", 7, "answer")],
      responses: [{ questionId: "written", versionId: "version", state: "UNANSWERED", value: null }],
    }), { code: "INVALID_SOURCE" });
  });

  await t.test("rejects incomplete immutable choice options", () => {
    assert.throws(() => build({ questions: [{ ...questions[0], options: { A: "Alpha" } }, questions[1], questions[2]] }), { code: "INVALID_SOURCE" });
  });
});
