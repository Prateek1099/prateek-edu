"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireActiveWorkspace } from "@/lib/require-role";

export async function createWorkspaceQuestion(data: {
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
}) {
  const user = await requireActiveWorkspace();
  
  const question = await prisma.bankQuestion.create({
    data: {
      workspaceId: user.workspaceId,
      subjectId: data.subjectId,
      topicId: data.topicId || null,
      questionText: data.questionText,
      optionA: data.optionA,
      optionB: data.optionB,
      optionC: data.optionC,
      optionD: data.optionD,
      correctAnswer: data.correctAnswer,
      explanation: data.explanation || null,
      topicTag: data.topicTag || null,
      difficulty: data.difficulty || "medium",
      marks: data.marks || 1,
    },
  });

  revalidatePath("/workspace/question-bank");
  return question;
}

export async function updateWorkspaceQuestion(id: string, data: any) {
  const user = await requireActiveWorkspace();
  
  const existing = await prisma.bankQuestion.findUnique({
    where: { id },
  });

  if (!existing || existing.workspaceId !== user.workspaceId) {
    throw new Error("Question not found or unauthorized");
  }

  const updated = await prisma.bankQuestion.update({
    where: { id },
    data: {
      subjectId: data.subjectId,
      topicId: data.topicId || null,
      questionText: data.questionText,
      optionA: data.optionA,
      optionB: data.optionB,
      optionC: data.optionC,
      optionD: data.optionD,
      correctAnswer: data.correctAnswer,
      explanation: data.explanation || null,
      topicTag: data.topicTag || null,
      difficulty: data.difficulty || "medium",
      marks: data.marks || 1,
    },
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
  
  const where: any = {};
  
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
