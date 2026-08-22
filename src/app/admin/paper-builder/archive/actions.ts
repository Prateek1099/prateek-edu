"use server";

import crypto from "node:crypto";

import { SavedGeneratedPaperOrderMode } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { validateBlueprintSelection } from "@/app/admin/paper-builder/blueprint/actions";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/require-role";
import {
  deleteArchivedQuestionImages,
  copyPaperQuestionImages,
  isArchiveOwnedQuestionImageUrl,
} from "@/lib/paper-builder/saved-paper-images";
import {
  SAVED_PAPER_SNAPSHOT_VERSION,
  savedPaperSnapshotToValidatedPaper,
  validateAndApplyFinalOrder,
  validateSavedPaperMetadata,
  validateSourceVersions,
} from "@/lib/paper-builder/saved-paper-rules";
import type {
  SaveGeneratedPaperInput,
  SavedGeneratedPaperDetail,
  SavedGeneratedPaperFilters,
  SavedGeneratedPaperSummary,
} from "@/lib/paper-builder/saved-paper-types";
import type { FinalPaperOrderMode } from "@/lib/paper-builder/final-paper-order";

const orderToDatabase: Record<FinalPaperOrderMode, SavedGeneratedPaperOrderMode> = {
  chapter_wise: SavedGeneratedPaperOrderMode.CHAPTER_WISE,
  shuffle_within_sections: SavedGeneratedPaperOrderMode.SHUFFLE_WITHIN_SECTIONS,
  fully_shuffled: SavedGeneratedPaperOrderMode.FULLY_SHUFFLED,
};

const orderFromDatabase: Record<SavedGeneratedPaperOrderMode, FinalPaperOrderMode> = {
  CHAPTER_WISE: "chapter_wise",
  SHUFFLE_WITHIN_SECTIONS: "shuffle_within_sections",
  FULLY_SHUFFLED: "fully_shuffled",
};

function cleanFilter(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, 200) : undefined;
}

function filterDate(value: unknown, endOfDay = false) {
  const clean = cleanFilter(value);
  if (!clean || !/^\d{4}-\d{2}-\d{2}$/.test(clean)) return undefined;
  const date = new Date(`${clean}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function validId(value: unknown) {
  if (typeof value !== "string" || !value.trim() || value.length > 200) throw new Error("Choose a valid saved paper.");
  return value;
}

function archivedImageUrl(sourceUrl: string | null | undefined, copies: Map<string, string>) {
  if (!sourceUrl) return null;
  const archived = copies.get(sourceUrl);
  if (!archived) throw new Error("A question image was not copied into Paper Archive.");
  return archived;
}

function toSummary(paper: {
  id: string;
  name: string;
  description: string | null;
  boardId: string | null;
  boardTitleSnapshot: string;
  qualificationId: string | null;
  qualificationTitleSnapshot: string;
  subjectId: string | null;
  subjectNameSnapshot: string;
  totalMarks: number;
  durationMinutes: number;
  finalOrderMode: SavedGeneratedPaperOrderMode;
  sourceBlueprintTemplateNameSnapshot: string | null;
  createdBy: { name: string | null; email: string | null };
  createdAt: Date;
  archivedAt: Date | null;
}): SavedGeneratedPaperSummary {
  return {
    id: paper.id,
    name: paper.name,
    description: paper.description,
    boardId: paper.boardId,
    boardTitle: paper.boardTitleSnapshot,
    qualificationId: paper.qualificationId,
    qualificationTitle: paper.qualificationTitleSnapshot,
    subjectId: paper.subjectId,
    subjectName: paper.subjectNameSnapshot,
    totalMarks: paper.totalMarks,
    durationMinutes: paper.durationMinutes,
    finalOrderMode: orderFromDatabase[paper.finalOrderMode],
    sourceBlueprintTemplateName: paper.sourceBlueprintTemplateNameSnapshot,
    createdByName: paper.createdBy.name,
    createdByEmail: paper.createdBy.email,
    createdAt: paper.createdAt.toISOString(),
    archivedAt: paper.archivedAt?.toISOString() ?? null,
  };
}

function revalidateArchivePaths(id?: string) {
  revalidatePath("/admin/paper-builder/archive");
  if (id) revalidatePath(`/admin/paper-builder/archive/${id}`);
}

export async function saveGeneratedPaper(input: SaveGeneratedPaperInput) {
  const admin = await requireSuperAdmin();
  const metadata = validateSavedPaperMetadata(input?.name, input?.description);
  if (!metadata.success) return metadata;

  const validation = await validateBlueprintSelection(input.draft, input.selections);
  if (!validation.success) return { success: false as const, error: validation.error };
  const allQuestions = validation.result.paper.sections.flatMap((section) => section.questions);
  const staleError = validateSourceVersions(allQuestions, input.questionVersions);
  if (staleError) return { success: false as const, error: staleError };
  const ordered = validateAndApplyFinalOrder(validation.result.paper, input.finalOrderMode, input.orderedQuestionIds);
  if (!ordered.success) return ordered;

  let sourceTemplate: { id: string; name: string } | null = null;
  if (input.sourceBlueprintTemplateId) {
    sourceTemplate = await prisma.paperBlueprintTemplate.findFirst({
      where: {
        id: input.sourceBlueprintTemplateId,
        boardId: input.draft.boardId,
        qualificationId: input.draft.qualificationId,
        subjectId: input.draft.subjectId,
      },
      select: { id: true, name: true },
    });
    if (!sourceTemplate) {
      return { success: false as const, error: "The applied blueprint template is no longer valid for this paper." };
    }
  }

  const savedPaperId = crypto.randomUUID();
  let copiedImages: Awaited<ReturnType<typeof copyPaperQuestionImages>> | null = null;
  try {
    copiedImages = await copyPaperQuestionImages(ordered.paper, savedPaperId);
    let finalQuestionNumber = 0;
    await prisma.$transaction((tx) => tx.savedGeneratedPaper.create({
      data: {
        id: savedPaperId,
        name: metadata.name,
        description: metadata.description,
        boardId: input.draft.boardId,
        boardTitleSnapshot: ordered.paper.boardTitle,
        qualificationId: input.draft.qualificationId,
        qualificationTitleSnapshot: ordered.paper.qualificationTitle,
        subjectId: input.draft.subjectId,
        subjectNameSnapshot: ordered.paper.subjectName,
        totalMarks: ordered.paper.totalMarks,
        durationMinutes: ordered.paper.details.durationMinutes,
        finalOrderMode: orderToDatabase[input.finalOrderMode],
        snapshotVersion: SAVED_PAPER_SNAPSHOT_VERSION,
        sourceBlueprintTemplateId: sourceTemplate?.id ?? null,
        sourceBlueprintTemplateNameSnapshot: sourceTemplate?.name ?? null,
        institutionName: ordered.paper.details.institutionName,
        examLabel: ordered.paper.details.examLabel,
        courseLine: ordered.paper.details.courseLine,
        paperTitle: ordered.paper.details.title,
        topicLine: ordered.paper.details.topicLine,
        dateText: ordered.paper.details.dateText,
        classText: ordered.paper.details.classText,
        showStudentName: ordered.paper.details.showStudentName,
        showRollNumber: ordered.paper.details.showRollNumber,
        instructions: ordered.paper.details.instructions,
        createdById: admin.id,
        sections: {
          create: ordered.paper.sections.map((section, sectionIndex) => ({
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
    revalidateArchivePaths(savedPaperId);
    return { success: true as const, id: savedPaperId };
  } catch (error) {
    if (copiedImages) await deleteArchivedQuestionImages(copiedImages.uploadedUrls);
    return { success: false as const, error: error instanceof Error ? error.message : "Could not save the generated paper." };
  }
}

export async function listSavedGeneratedPapers(filters: SavedGeneratedPaperFilters = {}) {
  await requireSuperAdmin();
  const search = cleanFilter(filters.search);
  const from = filterDate(filters.dateFrom);
  const through = filterDate(filters.dateTo, true);
  const papers = await prisma.savedGeneratedPaper.findMany({
    where: {
      archivedAt: filters.status === "archived" ? { not: null } : null,
      boardId: cleanFilter(filters.boardId),
      qualificationId: cleanFilter(filters.qualificationId),
      subjectId: cleanFilter(filters.subjectId),
      createdAt: from || through ? { gte: from, lte: through } : undefined,
      OR: search ? [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { subjectNameSnapshot: { contains: search, mode: "insensitive" } },
      ] : undefined,
    },
    include: { createdBy: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
  });
  return papers.map(toSummary);
}

export async function getSavedGeneratedPaper(id: string): Promise<SavedGeneratedPaperDetail | null> {
  await requireSuperAdmin();
  const paper = await prisma.savedGeneratedPaper.findUnique({
    where: { id: validId(id) },
    include: {
      createdBy: { select: { name: true, email: true } },
      sections: {
        orderBy: { sortOrder: "asc" },
        include: { questions: { orderBy: { sortOrder: "asc" } } },
      },
    },
  });
  if (!paper) return null;
  if (paper.snapshotVersion !== SAVED_PAPER_SNAPSHOT_VERSION) throw new Error("This saved paper uses an unsupported snapshot version.");
  const summary = toSummary(paper);
  return { ...summary, paper: savedPaperSnapshotToValidatedPaper(paper) };
}

export async function archiveSavedGeneratedPaper(id: string) {
  await requireSuperAdmin();
  const paperId = validId(id);
  const result = await prisma.savedGeneratedPaper.updateMany({
    where: { id: paperId, archivedAt: null },
    data: { archivedAt: new Date() },
  });
  if (result.count !== 1) return { success: false as const, error: "This saved paper is missing or already archived." };
  revalidateArchivePaths(paperId);
  return { success: true as const };
}

export async function restoreSavedGeneratedPaper(id: string) {
  await requireSuperAdmin();
  const paperId = validId(id);
  const result = await prisma.savedGeneratedPaper.updateMany({
    where: { id: paperId, archivedAt: { not: null } },
    data: { archivedAt: null },
  });
  if (result.count !== 1) return { success: false as const, error: "This saved paper is missing or already active." };
  revalidateArchivePaths(paperId);
  return { success: true as const };
}

export async function deleteArchivedGeneratedPaper(id: string, confirmationName: string) {
  await requireSuperAdmin();
  const paperId = validId(id);
  const paper = await prisma.savedGeneratedPaper.findUnique({
    where: { id: paperId },
    select: {
      name: true,
      archivedAt: true,
      sections: { select: { questions: { select: { imageUrl: true } } } },
    },
  });
  if (!paper) return { success: false as const, error: "This saved paper no longer exists." };
  if (!paper.archivedAt) return { success: false as const, error: "Archive this paper before permanently deleting it." };
  if (confirmationName.trim() !== paper.name) return { success: false as const, error: "Enter the exact saved paper name to confirm deletion." };
  const imageUrls = [...new Set(paper.sections.flatMap((section) => section.questions)
    .map((question) => question.imageUrl)
    .filter((value): value is string => typeof value === "string")
    .filter(isArchiveOwnedQuestionImageUrl))];
  await prisma.savedGeneratedPaper.delete({ where: { id: paperId } });
  const unreferenced: string[] = [];
  for (const imageUrl of imageUrls) {
    const remaining = await prisma.savedGeneratedPaperQuestion.count({ where: { imageUrl } });
    if (remaining === 0) unreferenced.push(imageUrl);
  }
  await deleteArchivedQuestionImages(unreferenced);
  revalidateArchivePaths(paperId);
  return { success: true as const };
}
