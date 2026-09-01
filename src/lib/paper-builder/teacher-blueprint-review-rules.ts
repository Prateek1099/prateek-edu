import {
  filterBlueprintReplacementCandidates,
  uniqueBlueprintCandidates,
} from "./blueprint-rules";
import type { BlueprintRowDraft } from "./blueprint-types";
import { normalizeQuestionText } from "./rules";
import type { PaperBuilderQuestion } from "./types";

export const TEACHER_BLUEPRINT_REPLACEMENT_LIMIT = 10;

export function teacherBlueprintReplacementCandidates(
  questions: PaperBuilderQuestion[],
  subjectId: string,
  row: BlueprintRowDraft,
  selectedQuestions: PaperBuilderQuestion[],
  replaceQuestionId?: string,
) {
  const replacedQuestion = replaceQuestionId
    ? selectedQuestions.find((question) => question.id === replaceQuestionId)
    : null;
  const candidates = filterBlueprintReplacementCandidates(
    questions,
    subjectId,
    row,
    selectedQuestions,
    replaceQuestionId,
  );

  return candidates
    .filter(
      (question) =>
        !replacedQuestion || question.difficulty === replacedQuestion.difficulty,
    )
    .slice(0, TEACHER_BLUEPRINT_REPLACEMENT_LIMIT);
}

export function teacherBlueprintFreshRegenerationPool(
  questions: PaperBuilderQuestion[],
  subjectId: string,
  row: BlueprintRowDraft,
  currentPaperQuestions: PaperBuilderQuestion[],
) {
  const currentIds = new Set(currentPaperQuestions.map((question) => question.id));
  const currentText = new Set(
    currentPaperQuestions.map((question) => normalizeQuestionText(question.questionText)),
  );

  return uniqueBlueprintCandidates(questions, subjectId, row).filter((question) => {
    const normalized = normalizeQuestionText(question.questionText);
    return !currentIds.has(question.id) && !currentText.has(normalized);
  });
}
