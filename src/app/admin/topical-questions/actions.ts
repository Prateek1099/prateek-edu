"use server";

import { revalidatePath } from "next/cache";

import { normalizeTrustedPdfUrl } from "@/lib/document-security";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/require-role";

export type TopicalQuestionInput = {
  title: string;
  description: string | null;
  subjectId: string;
  topicId: string | null;
  questionsPdfUrl: string;
  answersPdfUrl: string | null;
  isPublished: boolean;
};

type NormalizedInput = TopicalQuestionInput;

function revalidateTopicalQuestions() {
  revalidatePath("/admin/topical-questions");
  revalidatePath("/resources", "layout");
}

async function normalizeInput(
  input: TopicalQuestionInput,
): Promise<{ data: NormalizedInput } | { error: string }> {
  const title = input.title.trim();
  const description = input.description?.trim() || null;
  const questionsPdfUrl = normalizeTrustedPdfUrl(input.questionsPdfUrl);
  const answersPdfUrl = input.answersPdfUrl
    ? normalizeTrustedPdfUrl(input.answersPdfUrl)
    : null;

  if (!title) return { error: "Add a student-facing title." };
  if (!input.subjectId) return { error: "Choose a subject." };
  if (!questionsPdfUrl) {
    return { error: "Upload a valid questions PDF from an approved document source." };
  }
  if (input.answersPdfUrl && !answersPdfUrl) {
    return { error: "Upload a valid solutions PDF from an approved document source." };
  }

  const subject = await prisma.subject.findUnique({
    where: { id: input.subjectId },
    select: { id: true },
  });
  if (!subject) return { error: "The selected subject no longer exists." };

  if (input.topicId) {
    const topic = await prisma.topic.findFirst({
      where: { id: input.topicId, subjectId: input.subjectId },
      select: { id: true },
    });
    if (!topic) return { error: "Choose a topic that belongs to the selected subject." };
  }

  return {
    data: {
      title,
      description,
      subjectId: input.subjectId,
      topicId: input.topicId || null,
      questionsPdfUrl,
      answersPdfUrl,
      isPublished: Boolean(input.isPublished),
    },
  };
}

export async function createTopicalQuestion(input: TopicalQuestionInput) {
  try {
    await requireSuperAdmin();
    const normalized = await normalizeInput(input);
    if ("error" in normalized) return { success: false as const, error: normalized.error };

    await prisma.topicalQuestion.create({ data: normalized.data });
    revalidateTopicalQuestions();
    return { success: true as const };
  } catch (error: unknown) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to create topical questions.",
    };
  }
}

export async function updateTopicalQuestion(id: string, input: TopicalQuestionInput) {
  try {
    await requireSuperAdmin();
    const normalized = await normalizeInput(input);
    if ("error" in normalized) return { success: false as const, error: normalized.error };

    const updated = await prisma.topicalQuestion.updateMany({
      where: { id },
      data: normalized.data,
    });
    if (updated.count === 0) {
      return { success: false as const, error: "This topical resource no longer exists." };
    }

    revalidateTopicalQuestions();
    return { success: true as const };
  } catch (error: unknown) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to update topical questions.",
    };
  }
}

export async function toggleTopicalQuestionPublished(id: string) {
  try {
    await requireSuperAdmin();
    const resource = await prisma.topicalQuestion.findUnique({
      where: { id },
      select: { isPublished: true },
    });
    if (!resource) {
      return { success: false as const, error: "This topical resource no longer exists." };
    }

    await prisma.topicalQuestion.update({
      where: { id },
      data: { isPublished: !resource.isPublished },
    });
    revalidateTopicalQuestions();
    return { success: true as const };
  } catch (error: unknown) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to update publish status.",
    };
  }
}

export async function deleteTopicalQuestion(id: string) {
  try {
    await requireSuperAdmin();
    const deleted = await prisma.topicalQuestion.deleteMany({ where: { id } });
    if (deleted.count === 0) {
      return { success: false as const, error: "This topical resource was already deleted." };
    }

    revalidateTopicalQuestions();
    return { success: true as const };
  } catch (error: unknown) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to delete topical questions.",
    };
  }
}
