"use server";

import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireActiveWorkspace } from "@/lib/require-role";
import { validateBankQuestionInput } from "@/lib/bank-questions";
import {
  listActiveWorkspaceSubjectIds,
  requireWorkspaceSubjectScope,
  requireWorkspaceTopicScope,
} from "@/lib/workspace-academic-scope";

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

async function validateWorkspaceMcq(workspaceId: string, data: WorkspaceQuestionInput) {
  const validation = validateBankQuestionInput({
    ...data,
    topicId: data.topicId ?? null,
    questionType: "MCQ",
    difficulty: data.difficulty || "medium",
    marks: data.marks ?? 1,
  });
  if (!validation.success) throw new Error(validation.errors.join(" "));

  await requireWorkspaceTopicScope(
    workspaceId,
    validation.data.subjectId,
    validation.data.topicId,
  );
  return validation.data;
}

export async function createWorkspaceQuestion(data: WorkspaceQuestionInput) {
  const user = await requireActiveWorkspace();
  const validated = await validateWorkspaceMcq(user.workspaceId, data);

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
  const validated = await validateWorkspaceMcq(user.workspaceId, data);

  const existing = await prisma.bankQuestion.findUnique({
    where: { id },
  });

  if (!existing || existing.workspaceId !== user.workspaceId) {
    throw new Error("Question not found or unauthorized");
  }
  await requireWorkspaceSubjectScope(user.workspaceId, existing.subjectId);

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
  await requireWorkspaceSubjectScope(user.workspaceId, existing.subjectId);

  await prisma.bankQuestion.delete({
    where: { id },
  });

  revalidatePath("/workspace/question-bank");
}

export async function getWorkspaceQuestions(filters?: { subjectId?: string, topicId?: string, view?: 'all' | 'my' | 'vexa' }) {
  const user = await requireActiveWorkspace();
  const subjectIds = await listActiveWorkspaceSubjectIds(user.workspaceId);
  
  const where: Prisma.BankQuestionWhereInput = {
    questionType: "MCQ",
    subjectId: { in: subjectIds },
  };
  
  if (filters?.subjectId && filters.subjectId !== "all") {
    await requireWorkspaceSubjectScope(user.workspaceId, filters.subjectId);
    where.subjectId = filters.subjectId;
  }
  
  if (filters?.topicId && filters.topicId !== "all") {
    const topic = await prisma.topic.findUnique({
      where: { id: filters.topicId },
      select: { subjectId: true },
    });
    if (!topic) throw new Error("Selected topic was not found.");
    await requireWorkspaceTopicScope(user.workspaceId, topic.subjectId, filters.topicId);
    if (filters.subjectId && filters.subjectId !== "all" && topic.subjectId !== filters.subjectId) {
      throw new Error("The selected topic does not belong to the selected subject.");
    }
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
