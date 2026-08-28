import assert from "node:assert/strict";
import test from "node:test";

import {
  extractRemedialWrongAnswerEvidence,
  rankRemedialWeakTopics,
  suggestRemedialQuestionIds,
  uniqueRemedialCandidates,
  validateRemedialSelection,
} from "./rules";
import type { RemedialPracticeCandidate } from "./types";

const questions = [
  { id: "q1", bankQuestionId: "b1", topicId: "sql", correctAnswer: "A" },
  { id: "q2", bankQuestionId: "b2", topicId: "pandas", correctAnswer: "B" },
  { id: "q3", bankQuestionId: null, topicId: null, correctAnswer: "C" },
];

test("wrong-answer evidence uses only exact recipients and post-assignment attempts", () => {
  const evidence = extractRemedialWrongAnswerEvidence({
    questions,
    recipients: [
      { studentId: "student-1", assignedAt: "2026-08-20T00:00:00.000Z" },
      { studentId: "student-2", assignedAt: "2026-08-21T00:00:00.000Z" },
    ],
    attempts: [
      {
        userId: "student-1",
        completedAt: "2026-08-19T00:00:00.000Z",
        answers: JSON.stringify({ q1: "B" }),
      },
      {
        userId: "student-1",
        completedAt: "2026-08-22T00:00:00.000Z",
        answers: JSON.stringify({ q1: "B", q2: "B", q3: "A" }),
      },
      {
        userId: "not-a-recipient",
        completedAt: "2026-08-22T00:00:00.000Z",
        answers: JSON.stringify({ q1: "B" }),
      },
    ],
  });

  assert.equal(evidence.topicMistakes.get("sql"), 1);
  assert.equal(evidence.topicMistakes.has("pandas"), false);
  assert.equal(evidence.studentMistakes.get("student-1"), 1);
  assert.deepEqual([...evidence.topicStudents.get("sql") ?? []], ["student-1"]);
});

test("malformed, blank, correct, and topicless answers do not become weakness evidence", () => {
  const evidence = extractRemedialWrongAnswerEvidence({
    questions,
    recipients: [{ studentId: "student-1", assignedAt: "2026-08-20T00:00:00.000Z" }],
    attempts: [
      { userId: "student-1", completedAt: "2026-08-22T00:00:00.000Z", answers: "invalid" },
      {
        userId: "student-1",
        completedAt: "2026-08-22T00:00:00.000Z",
        answers: JSON.stringify({ q1: "A", q2: "", q3: "A" }),
      },
    ],
  });

  assert.equal(evidence.topicMistakes.size, 0);
  assert.equal(evidence.studentMistakes.size, 0);
});

test("weak topics rank by mistakes, affected students, then name", () => {
  const evidence = extractRemedialWrongAnswerEvidence({
    questions,
    recipients: [
      { studentId: "student-1", assignedAt: "2026-08-20T00:00:00.000Z" },
      { studentId: "student-2", assignedAt: "2026-08-20T00:00:00.000Z" },
    ],
    attempts: [
      { userId: "student-1", completedAt: "2026-08-22T00:00:00.000Z", answers: JSON.stringify({ q1: "D", q2: "A" }) },
      { userId: "student-2", completedAt: "2026-08-22T00:00:00.000Z", answers: JSON.stringify({ q1: "D" }) },
    ],
  });
  const ranked = rankRemedialWeakTopics(new Map([["sql", "SQL"], ["pandas", "Pandas"]]), evidence);

  assert.deepEqual(ranked.map((topic) => [topic.id, topic.mistakeCount, topic.affectedStudentCount]), [
    ["sql", 2, 2],
    ["pandas", 1, 1],
  ]);
});

function candidate(
  id: string,
  topicId: string,
  questionText: string,
  usedInSourceAssignment = false,
): RemedialPracticeCandidate {
  return {
    id,
    topicId,
    topicName: topicId === "sql" ? "SQL" : "Pandas",
    questionText,
    optionA: "A",
    optionB: "B",
    optionC: "C",
    optionD: "D",
    difficulty: "medium",
    marks: 1,
    usedInSourceAssignment,
  };
}

test("candidate normalization rejects duplicate IDs, duplicate text, and incomplete MCQs", () => {
  const unique = uniqueRemedialCandidates([
    candidate("one", "sql", "What is SQL?"),
    candidate("one", "sql", "A different question"),
    candidate("two", "sql", "  what   is SQL ? "),
    { ...candidate("three", "sql", "Incomplete"), optionD: "" },
    candidate("four", "pandas", "What is a Series?"),
  ]);

  assert.deepEqual(unique.map((question) => question.id), ["one", "four"]);
});

test("suggestions prefer fresh questions and distribute across ranked weak topics", () => {
  const candidates = [
    candidate("source-sql", "sql", "Source SQL", true),
    candidate("fresh-sql-1", "sql", "Fresh SQL 1"),
    candidate("fresh-sql-2", "sql", "Fresh SQL 2"),
    candidate("fresh-pandas", "pandas", "Fresh Pandas"),
  ];
  const selected = suggestRemedialQuestionIds({
    candidates,
    weakTopics: [
      { id: "sql", name: "SQL", mistakeCount: 3, affectedStudentCount: 2 },
      { id: "pandas", name: "Pandas", mistakeCount: 1, affectedStudentCount: 1 },
    ],
    requestedCount: 3,
  });

  assert.deepEqual(selected, ["fresh-sql-1", "fresh-pandas", "fresh-sql-2"]);
  assert.equal(selected.includes("source-sql"), false);
});

test("source questions remain available as explicit fallback", () => {
  const selected = suggestRemedialQuestionIds({
    candidates: [
      candidate("fresh", "sql", "Fresh SQL"),
      candidate("source", "sql", "Source SQL", true),
    ],
    weakTopics: [{ id: "sql", name: "SQL", mistakeCount: 1, affectedStudentCount: 1 }],
    requestedCount: 2,
  });

  assert.deepEqual(selected, ["fresh", "source"]);
});

test("selection rejects count, duplicate IDs, stale IDs, and duplicate normalized text", () => {
  const candidates = [
    candidate("one", "sql", "Question one"),
    candidate("two", "sql", "Question two"),
    candidate("same-a", "sql", "Same question?"),
    candidate("same-b", "sql", " same  question ? "),
  ];

  assert.match(validateRemedialSelection(candidates, []) ?? "", /between 1 and 10/);
  assert.match(validateRemedialSelection(candidates, ["one", "one"]) ?? "", /same Question Bank/);
  assert.match(validateRemedialSelection(candidates, ["missing"]) ?? "", /stale or outside/);
  assert.match(validateRemedialSelection(candidates, ["same-a", "same-b"]) ?? "", /unique normalized/);
  assert.equal(validateRemedialSelection(candidates, ["one", "two"]), null);
});
