import assert from "node:assert/strict";
import test from "node:test";

import { freezeQuestionStructureForSavedPaper, matchAnswerRows, matchDisplayContent, visibleMatchRows } from "./structured-output";

const content = {
  version: 1,
  type: "MATCH_THE_FOLLOWING",
  leftItems: [{ id: "Lhtml", text: "HTML" }, { id: "Lcss", text: "CSS" }],
  rightItems: [{ id: "Rhtml", text: "Structure" }, { id: "Rcss", text: "Styling" }],
};

test("Match display order is a complete frozen permutation", () => {
  const frozen = matchDisplayContent(content, () => 0);
  assert.deepEqual(frozen.rightDisplayOrder, ["Rcss", "Rhtml"]);
  assert.deepEqual(matchDisplayContent(frozen).rightDisplayOrder, frozen.rightDisplayOrder);
  assert.deepEqual(new Set(frozen.rightDisplayOrder), new Set(["Rhtml", "Rcss"]));
});

test("visible Match labels and answer key use frozen right-side numbering", () => {
  const frozen = matchDisplayContent(content, () => 0);
  const question = {
    marks: 2,
    structuredContent: frozen,
    gradingData: {
      version: 1,
      type: "MATCH_THE_FOLLOWING",
      correctPairs: [{ leftId: "Lhtml", rightId: "Rhtml" }, { leftId: "Lcss", rightId: "Rcss" }],
      scoring: "PER_PAIR_INTEGER",
    },
  };
  assert.deepEqual(visibleMatchRows(frozen).right.map((item) => item.text), ["Styling", "Structure"]);
  assert.deepEqual(matchAnswerRows(question), [
    { leftLabel: "A", rightLabel: "2", rightText: "Structure" },
    { leftLabel: "B", rightLabel: "1", rightText: "Styling" },
  ]);
});

test("bank preview order is independent of the correct-pair mapping", () => {
  const first = matchDisplayContent(content);
  const second = matchDisplayContent(content);
  assert.deepEqual(first.rightDisplayOrder, second.rightDisplayOrder);
});

test("Fill and Match saved structures remain immutable after source edits", () => {
  const fill = freezeQuestionStructureForSavedPaper({ questionType: "FILL_BLANK", questionText: "CPU means ______.", correctAnswer: "Central Processing Unit", gradingData: null, structuredContent: null, marks: 1 }, () => 0);
  const match = freezeQuestionStructureForSavedPaper({ questionType: "MATCH_THE_FOLLOWING", questionText: "Match.", correctAnswer: null, structuredContent: content, gradingData: { version: 1, type: "MATCH_THE_FOLLOWING", correctPairs: [{ leftId: "Lhtml", rightId: "Rhtml" }, { leftId: "Lcss", rightId: "Rcss" }], scoring: "PER_PAIR_INTEGER" }, marks: 2 }, () => 0);
  content.leftItems[0].text = "Edited source";
  assert.deepEqual((fill.gradingData as { acceptedAnswers: string[] }).acceptedAnswers, ["Central Processing Unit"]);
  assert.equal((match.structuredContent as { leftItems: Array<{ text: string }> }).leftItems[0].text, "HTML");
});
