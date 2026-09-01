import assert from "node:assert/strict";
import test from "node:test";

import {
  readOptionSnapshot,
  validateAnswersAndBuildSnapshots,
  type SnapshotQuestion,
} from "./assignment-attempt-answer-snapshot-rules";

const question: SnapshotQuestion = {
  id: "question-1",
  questionText: "Which clause filters grouped rows?",
  optionA: "WHERE",
  optionB: "HAVING",
  optionC: "ORDER BY",
  optionD: "SELECT",
  correctAnswer: "B",
  explanation: "HAVING filters groups after GROUP BY.",
  topicTag: "Grouping data",
  difficulty: "medium",
  marks: 2,
};

test("builds immutable MCQ answer detail from server question data", () => {
  const result = validateAnswersAndBuildSnapshots({
    submittedAnswers: { "question-1": "a" },
    questions: [question],
    subjectId: "subject-1",
    topicId: "topic-1",
    topicName: "SQL",
  });

  assert.equal(result.success, true);
  if (!result.success) return;
  assert.deepEqual(result.answers, { "question-1": "A" });
  assert.deepEqual(result.snapshots[0], {
    questionId: "question-1",
    questionType: "MCQ",
    questionText: question.questionText,
    options: { A: "WHERE", B: "HAVING", C: "ORDER BY", D: "SELECT" },
    selectedOptionKey: "A",
    selectedOptionText: "WHERE",
    correctOptionKey: "B",
    correctOptionText: "HAVING",
    explanation: question.explanation,
    topicId: "topic-1",
    subjectId: "subject-1",
    topicLabel: "Grouping data",
    difficulty: "medium",
    isCorrect: false,
    marksAwarded: 0,
    maxMarks: 2,
  });
});

test("correct choice and explanation come from the server question, not submitted fields", () => {
  const result = validateAnswersAndBuildSnapshots({
    submittedAnswers: {
      "question-1": "B",
      correctAnswer: "A",
      explanation: "Client supplied",
    },
    questions: [question],
    subjectId: "subject-1",
    topicId: null,
    topicName: null,
  });

  assert.equal(result.success, false);
  if (result.success) return;
  assert.match(result.error, /outside this practice/i);
});

test("rejects invalid option keys", () => {
  const result = validateAnswersAndBuildSnapshots({
    submittedAnswers: { "question-1": "TRUE" },
    questions: [question],
    subjectId: "subject-1",
    topicId: null,
    topicName: null,
  });
  assert.deepEqual(result, {
    success: false,
    error: "Question question-1 has an invalid selected option.",
  });
});

test("uses topic name when a granular topic tag is unavailable", () => {
  const result = validateAnswersAndBuildSnapshots({
    submittedAnswers: { "question-1": "B" },
    questions: [{ ...question, topicTag: null }],
    subjectId: "subject-1",
    topicId: "topic-1",
    topicName: "SQL",
  });
  assert.equal(result.success, true);
  if (!result.success) return;
  assert.equal(result.snapshots[0].topicLabel, "SQL");
  assert.equal(result.snapshots[0].isCorrect, true);
  assert.equal(result.snapshots[0].marksAwarded, 2);
});

test("reads only complete A-D option snapshots", () => {
  assert.deepEqual(readOptionSnapshot({ A: "One", B: "Two", C: "Three", D: "Four" }), {
    A: "One",
    B: "Two",
    C: "Three",
    D: "Four",
  });
  assert.equal(readOptionSnapshot({ A: "One" }), null);
});
