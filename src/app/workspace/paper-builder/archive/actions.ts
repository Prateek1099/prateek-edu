"use server";

import { SavedGeneratedPaperOrderMode } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { persistSavedGeneratedPaper } from "@/lib/paper-builder/saved-paper-service";
import {
  SAVED_PAPER_SNAPSHOT_VERSION,
  savedPaperSnapshotToValidatedPaper,
  validateSavedPaperMetadata,
} from "@/lib/paper-builder/saved-paper-rules";
import type {
  SavedGeneratedPaperDetail,
  SavedGeneratedPaperSummary,
  TeacherSaveGeneratedPaperInput,
} from "@/lib/paper-builder/saved-paper-types";
import type { FinalPaperOrderMode } from "@/lib/paper-builder/final-paper-order";
import { requireActiveWorkspace } from "@/lib/require-role";
import { validateTeacherPaperSelectionForWorkspace } from "@/lib/teacher-paper-builder-service";

const orderFromDatabase: Record<SavedGeneratedPaperOrderMode, FinalPaperOrderMode> = {
  CHAPTER_WISE: "chapter_wise",
  SHUFFLE_WITHIN_SECTIONS: "shuffle_within_sections",
  FULLY_SHUFFLED: "fully_shuffled",
};

function validId(value: unknown) {
  if (typeof value !== "string" || !value.trim() || value.length > 200) {
    throw new Error("Choose a valid saved paper.");
  }
  return value;
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
  _count: { questions: number };
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
    questionCount: paper._count.questions,
    durationMinutes: paper.durationMinutes,
    finalOrderMode: orderFromDatabase[paper.finalOrderMode],
    sourceBlueprintTemplateName: paper.sourceBlueprintTemplateNameSnapshot,
    createdByName: paper.createdBy.name,
    createdByEmail: paper.createdBy.email,
    createdAt: paper.createdAt.toISOString(),
    archivedAt: paper.archivedAt?.toISOString() ?? null,
  };
}

function revalidateTeacherArchivePaths(id?: string) {
  revalidatePath("/workspace/paper-builder/archive");
  if (id) revalidatePath(`/workspace/paper-builder/archive/${id}`);
}

export async function saveTeacherGeneratedPaper(input: TeacherSaveGeneratedPaperInput) {
  try {
    const teacher = await requireActiveWorkspace();
    if (!input?.validationInput) {
      return { success: false as const, error: "Validate the paper before saving it." };
    }
    const validationInput = input.validationInput;
    const validation = await validateTeacherPaperSelectionForWorkspace(
      teacher.workspaceId,
      validationInput,
    );
    if (!validation.success) return validation;

    const subject = await prisma.subject.findUnique({
      where: { id: validationInput.subjectId },
      select: {
        id: true,
        qualificationId: true,
        qualification: { select: { boardId: true } },
      },
    });
    if (!subject) return { success: false as const, error: "The selected subject no longer exists." };

    const defaultName = `Paper Builder Standard - ${validation.paper.subjectName} - ${new Date()
      .toISOString()
      .slice(0, 10)}`;
    const requestedName = typeof input?.name === "string" ? input.name.trim() : "";
    const metadata = validateSavedPaperMetadata(requestedName || defaultName, input?.description);
    if (!metadata.success) return metadata;

    const result = await persistSavedGeneratedPaper({
      name: metadata.name,
      description: metadata.description,
      paper: validation.paper,
      boardId: subject.qualification.boardId,
      qualificationId: subject.qualificationId,
      subjectId: subject.id,
      createdById: teacher.id,
      workspaceId: teacher.workspaceId,
      finalOrderMode: SavedGeneratedPaperOrderMode.CHAPTER_WISE,
    });
    if (result.success) revalidateTeacherArchivePaths(result.id);
    return result;
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Could not save the generated paper.",
    };
  }
}

export async function listTeacherSavedGeneratedPapers(status: "active" | "archived") {
  const teacher = await requireActiveWorkspace();
  const papers = await prisma.savedGeneratedPaper.findMany({
    where: {
      workspaceId: teacher.workspaceId,
      archivedAt: status === "archived" ? { not: null } : null,
    },
    include: {
      createdBy: { select: { name: true, email: true } },
      _count: { select: { questions: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return papers.map(toSummary);
}

export async function getTeacherSavedGeneratedPaper(
  id: string,
): Promise<SavedGeneratedPaperDetail | null> {
  const teacher = await requireActiveWorkspace();
  const paper = await prisma.savedGeneratedPaper.findFirst({
    where: { id: validId(id), workspaceId: teacher.workspaceId },
    include: {
      createdBy: { select: { name: true, email: true } },
      _count: { select: { questions: true } },
      sections: {
        orderBy: { sortOrder: "asc" },
        include: { questions: { orderBy: { sortOrder: "asc" } } },
      },
    },
  });
  if (!paper) return null;
  if (paper.snapshotVersion !== SAVED_PAPER_SNAPSHOT_VERSION) {
    throw new Error("This saved paper uses an unsupported snapshot version.");
  }
  return { ...toSummary(paper), paper: savedPaperSnapshotToValidatedPaper(paper) };
}

export async function archiveTeacherSavedGeneratedPaper(id: string) {
  const teacher = await requireActiveWorkspace();
  const paperId = validId(id);
  const result = await prisma.savedGeneratedPaper.updateMany({
    where: { id: paperId, workspaceId: teacher.workspaceId, archivedAt: null },
    data: { archivedAt: new Date() },
  });
  if (result.count !== 1) {
    return { success: false as const, error: "This saved paper is missing or already archived." };
  }
  revalidateTeacherArchivePaths(paperId);
  return { success: true as const };
}

export async function restoreTeacherSavedGeneratedPaper(id: string) {
  const teacher = await requireActiveWorkspace();
  const paperId = validId(id);
  const result = await prisma.savedGeneratedPaper.updateMany({
    where: {
      id: paperId,
      workspaceId: teacher.workspaceId,
      archivedAt: { not: null },
    },
    data: { archivedAt: null },
  });
  if (result.count !== 1) {
    return { success: false as const, error: "This saved paper is missing or already active." };
  }
  revalidateTeacherArchivePaths(paperId);
  return { success: true as const };
}
