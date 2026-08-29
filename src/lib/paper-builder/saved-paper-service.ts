import "server-only";

import crypto from "node:crypto";

import type { SavedGeneratedPaperOrderMode } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { findDuplicateSelection } from "@/lib/paper-builder/rules";
import {
  copyPaperQuestionImages,
  deleteArchivedQuestionImages,
} from "@/lib/paper-builder/saved-paper-images";
import { SAVED_PAPER_SNAPSHOT_VERSION } from "@/lib/paper-builder/saved-paper-rules";
import type { ValidatedPaper } from "@/lib/paper-builder/types";

export type PersistSavedGeneratedPaperInput = {
  name: string;
  description: string | null;
  paper: ValidatedPaper;
  boardId: string;
  qualificationId: string;
  subjectId: string;
  createdById: string;
  workspaceId: string | null;
  finalOrderMode: SavedGeneratedPaperOrderMode;
  sourceBlueprintTemplateId?: string | null;
  sourceBlueprintTemplateName?: string | null;
};

function archivedImageUrl(sourceUrl: string | null | undefined, copies: Map<string, string>) {
  if (!sourceUrl) return null;
  const archived = copies.get(sourceUrl);
  if (!archived) throw new Error("A question image was not copied into Paper Archive.");
  return archived;
}

export async function persistSavedGeneratedPaper(input: PersistSavedGeneratedPaperInput) {
  const questions = input.paper.sections.flatMap((section) => section.questions);
  const recalculatedMarks = questions.reduce((total, question) => total + question.marks, 0);
  if (questions.length === 0 || recalculatedMarks < 1 || recalculatedMarks !== input.paper.totalMarks) {
    return { success: false as const, error: "The validated paper marks are no longer consistent." };
  }
  const duplicateError = findDuplicateSelection(questions);
  if (duplicateError) return { success: false as const, error: duplicateError };
  if (!input.createdById || (input.workspaceId !== null && !input.workspaceId)) {
    return { success: false as const, error: "The saved paper owner is invalid." };
  }

  const savedPaperId = crypto.randomUUID();
  let copiedImages: Awaited<ReturnType<typeof copyPaperQuestionImages>> | null = null;
  try {
    copiedImages = await copyPaperQuestionImages(input.paper, savedPaperId);
    let finalQuestionNumber = 0;
    await prisma.$transaction((tx) => tx.savedGeneratedPaper.create({
      data: {
        id: savedPaperId,
        workspaceId: input.workspaceId,
        name: input.name,
        description: input.description,
        boardId: input.boardId,
        boardTitleSnapshot: input.paper.boardTitle,
        qualificationId: input.qualificationId,
        qualificationTitleSnapshot: input.paper.qualificationTitle,
        subjectId: input.subjectId,
        subjectNameSnapshot: input.paper.subjectName,
        totalMarks: input.paper.totalMarks,
        durationMinutes: input.paper.details.durationMinutes,
        finalOrderMode: input.finalOrderMode,
        snapshotVersion: SAVED_PAPER_SNAPSHOT_VERSION,
        sourceBlueprintTemplateId: input.sourceBlueprintTemplateId ?? null,
        sourceBlueprintTemplateNameSnapshot: input.sourceBlueprintTemplateName ?? null,
        institutionName: input.paper.details.institutionName,
        examLabel: input.paper.details.examLabel,
        courseLine: input.paper.details.courseLine,
        paperTitle: input.paper.details.title,
        topicLine: input.paper.details.topicLine,
        dateText: input.paper.details.dateText,
        classText: input.paper.details.classText,
        showStudentName: input.paper.details.showStudentName,
        showRollNumber: input.paper.details.showRollNumber,
        instructions: input.paper.details.instructions,
        createdById: input.createdById,
        sections: {
          create: input.paper.sections.map((section, sectionIndex) => ({
            label: section.label,
            questionType: section.isMixedOutput ? null : section.questionType,
            questionCount: section.questions.length,
            marksPerQuestion: section.isMixedOutput ? null : section.marksPerQuestion,
            isMixedOutput: Boolean(section.isMixedOutput),
            sortOrder: sectionIndex,
            questions: {
              create: section.questions.map((question, questionIndex) => {
                finalQuestionNumber += 1;
                return {
                  savedPaperId,
                  originalBankQuestionId: question.id,
                  topicId: question.topicId,
                  topicNameSnapshot: question.topicName,
                  questionType: question.questionType,
                  marks: question.marks,
                  difficulty: question.difficulty,
                  source: question.source ?? null,
                  sortOrder: questionIndex,
                  finalQuestionNumber,
                  questionText: question.questionText,
                  optionA: question.optionA,
                  optionB: question.optionB,
                  optionC: question.optionC,
                  optionD: question.optionD,
                  correctAnswer: question.correctAnswer,
                  modelAnswer: question.modelAnswer,
                  explanation: question.explanation,
                  imageUrl: archivedImageUrl(question.imageUrl, copiedImages!.bySourceUrl),
                  imageAlt: question.imageAlt ?? null,
                  imageCaption: question.imageCaption ?? null,
                };
              }),
            },
          })),
        },
      },
    }));
    return { success: true as const, id: savedPaperId };
  } catch (error) {
    if (copiedImages) await deleteArchivedQuestionImages(copiedImages.uploadedUrls);
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Could not save the generated paper.",
    };
  }
}
