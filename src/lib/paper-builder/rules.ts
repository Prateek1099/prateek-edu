import type {
  PaperBuilderQuestion,
  PaperPatternRow,
} from "./types";

const VALID_ANSWERS = new Set(["A", "B", "C", "D"]);

export function normalizeQuestionText(value: string) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

export function calculatePatternMarks(patterns: PaperPatternRow[]) {
  return patterns.reduce(
    (total, row) => total + row.questionCount * row.marksPerQuestion,
    0,
  );
}

export function isCompleteMcq(question: PaperBuilderQuestion) {
  return (
    Boolean(question.questionText.trim()) &&
    Boolean(question.optionA.trim()) &&
    Boolean(question.optionB.trim()) &&
    Boolean(question.optionC.trim()) &&
    Boolean(question.optionD.trim()) &&
    VALID_ANSWERS.has(question.correctAnswer.trim().toUpperCase()) &&
    Number.isInteger(question.marks) &&
    question.marks > 0
  );
}

export function questionMatchesPattern(
  question: PaperBuilderQuestion,
  subjectId: string,
  topicIds: string[],
  pattern: PaperPatternRow,
) {
  return (
    question.subjectId === subjectId &&
    Boolean(question.topicId) &&
    topicIds.includes(question.topicId as string) &&
    question.marks === pattern.marksPerQuestion &&
    (pattern.difficulty === "any" || question.difficulty === pattern.difficulty) &&
    isCompleteMcq(question)
  );
}

export function uniqueEligibleQuestions(
  questions: PaperBuilderQuestion[],
  subjectId: string,
  topicIds: string[],
  pattern: PaperPatternRow,
) {
  const seenText = new Set<string>();

  return questions.filter((question) => {
    if (!questionMatchesPattern(question, subjectId, topicIds, pattern)) return false;
    const normalized = normalizeQuestionText(question.questionText);
    if (!normalized || seenText.has(normalized)) return false;
    seenText.add(normalized);
    return true;
  });
}

export function findDuplicateSelection(questions: PaperBuilderQuestion[]) {
  const ids = new Set<string>();
  const texts = new Set<string>();

  for (const question of questions) {
    if (ids.has(question.id)) return "The same Question Bank record was selected more than once.";
    ids.add(question.id);

    const normalized = normalizeQuestionText(question.questionText);
    if (!normalized) return "A selected question has no usable question text.";
    if (texts.has(normalized)) {
      return "Two selected questions have duplicate normalized question text.";
    }
    texts.add(normalized);
  }

  return null;
}

export function shuffled<T>(items: T[]) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}
