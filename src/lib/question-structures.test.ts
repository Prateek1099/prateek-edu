import assert from "node:assert/strict";
import { test } from "node:test";
import { BANK_QUESTION_TYPES, normalizeBankQuestionType } from "./bank-questions";
import { OBJECTIVE_ASSESSMENT_TYPES } from "./assessments/rules";
import { PAPER_QUESTION_TYPES } from "./paper-builder/types";
import {
  B1_FILL_NORMALIZATION, assertOneFillBlank, copyFillSavedStructureToAssessment, copyMatchSavedStructureToAssessment,
  freezeMatchForSavedPaper, normalizeFillAnswer, parseFillGradingData,
  parseMatchContent, parseMatchGradingData, parseMatchingResponse,
  resolveFillForNewSnapshot,
} from "./question-structures";

const fill = (acceptedAnswers: string[]) => ({
  version: 1, type: "FILL_BLANK", acceptedAnswers,
  normalization: { ...B1_FILL_NORMALIZATION },
});
const content = {
  version: 1, type: "MATCH_THE_FOLLOWING",
  leftItems: [{ id: "L1", text: "HTML" }, { id: "L2", text: "CSS" }],
  rightItems: [{ id: "R1", text: "Styling" }, { id: "R2", text: "Structure" }],
};
const grading = {
  version: 1, type: "MATCH_THE_FOLLOWING", scoring: "PER_PAIR_INTEGER",
  correctPairs: [{ leftId: "L1", rightId: "R2" }, { leftId: "L2", rightId: "R1" }],
};
const valid = (candidate: unknown, marks = 4) =>
  parseMatchGradingData(candidate, parseMatchContent(content, "bank"), marks);

test("B1-B exposes Match for authoring and paper output but not objective assessments", () => {
  assert.equal(BANK_QUESTION_TYPES.includes("MATCH_THE_FOLLOWING"), true);
  assert.equal(PAPER_QUESTION_TYPES.includes("MATCH_THE_FOLLOWING"), true);
  assert.equal(OBJECTIVE_ASSESSMENT_TYPES.includes("MATCH_THE_FOLLOWING" as never), false);
  assert.equal(normalizeBankQuestionType("MATCH_THE_FOLLOWING"), "MATCH_THE_FOLLOWING");
});

test("Fill normalization has fixed NFKC/trim/collapse/case order and exact punctuation", () => {
  assert.equal(normalizeFillAnswer("  ＣＰＵ  \t Core  "), "cpu core");
  assert.notEqual(normalizeFillAnswer("CPU."), normalizeFillAnswer("CPU"));
  assert.notEqual(normalizeFillAnswer("café"), normalizeFillAnswer("cafe"));
});
test("Fill canonical answer and aliases validate", () => {
  assert.deepEqual(parseFillGradingData(fill(["CPU"]), "CPU").acceptedAnswers, ["CPU"]);
  assert.deepEqual(parseFillGradingData(fill(["CPU", "Central Processing Unit"]), "CPU").acceptedAnswers.length, 2);
});
test("Fill aliases reject normalized duplicates and malformed values", () => {
  for (const bad of [fill(["CPU", " ｃｐｕ "]), fill([""]), fill(Array.from({ length: 21 }, (_, i) => `A${i}`)),
    fill(["x".repeat(1001)]), { ...fill(["CPU"]), type: "MCQ" }, { ...fill(["CPU"]), version: 2 },
    { ...fill(["CPU"]), extra: true }, { ...fill(["CPU"]), normalization: { ...B1_FILL_NORMALIZATION, punctuation: "STRIP" } }]) {
    assert.throws(() => parseFillGradingData(bad, "CPU"));
  }
  assert.throws(() => parseFillGradingData(fill(["CPU"]), "cpu"));
});
test("Fill legacy adapter freezes resolved data without changing source", () => {
  const source = { questionText: "The ____ processes data.", correctAnswer: "CPU", gradingData: null };
  const before = structuredClone(source);
  assert.deepEqual(resolveFillForNewSnapshot(source), fill(["CPU"]));
  assert.deepEqual(copyFillSavedStructureToAssessment(source), { structuredContent: null, gradingData: fill(["CPU"]) });
  assert.deepEqual(source, before);
  assert.throws(() => parseFillGradingData(null, "CPU"));
  assert.throws(() => resolveFillForNewSnapshot({ ...source, correctAnswer: null }));
});
test("Fill requires exactly one legacy-compatible blank marker", () => {
  assert.doesNotThrow(() => assertOneFillBlank("One ____ blank"));
  assert.doesNotThrow(() => assertOneFillBlank("One ... blank"));
  assert.throws(() => assertOneFillBlank("No blank"));
  assert.throws(() => assertOneFillBlank("Two ____ and ... blanks"));
});
test("Match accepts canonical bank content and rejects display order there", () => {
  assert.equal(parseMatchContent(content, "bank").leftItems.length, 2);
  assert.throws(() => parseMatchContent({ ...content, rightDisplayOrder: ["R1", "R2"] }, "bank"));
});
test("Match enforces pair bounds, equal sides, stable IDs and unique text", () => {
  assert.throws(() => parseMatchContent({ ...content, leftItems: [content.leftItems[0]], rightItems: [content.rightItems[0]] }, "bank"));
  const thirteen = Array.from({ length: 13 }, (_, i) => ({ id: `L${i}`, text: `Left ${i}` }));
  assert.throws(() => parseMatchContent({ ...content, leftItems: thirteen, rightItems: thirteen.map((x, i) => ({ ...x, id: `R${i}` })) }, "bank"));
  assert.throws(() => parseMatchContent({ ...content, rightItems: [content.rightItems[0]] }, "bank"));
  assert.throws(() => parseMatchContent({ ...content, leftItems: [content.leftItems[0], content.leftItems[0]] }, "bank"));
  assert.throws(() => parseMatchContent({ ...content, rightItems: [{ id: "R1", text: "Styling" }, { id: "R2", text: " ｓｔｙｌｉｎｇ " }] }, "bank"));
  assert.throws(() => parseMatchContent({ ...content, leftItems: [{ id: "R1", text: "HTML" }, content.leftItems[1]] }, "bank"));
});
test("Match grading requires bijection, known IDs and divisible whole marks", () => {
  assert.equal(valid(grading).correctPairs.length, 2);
  for (const pairs of [
    grading.correctPairs.slice(0, 1),
    [{ leftId: "L1", rightId: "R1" }, { leftId: "L2", rightId: "R1" }],
    [{ leftId: "L1", rightId: "R2" }, { leftId: "L1", rightId: "R1" }],
    [{ leftId: "L1", rightId: "R9" }, { leftId: "L2", rightId: "R1" }],
  ]) assert.throws(() => valid({ ...grading, correctPairs: pairs }));
  assert.throws(() => valid(grading, 3));
  assert.throws(() => valid({ ...grading, scoring: "FLOAT" }));
});
test("Match snapshot order is an exact right-ID permutation", () => {
  const base = { ...content, rightDisplayOrder: ["R2", "R1"] };
  assert.deepEqual(parseMatchContent(base, "snapshot").rightDisplayOrder, ["R2", "R1"]);
  for (const order of [["R1"], ["R1", "R1"], ["R1", "R9"]]) {
    assert.throws(() => parseMatchContent({ ...base, rightDisplayOrder: order }, "snapshot"));
  }
});
test("Match freeze uses visible content only and permits both two-pair permutations", () => {
  // Fisher-Yates can keep or swap the two right IDs regardless of the answer key.
  const identity = freezeMatchForSavedPaper(content, () => 1);
  const swapped = freezeMatchForSavedPaper(content, () => 0);
  assert.deepEqual(identity.rightDisplayOrder, ["R1", "R2"]);
  assert.deepEqual(swapped.rightDisplayOrder, ["R2", "R1"]);
  for (const frozen of [identity, swapped]) {
    assert.equal(frozen.rightDisplayOrder.length, content.rightItems.length);
    assert.deepEqual(new Set(frozen.rightDisplayOrder), new Set(["R1", "R2"]));
  }
  assert.equal(freezeMatchForSavedPaper.length, 2, "The shuffle API accepts content and randomness, not grading evidence");
  assert.throws(() => freezeMatchForSavedPaper(content, () => 9));
});
test("Match freeze keeps a complete three-pair order and assessment copy preserves it", () => {
  const threePairContent = {
    ...content,
    leftItems: [...content.leftItems, { id: "L3", text: "JavaScript" }],
    rightItems: [...content.rightItems, { id: "R3", text: "Behavior" }],
  };
  const frozen = freezeMatchForSavedPaper(threePairContent, () => 0);
  assert.equal(frozen.rightDisplayOrder.length, 3);
  assert.deepEqual(new Set(frozen.rightDisplayOrder), new Set(["R1", "R2", "R3"]));
  const threePairGrading = {
    ...grading,
    correctPairs: [...grading.correctPairs, { leftId: "L3", rightId: "R3" }],
  };
  const copied = copyMatchSavedStructureToAssessment(frozen, threePairGrading, 6);
  assert.deepEqual(copied.structuredContent, frozen);
  assert.deepEqual(copied.gradingData, threePairGrading);
});
test("Match response uses snapshot-visible IDs, permits partial, rejects forgery", () => {
  const snapshot = { ...content, rightDisplayOrder: ["R2", "R1"] };
  assert.equal(parseMatchingResponse(null, snapshot), null);
  assert.equal(parseMatchingResponse({ kind: "matching", value: [] }, snapshot), null);
  assert.deepEqual(parseMatchingResponse({ kind: "matching", value: [{ leftId: "L1", rightId: "R1" }] }, snapshot)?.value.length, 1);
  for (const bad of [
    { kind: "matching", value: [{ leftId: "L9", rightId: "R1" }] },
    { kind: "matching", value: [{ leftId: "L1", rightId: "R9" }] },
    { kind: "matching", value: [{ leftId: "L1", rightId: "R1" }, { leftId: "L1", rightId: "R2" }] },
    { kind: "matching", value: [{ leftId: "L1", rightId: "R1" }, { leftId: "L2", rightId: "R1" }] },
    { kind: "matching", value: [{ leftId: 1, rightId: "R1" }] },
    { kind: "matching", value: [{ leftId: "L1", rightId: "R1", extra: true }] },
    { kind: "matching", value: "L1:R1" },
    { kind: "matching", value: [{ leftId: "L1", rightId: "R1" }], extra: true },
  ]) assert.throws(() => parseMatchingResponse(bad, snapshot));
});
