"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireActiveWorkspace } from "@/lib/require-role";
import { isMcqCompatibleQuestion } from "@/lib/bank-questions";
import { validateWorkspaceAssessmentFields } from "@/lib/teacher-trial-ux-rules";
import {
  workspaceActionErrorMessage,
  workspaceExpectedError,
} from "@/lib/workspace-action-errors";
import {
  requireWorkspaceSubjectScope,
  requireWorkspaceTopicScope,
} from "@/lib/workspace-academic-scope";

export type CreateWorkspaceChallengeResult =
  | { success: true; challengeId: string }
  | { success: false; error: string };

async function loadEligibleWorkspaceMcqs({
  workspaceId,
  subjectId,
  topicId,
  questionIds,
  contentLabel,
}: {
  workspaceId: string;
  subjectId: string;
  topicId?: string | null;
  questionIds: string[];
  contentLabel: "Worksheet" | "Quick Practice";
}) {
  await requireWorkspaceTopicScope(workspaceId, subjectId, topicId);
  const [subject, topic, questions] = await Promise.all([
    prisma.subject.findFirst({
      where: { id: subjectId, status: "PUBLISHED" },
      select: { id: true },
    }),
    topicId
      ? prisma.topic.findFirst({
          where: { id: topicId, subjectId },
          select: { id: true },
        })
      : null,
    prisma.bankQuestion.findMany({
      where: {
        id: { in: questionIds },
        subjectId,
        questionType: "MCQ",
        OR: [{ workspaceId: null }, { workspaceId }],
        ...(topicId ? { topicId } : {}),
      },
    }),
  ]);

  if (!subject) workspaceExpectedError("Choose a valid published subject.");
  if (topicId && !topic) workspaceExpectedError("The selected topic does not belong to this subject.");
  if (questions.length !== questionIds.length) {
    workspaceExpectedError(
      "One or more selected questions are unavailable for this subject, topic, or workspace.",
    );
  }
  if (questions.some((question) => !isMcqCompatibleQuestion(question))) {
    workspaceExpectedError(`${contentLabel} can currently use complete MCQ questions only.`);
  }
  return questions;
}

export async function createWorksheet(data: {
  title: string;
  subjectId: string;
  topicId?: string | null;
  estimatedTime: number;
  questionIds: string[];
}): Promise<CreateWorkspaceChallengeResult> {
  try {
    const fieldError = validateWorkspaceAssessmentFields(data);
    if (fieldError) return { success: false, error: fieldError };
    const user = await requireActiveWorkspace();
    const questions = await loadEligibleWorkspaceMcqs({
      workspaceId: user.workspaceId,
      subjectId: data.subjectId,
      topicId: data.topicId,
      questionIds: data.questionIds,
      contentLabel: "Worksheet",
    });

    // Calculate difficulty based on questions.
    const hardCount = questions.filter((question) => question.difficulty === "hard").length;
    const easyCount = questions.filter((question) => question.difficulty === "easy").length;

    let difficulty = "medium";
    if (hardCount > questions.length * 0.5) difficulty = "hard";
    else if (easyCount > questions.length * 0.5) difficulty = "easy";
    else if (hardCount > 0 && easyCount > 0) difficulty = "mixed";

    const challenge = await prisma.challenge.create({
      data: {
        workspaceId: user.workspaceId,
        title: data.title.trim(),
        subjectId: data.subjectId,
        topicId: data.topicId || null,
        difficulty,
        estimatedTime: data.estimatedTime,
        isPublished: true, // Published inside the workspace; student visibility still requires assignment.
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
          }),
        },
      },
    });

    revalidatePath("/workspace/worksheets");
    return { success: true, challengeId: challenge.id };
  } catch (error) {
    return {
      success: false,
      error: workspaceActionErrorMessage(error, "Could not create the worksheet. Please try again."),
    };
  }
}

export async function createQuickPractice(data: {
  title: string;
  subjectId: string;
  topicId?: string | null;
  questionIds: string[];
  requestedQuestionCount?: number;
}): Promise<CreateWorkspaceChallengeResult> {
  try {
    const fieldError = validateWorkspaceAssessmentFields(data);
    if (fieldError) return { success: false, error: fieldError };
    const user = await requireActiveWorkspace();
    const questions = await loadEligibleWorkspaceMcqs({
      workspaceId: user.workspaceId,
      subjectId: data.subjectId,
      topicId: data.topicId,
      questionIds: data.questionIds,
      contentLabel: "Quick Practice",
    });

    // Calculate difficulty based on questions.
    const hardCount = questions.filter((question) => question.difficulty === "hard").length;
    const easyCount = questions.filter((question) => question.difficulty === "easy").length;

    let difficulty = "medium";
    if (hardCount > questions.length * 0.5) difficulty = "hard";
    else if (easyCount > questions.length * 0.5) difficulty = "easy";
    else if (hardCount > 0 && easyCount > 0) difficulty = "mixed";

    const challenge = await prisma.challenge.create({
      data: {
        workspaceId: user.workspaceId,
        title: data.title.trim(),
        subjectId: data.subjectId,
        topicId: data.topicId || null,
        difficulty,
        estimatedTime: questions.length * 2,
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
          }),
        },
      },
    });

    revalidatePath("/workspace/quick-practice");
    return { success: true, challengeId: challenge.id };
  } catch (error) {
    return {
      success: false,
      error: workspaceActionErrorMessage(error, "Could not create Quick Practice. Please try again."),
    };
  }
}

export async function deleteWorkspaceChallenge(id: string) {
  const user = await requireActiveWorkspace();

  await prisma.$transaction(async (tx) => {
    const existing = await tx.challenge.findUnique({
      where: { id },
      select: {
        id: true,
        workspaceId: true,
        subjectId: true,
        _count: {
          select: {
            assignmentBatches: true,
            assignments: true,
            attempts: true,
            mistakes: true,
          },
        },
      },
    });

    if (!existing || existing.workspaceId !== user.workspaceId) {
      throw new Error("Challenge not found or unauthorized");
    }
    await requireWorkspaceSubjectScope(user.workspaceId, existing.subjectId, tx);
    if (
      existing._count.assignmentBatches > 0 ||
      existing._count.assignments > 0 ||
      existing._count.attempts > 0 ||
      existing._count.mistakes > 0
    ) {
      throw new Error(
        "This content has assignment or student history and cannot be permanently deleted.",
      );
    }

    await tx.challenge.delete({ where: { id } });
  });

  revalidatePath("/workspace/worksheets");
  revalidatePath("/workspace/quick-practice");
}
