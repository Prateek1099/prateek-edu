"use server";

import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireActiveWorkspace } from "@/lib/require-role";
import { validateBankQuestionInput } from "@/lib/bank-questions";

type WorkspaceQuestionInput = {
  subjectId: string;
  topicId?: string | null;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  explanation?: string | null;
  topicTag?: string | null;
  difficulty?: string;
  marks?: number;
};

async function validateWorkspaceMcq(data: WorkspaceQuestionInput) {
  const validation = validateBankQuestionInput({
    ...data,
    topicId: data.topicId ?? null,
    questionType: "MCQ",
    difficulty: data.difficulty || "medium",
    marks: data.marks ?? 1,
  });
  if (!validation.success) throw new Error(validation.errors.join(" "));

  const subject = await prisma.subject.findUnique({ where: { id: validation.data.subjectId }, select: { id: true } });
  if (!subject) throw new Error("Selected subject was not found.");
  if (validation.data.topicId) {
    const topic = await prisma.topic.findFirst({
      where: { id: validation.data.topicId, subjectId: validation.data.subjectId },
      select: { id: true },
    });
    if (!topic) throw new Error("Selected topic does not belong to the subject.");
  }
  return validation.data;
}

export async function createWorkspaceQuestion(data: WorkspaceQuestionInput) {
  const user = await requireActiveWorkspace();
  const validated = await validateWorkspaceMcq(data);

  const question = await prisma.bankQuestion.create({
    data: {
      ...validated,
      workspaceId: user.workspaceId,
    },
  });

  revalidatePath("/workspace/question-bank");
  return question;
}

export async function updateWorkspaceQuestion(id: string, data: WorkspaceQuestionInput) {
  const user = await requireActiveWorkspace();
  const validated = await validateWorkspaceMcq(data);

  const existing = await prisma.bankQuestion.findUnique({
    where: { id },
  });

  if (!existing || existing.workspaceId !== user.workspaceId) {
    throw new Error("Question not found or unauthorized");
  }

  const updated = await prisma.bankQuestion.update({
    where: { id },
    data: validated,
  });

  revalidatePath("/workspace/question-bank");
  return updated;
}

export async function deleteWorkspaceQuestion(id: string) {
  const user = await requireActiveWorkspace();
  
  const existing = await prisma.bankQuestion.findUnique({
    where: { id },
  });

  if (!existing || existing.workspaceId !== user.workspaceId) {
    throw new Error("Question not found or unauthorized");
  }

  await prisma.bankQuestion.delete({
    where: { id },
  });

  revalidatePath("/workspace/question-bank");
}

export async function getWorkspaceQuestions(filters?: { subjectId?: string, topicId?: string, view?: 'all' | 'my' | 'vexa' }) {
  const user = await requireActiveWorkspace();
  
  const where: Prisma.BankQuestionWhereInput = { questionType: "MCQ" };
  
  if (filters?.subjectId && filters.subjectId !== "all") {
    where.subjectId = filters.subjectId;
  }
  
  if (filters?.topicId && filters.topicId !== "all") {
    where.topicId = filters.topicId;
  }
  
  if (filters?.view === "my") {
    where.workspaceId = user.workspaceId;
  } else if (filters?.view === "vexa") {
    where.workspaceId = null;
  } else {
    // "all" - both global and this workspace's questions
    where.OR = [
      { workspaceId: null },
      { workspaceId: user.workspaceId }
    ];
  }

  return prisma.bankQuestion.findMany({
    where,
    include: {
      subject: { select: { name: true, id: true } },
      topic: { select: { topicName: true, id: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}
