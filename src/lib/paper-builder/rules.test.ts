import assert from "node:assert/strict";
import test from "node:test";

import { calculatePatternMarks, normalizeQuestionText } from "./rules";
import type { PaperPatternRow } from "./types";

test("calculates mixed paper marks from question count multiplied by marks per question", () => {
  const rows: PaperPatternRow[] = [
    { id: "a", questionCount: 2, marksPerQuestion: 1, difficulty: "easy" },
    { id: "b", questionCount: 1, marksPerQuestion: 1, difficulty: "medium" },
    { id: "c", questionCount: 2, marksPerQuestion: 2, difficulty: "hard" },
    { id: "d", questionCount: 1, marksPerQuestion: 4, difficulty: "any" },
  ];

  assert.equal(calculatePatternMarks(rows), 11);
  assert.notEqual(calculatePatternMarks(rows), 15);
});
test("normalizes case, punctuation, and repeated whitespace for duplicate detection", () => {
  assert.equal(
    normalizeQuestionText("  Which SQL clause filters rows?  "),
    normalizeQuestionText("which sql clause filters rows"),
  );
});
