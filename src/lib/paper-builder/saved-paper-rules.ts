import type { BankQuestionTypeValue } from "@/lib/bank-questions";

import {
  applyFinalQuestionOrder,
  FINAL_PAPER_ORDER_MODES,
  type FinalPaperOrderMode,
} from "./final-paper-order";
import type { PaperBuilderQuestion, PaperDetails, ValidatedPaper } from "./types";

export const SAVED_PAPER_SNAPSHOT_VERSION = 1;

export function cleanSavedPaperText(value: unknown, maximum: number) {
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}

export function validateSavedPaperMetadata(name: unknown, description: unknown) {
  const cleanName = cleanSavedPaperText(name, 200);
  const cleanDescription = cleanSavedPaperText(description, 3_000);
  if (!cleanName) return { success: false as const, error: "Enter a name for the saved paper." };
  return { success: true as const, name: cleanName, description: cleanDescription || null };
}

export function validateAndApplyFinalOrder(
  paper: ValidatedPaper,
  mode: FinalPaperOrderMode,
  orderedQuestionIds: string[],
) {
  if (!FINAL_PAPER_ORDER_MODES.includes(mode)) {
    return { success: false as const, error: "Choose a valid final paper order." };
  }
  const canonicalIds = paper.sections.flatMap((section) => section.questions.map((question) => question.id));
  if (!Array.isArray(orderedQuestionIds) || orderedQuestionIds.length !== canonicalIds.length) {
    return { success: false as const, error: "The final paper order is missing or contains extra questions." };
  }
  if (new Set(orderedQuestionIds).size !== orderedQuestionIds.length) {
    return { success: false as const, error: "The final paper order contains duplicate question IDs." };
  }
  const canonicalSet = new Set(canonicalIds);
  if (orderedQuestionIds.some((id) => !canonicalSet.has(id))) {
    return { success: false as const, error: "The final paper order contains an unknown question ID." };
  }
  const orderedPaper = applyFinalQuestionOrder(paper, mode, orderedQuestionIds);
  const appliedIds = orderedPaper.sections.flatMap((section) => section.questions.map((question) => question.id));
  if (appliedIds.some((id, index) => id !== orderedQuestionIds[index])) {
    return { success: false as const, error: "The final paper order does not match the selected ordering mode." };
  }
  const recalculatedMarks = orderedPaper.sections
    .flatMap((section) => section.questions)
    .reduce((total, question) => total + question.marks, 0);
  if (recalculatedMarks !== paper.totalMarks || recalculatedMarks < 1) {
    return { success: false as const, error: "The final paper marks no longer match the validated paper." };
  }
  return { success: true as const, paper: { ...orderedPaper, totalMarks: recalculatedMarks } };
}

export function validateSourceVersions(
  questions: PaperBuilderQuestion[],
  versions: Array<{ id: string; updatedAt: string }>,
) {
  if (!Array.isArray(versions) || versions.length !== questions.length) {
    return "Revalidate the paper before saving because its question versions are incomplete.";
  }
  const versionById = new Map(versions.map((item) => [item.id, item.updatedAt]));
  if (versionById.size !== versions.length) return "Question version data contains duplicate IDs.";
  for (const question of questions) {
    if (!question.sourceUpdatedAt || versionById.get(question.id) !== question.sourceUpdatedAt) {
      return "A Question Bank record changed after preview. Revalidate the paper before saving.";
    }
  }
  return null;
}

type SnapshotQuestion = {
  id: string;
  originalBankQuestionId: string | null;
  topicId: string | null;
  topicNameSnapshot: string | null;
  questionType: BankQuestionTypeValue;
  marks: number;
  difficulty: string;
  source: string | null;
  sortOrder: number;
  finalQuestionNumber: number;
  questionText: string;
  optionA: string | null;
  optionB: string | null;
  optionC: string | null;
  optionD: string | null;
  correctAnswer: string | null;
  modelAnswer: string | null;
  explanation: string | null;
  imageUrl: string | null;
  imageAlt: string | null;
  imageCaption: string | null;
};

type SnapshotPaper = {
  boardTitleSnapshot: string;
  qualificationTitleSnapshot: string;
  subjectId: string | null;
  subjectNameSnapshot: string;
  totalMarks: number;
  durationMinutes: number;
  institutionName: string;
  examLabel: string;
  courseLine: string;
  paperTitle: string;
  topicLine: string;
  dateText: string;
  classText: string;
  showStudentName: boolean;
  showRollNumber: boolean;
  instructions: string;
  sections: Array<{
    id: string;
    label: string;
    questionType: BankQuestionTypeValue | null;
    questionCount: number;
    marksPerQuestion: number | null;
    isMixedOutput: boolean;
    sortOrder: number;
    questions: SnapshotQuestion[];
  }>;
};

export function savedPaperSnapshotToValidatedPaper(snapshot: SnapshotPaper): ValidatedPaper {
  const sections = [...snapshot.sections].sort((left, right) => left.sortOrder - right.sortOrder);
  const numbered = sections.flatMap((section) => [...section.questions].sort((left, right) => left.sortOrder - right.sortOrder));
  const expected = numbered.map((_, index) => index + 1);
  if (
    numbered.length === 0 ||
    numbered.some((question, index) => question.finalQuestionNumber !== expected[index]) ||
    new Set(numbered.map((question) => question.finalQuestionNumber)).size !== numbered.length
  ) {
    throw new Error("Saved paper numbering is invalid.");
  }
  if (sections.some((section) => section.questionCount !== section.questions.length)) {
    throw new Error("A saved paper section is incomplete.");
  }
  const calculatedMarks = numbered.reduce((total, question) => total + question.marks, 0);
  if (calculatedMarks !== snapshot.totalMarks) throw new Error("Saved paper marks are invalid.");

  const details: PaperDetails = {
    institutionName: snapshot.institutionName,
    examLabel: snapshot.examLabel,
    title: snapshot.paperTitle,
    courseLine: snapshot.courseLine,
    topicLine: snapshot.topicLine,
    durationMinutes: snapshot.durationMinutes,
    dateText: snapshot.dateText,
    classText: snapshot.classText,
    showStudentName: snapshot.showStudentName,
    showRollNumber: snapshot.showRollNumber,
    instructions: snapshot.instructions,
  };
  return {
    details,
    boardTitle: snapshot.boardTitleSnapshot,
    qualificationTitle: snapshot.qualificationTitleSnapshot,
    subjectName: snapshot.subjectNameSnapshot,
    topicNames: [...new Set(numbered.map((question) => question.topicNameSnapshot).filter((value): value is string => Boolean(value)))],
    totalMarks: snapshot.totalMarks,
    sections: sections.map((section) => {
      const questions = [...section.questions]
        .sort((left, right) => left.sortOrder - right.sortOrder)
        .map((question) => ({
          id: question.id,
          subjectId: snapshot.subjectId ?? "saved-subject",
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
          source: question.source,
          imageUrl: question.imageUrl,
          imageAlt: question.imageAlt,
          imageCaption: question.imageCaption,
          topicTag: null,
          difficulty: question.difficulty,
          marks: question.marks,
          topicName: question.topicNameSnapshot,
        }));
      return {
        patternId: section.id,
        label: section.label,
        questionType: section.questionType ?? questions[0].questionType,
        questionCount: section.questionCount,
        marksPerQuestion: section.marksPerQuestion ?? 0,
        difficulty: "any" as const,
        questions,
        isMixedOutput: section.isMixedOutput,
      };
    }),
  };
}
