import { validateBankQuestionInput } from "@/lib/bank-questions";
import { normalizeQuestionText } from "@/lib/paper-builder/rules";

import {
  REMEDIAL_DIFFICULTIES,
  type RemedialDifficulty,
  type RemedialDraftQuestion,
  type RemedialQuestionCandidate,
  type RemedialScopeInput,
} from "./types";

const allowedDifficulties = new Set<string>(REMEDIAL_DIFFICULTIES);

export function validateRemedialScopeInput(input: RemedialScopeInput): string | null {
  if (!input || typeof input !== "object") return "Choose a valid academic scope.";
  if (!input.boardId?.trim()) return "Choose a board.";
  if (!input.qualificationId?.trim()) return "Choose a qualification or class.";
  if (!input.subjectId?.trim()) return "Choose a subject.";
  if (!input.topicId?.trim()) return "Choose a relational syllabus topic.";
  if (input.dateRange !== "7" && input.dateRange !== "30") {
    return "Choose a supported Insights date range.";
  }
  return null;
}

export function validateRemedialRequest(
  input: RemedialScopeInput,
  difficulty: RemedialDifficulty,
  requestedCount: number,
): string | null {
  const scopeError = validateRemedialScopeInput(input);
  if (scopeError) return scopeError;
  if (!allowedDifficulties.has(difficulty)) return "Choose a valid difficulty.";
  if (!Number.isInteger(requestedCount) || requestedCount < 1 || requestedCount > 30) {
    return "Choose between 1 and 30 MCQs.";
  }
  return null;
}

export function isCompleteRemedialMcq(question: RemedialQuestionCandidate): boolean {
  if (
    question.workspaceId !== null ||
    question.questionType !== "MCQ" ||
    !question.topicId ||
    question.imageUrl !== null
  ) {
    return false;
  }

  return validateBankQuestionInput({
    subjectId: question.subjectId,
    topicId: question.topicId,
    questionType: "MCQ",
    questionText: question.questionText,
    optionA: question.optionA,
    optionB: question.optionB,
    optionC: question.optionC,
    optionD: question.optionD,
    correctAnswer: question.correctAnswer,
    modelAnswer: null,
    explanation: question.explanation,
    topicTag: question.topicTag,
    difficulty: question.difficulty,
    marks: question.marks,
  }).success;
}

export function uniqueEligibleRemedialQuestions(
  questions: RemedialQuestionCandidate[],
  scope: RemedialScopeInput,
  difficulty: RemedialDifficulty,
): RemedialQuestionCandidate[] {
  const seenIds = new Set<string>();
  const seenText = new Set<string>();

  return questions.filter((question) => {
    if (
      question.subjectId !== scope.subjectId ||
      question.topicId !== scope.topicId ||
      (difficulty !== "all" && question.difficulty !== difficulty) ||
      !isCompleteRemedialMcq(question) ||
      seenIds.has(question.id)
    ) {
      return false;
    }

    const normalized = normalizeQuestionText(question.questionText);
    if (!normalized || seenText.has(normalized)) return false;
    seenIds.add(question.id);
    seenText.add(normalized);
    return true;
  });
}

export function selectRemedialQuestions(
  questions: RemedialQuestionCandidate[],
  scope: RemedialScopeInput,
  difficulty: RemedialDifficulty,
  requestedCount: number,
  random: () => number = Math.random,
): { success: true; questions: RemedialQuestionCandidate[] } | { success: false; error: string } {
  const requestError = validateRemedialRequest(scope, difficulty, requestedCount);
  if (requestError) return { success: false, error: requestError };

  const eligible = uniqueEligibleRemedialQuestions(questions, scope, difficulty);
  if (eligible.length < requestedCount) {
    return {
      success: false,
      error: `Only ${eligible.length} unique valid MCQ${eligible.length === 1 ? " is" : "s are"} available; ${requestedCount} requested. No worksheet was created.`,
    };
  }

  const shuffled = [...eligible];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return { success: true, questions: shuffled.slice(0, requestedCount) };
}

export function toRemedialDraftQuestion(
  question: RemedialQuestionCandidate,
): RemedialDraftQuestion {
  if (!isCompleteRemedialMcq(question)) {
    throw new Error("A remedial draft can only contain complete global MCQs.");
  }

  return {
    id: question.id,
    sourceUpdatedAt: question.updatedAt,
    questionText: question.questionText.trim(),
    optionA: question.optionA!.trim(),
    optionB: question.optionB!.trim(),
    optionC: question.optionC!.trim(),
    optionD: question.optionD!.trim(),
    correctAnswer: question.correctAnswer!.trim().toUpperCase(),
    explanation: question.explanation?.trim() || null,
    topicTag: question.topicTag?.trim() || null,
    difficulty: question.difficulty,
    marks: question.marks,
  };
}

export function findRemedialSelectionError(
  questions: RemedialQuestionCandidate[],
  scope: RemedialScopeInput,
  difficulty: RemedialDifficulty,
  selectedIds: string[],
): string | null {
  if (selectedIds.length === 0 || selectedIds.length > 30) {
    return "A remedial worksheet needs between 1 and 30 questions.";
  }
  if (new Set(selectedIds).size !== selectedIds.length) {
    return "Duplicate Question Bank IDs are not allowed.";
  }

  const eligible = uniqueEligibleRemedialQuestions(questions, scope, difficulty);
  if (eligible.length !== selectedIds.length) {
    return "One or more questions are missing, duplicated by text, or no longer match this scope.";
  }
  return null;
}
