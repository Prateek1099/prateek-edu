"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireActiveWorkspace } from "@/lib/require-role";
import { isMcqCompatibleQuestion } from "@/lib/bank-questions";

export async function createWorksheet(data: {
  title: string;
  subjectId: string;
  topicId?: string | null;
  estimatedTime: number;
  questionIds: string[];
}) {
  const user = await requireActiveWorkspace();
  
  // Verify questions exist and get their details
  const questions = await prisma.bankQuestion.findMany({
    where: {
      id: { in: data.questionIds },
      subjectId: data.subjectId,
      questionType: "MCQ",
      OR: [{ workspaceId: null }, { workspaceId: user.workspaceId }],
      ...(data.topicId ? { topicId: data.topicId } : {}),
    }
  });
  
  if (questions.length !== data.questionIds.length) {
    throw new Error("One or more selected questions could not be found.");
  }
  if (questions.some((question) => !isMcqCompatibleQuestion(question))) {
    throw new Error("Worksheets can currently use complete MCQ questions only.");
  }
  
  // Calculate difficulty based on questions
  const hardCount = questions.filter(q => q.difficulty === 'hard').length;
  const easyCount = questions.filter(q => q.difficulty === 'easy').length;
  
  let difficulty = "medium";
  if (hardCount > questions.length * 0.5) difficulty = "hard";
  else if (easyCount > questions.length * 0.5) difficulty = "easy";
  else if (hardCount > 0 && easyCount > 0) difficulty = "mixed";

  const challenge = await prisma.challenge.create({
    data: {
      workspaceId: user.workspaceId,
      title: data.title,
      subjectId: data.subjectId,
      topicId: data.topicId || null,
      difficulty,
      estimatedTime: data.estimatedTime,
      isPublished: true, // Worksheets are published by default within the workspace
      type: "WORKSHEET",
      questions: {
        create: data.questionIds.map((bankQuestionId, idx) => {
          const bq = questions.find(q => q.id === bankQuestionId)!;
          return {
            questionText: bq.questionText,
            optionA: bq.optionA!,
            optionB: bq.optionB!,
            optionC: bq.optionC!,
            optionD: bq.optionD!,
            correctAnswer: bq.correctAnswer!,
            explanation: bq.explanation,
            topicTag: bq.topicTag,
            difficulty: bq.difficulty,
            marks: bq.marks,
            sortOrder: idx,
            bankQuestionId: bq.id,
          };
        })
      }
    }
  });

  revalidatePath("/workspace/worksheets");
  return challenge;
}

export async function createQuickPractice(data: {
  title: string;
  subjectId: string;
  topicId?: string | null;
  questionIds: string[];
}) {
  const user = await requireActiveWorkspace();
  
  // Verify questions exist and get their details
  const questions = await prisma.bankQuestion.findMany({
    where: {
      id: { in: data.questionIds },
      subjectId: data.subjectId,
      questionType: "MCQ",
      OR: [{ workspaceId: null }, { workspaceId: user.workspaceId }],
      ...(data.topicId ? { topicId: data.topicId } : {}),
    }
  });
  
  if (questions.length !== data.questionIds.length) {
    throw new Error("One or more selected questions could not be found.");
  }
  if (questions.some((question) => !isMcqCompatibleQuestion(question))) {
    throw new Error("Quick Practice can currently use complete MCQ questions only.");
  }
  
  // Calculate difficulty based on questions
  const hardCount = questions.filter(q => q.difficulty === 'hard').length;
  const easyCount = questions.filter(q => q.difficulty === 'easy').length;
  
  let difficulty = "medium";
  if (hardCount > questions.length * 0.5) difficulty = "hard";
  else if (easyCount > questions.length * 0.5) difficulty = "easy";
  else if (hardCount > 0 && easyCount > 0) difficulty = "mixed";

  const challenge = await prisma.challenge.create({
    data: {
      workspaceId: user.workspaceId,
      title: data.title,
      subjectId: data.subjectId,
      topicId: data.topicId || null,
      difficulty,
      estimatedTime: questions.length * 2, // roughly 2 mins per question for quick practice
      isPublished: true, 
      type: "QUICK_PRACTICE",
      questions: {
        create: data.questionIds.map((bankQuestionId, idx) => {
          const bq = questions.find(q => q.id === bankQuestionId)!;
          return {
            questionText: bq.questionText,
            optionA: bq.optionA!,
            optionB: bq.optionB!,
            optionC: bq.optionC!,
            optionD: bq.optionD!,
            correctAnswer: bq.correctAnswer!,
            explanation: bq.explanation,
            topicTag: bq.topicTag,
            difficulty: bq.difficulty,
            marks: bq.marks,
            sortOrder: idx,
            bankQuestionId: bq.id,
          };
        })
      }
    }
  });

  revalidatePath("/workspace/quick-practice");
  return challenge;
}

export async function deleteWorkspaceChallenge(id: string) {
  const user = await requireActiveWorkspace();
  
  const existing = await prisma.challenge.findUnique({
    where: { id },
  });

  if (!existing || existing.workspaceId !== user.workspaceId) {
    throw new Error("Challenge not found or unauthorized");
  }

  await prisma.challenge.delete({
    where: { id },
  });

  revalidatePath("/workspace/worksheets");
  revalidatePath("/workspace/quick-practice");
}
