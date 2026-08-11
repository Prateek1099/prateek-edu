import type {
  PaperBuilderQuestion,
  PaperPatternRow,
} from "./types";
import { validateBankQuestionInput } from "@/lib/bank-questions";

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

export function isCompletePaperQuestion(question: PaperBuilderQuestion) {
  return validateBankQuestionInput({
    subjectId: question.subjectId,
    topicId: question.topicId,
    questionType: question.questionType,
    questionText: question.questionText,
    optionA: question.optionA,
    optionB: question.optionB,
    optionC: question.optionC,
    optionD: question.optionD,
    correctAnswer: question.correctAnswer,
    modelAnswer: question.modelAnswer,
    explanation: question.explanation,
    topicTag: question.topicTag,
    difficulty: question.difficulty,
    marks: question.marks,
  }).success;
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
    question.questionType === pattern.questionType &&
    question.marks === pattern.marksPerQuestion &&
    (pattern.difficulty === "any" || question.difficulty === pattern.difficulty) &&
    isCompletePaperQuestion(question)
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
