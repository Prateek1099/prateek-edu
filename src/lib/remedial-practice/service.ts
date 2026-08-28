import "server-only";

import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { isMcqCompatibleQuestion } from "@/lib/bank-questions";
import { normalizeQuestionText } from "@/lib/paper-builder/rules";
import { prisma } from "@/lib/prisma";
import { requireActiveWorkspace } from "@/lib/require-role";
import {
  extractRemedialWrongAnswerEvidence,
  rankRemedialWeakTopics,
  suggestRemedialQuestionIds,
  uniqueRemedialCandidates,
  validateRemedialSelection,
} from "@/lib/remedial-practice/rules";
import type {
  CreateRemedialPracticeInput,
  RemedialPracticeActionResult,
  RemedialPracticeCandidate,
  RemedialPracticeContext,
} from "@/lib/remedial-practice/types";
import { normalizeDueDate } from "@/lib/workspace-assignment-rules";
import {
  workspaceActionErrorMessage,
  workspaceExpectedError,
} from "@/lib/workspace-action-errors";
import { requireWorkspaceSubjectScope } from "@/lib/workspace-academic-scope";

type RemedialDb = typeof prisma | Prisma.TransactionClient;

const bankQuestionSelect = {
  id: true,
  workspaceId: true,
  subjectId: true,
  topicId: true,
  questionType: true,
  questionText: true,
  optionA: true,
  optionB: true,
  optionC: true,
  optionD: true,
  correctAnswer: true,
  explanation: true,
  topicTag: true,
  difficulty: true,
  marks: true,
  topic: { select: { topicName: true } },
} satisfies Prisma.BankQuestionSelect;

type EligibleQuestion = Prisma.BankQuestionGetPayload<{ select: typeof bankQuestionSelect }>;

function cleanTitle(value: unknown, fallback: string) {
  const title = typeof value === "string" ? value.trim().slice(0, 200) : "";
  const normalized = title || fallback;
  return /^remedial practice:/i.test(normalized)
    ? normalized
    : `Remedial Practice: ${normalized}`;
}

function calculateDifficulty(questions: EligibleQuestion[]) {
  const values = new Set(questions.map((question) => question.difficulty));
  return values.size === 1 ? questions[0]?.difficulty ?? "medium" : "mixed";
}

async function loadRemedialSource(
  db: RemedialDb,
  workspaceId: string,
  classId: string,
  batchId: string,
) {
  const batch = await db.workspaceAssignmentBatch.findFirst({
    where: {
      id: batchId,
      classId,
      workspaceId,
      class: { id: classId, workspaceId, status: "ACTIVE", workspace: { status: "ACTIVE" } },
      challenge: { workspaceId, type: "QUICK_PRACTICE" },
    },
    select: {
      id: true,
      classId: true,
      challengeId: true,
      class: {
        select: {
          id: true,
          name: true,
          subjectId: true,
          students: {
            where: { status: "ACTIVE" },
            select: {
              studentId: true,
              student: { select: { id: true, name: true, email: true } },
            },
            orderBy: { enrolledAt: "asc" },
          },
        },
      },
      challenge: {
        select: {
          id: true,
          title: true,
          subjectId: true,
          topicId: true,
          questions: {
            select: {
              id: true,
              bankQuestionId: true,
              questionText: true,
              correctAnswer: true,
              bankQuestion: { select: { topicId: true } },
            },
          },
        },
      },
      recipients: {
        where: {
          revokedAt: null,
          student: { classEnrollments: { some: { classId, status: "ACTIVE" } } },
        },
        select: { studentId: true, assignedAt: true },
      },
    },
  });

  if (!batch) {
    workspaceExpectedError("This Quick Practice assignment is not available in your workspace.");
  }
  if (!batch.class.subjectId || batch.class.subjectId !== batch.challenge.subjectId) {
    workspaceExpectedError("The source assignment does not match an active class subject.");
  }
  await requireWorkspaceSubjectScope(workspaceId, batch.challenge.subjectId, db);

  const relationalTopicIds = Array.from(
    new Set(
      batch.challenge.questions.flatMap((question) => {
        const topicId = question.bankQuestion?.topicId ?? batch.challenge.topicId;
        return topicId ? [topicId] : [];
      }),
    ),
  );
  const [subject, topics, attempts] = await Promise.all([
    db.subject.findUnique({
      where: { id: batch.challenge.subjectId },
      select: { id: true, name: true },
    }),
    relationalTopicIds.length
      ? db.topic.findMany({
          where: { id: { in: relationalTopicIds }, subjectId: batch.challenge.subjectId },
          select: { id: true, topicName: true },
        })
      : Promise.resolve([]),
    batch.recipients.length
      ? db.challengeAttempt.findMany({
          where: {
            challengeId: batch.challengeId,
            userId: { in: batch.recipients.map((recipient) => recipient.studentId) },
          },
          select: { userId: true, completedAt: true, answers: true },
        })
      : Promise.resolve([]),
  ]);
  if (!subject) workspaceExpectedError("The assigned subject no longer exists.");

  const topicNames = new Map(topics.map((topic) => [topic.id, topic.topicName]));
  const evidence = extractRemedialWrongAnswerEvidence({
    questions: batch.challenge.questions.map((question) => {
      const candidateTopicId = question.bankQuestion?.topicId ?? batch.challenge.topicId;
      return {
        id: question.id,
        bankQuestionId: question.bankQuestionId,
        topicId: candidateTopicId && topicNames.has(candidateTopicId) ? candidateTopicId : null,
        correctAnswer: question.correctAnswer,
      };
    }),
    recipients: batch.recipients,
    attempts,
  });
  const weakTopics = rankRemedialWeakTopics(topicNames, evidence);
  const weakTopicIds = weakTopics.map((topic) => topic.id);
  const sourceBankQuestionIds = new Set(
    batch.challenge.questions.flatMap((question) =>
      question.bankQuestionId ? [question.bankQuestionId] : [],
    ),
  );
  const sourceTexts = new Set(
    batch.challenge.questions.map((question) => normalizeQuestionText(question.questionText)),
  );
  const rawCandidates = weakTopicIds.length
    ? await db.bankQuestion.findMany({
        where: {
          subjectId: batch.challenge.subjectId,
          topicId: { in: weakTopicIds },
          questionType: "MCQ",
          OR: [{ workspaceId: null }, { workspaceId }],
        },
        select: bankQuestionSelect,
        orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      })
    : [];
  const eligibleRecords = rawCandidates.filter(isMcqCompatibleQuestion);
  const candidateRecords = new Map(eligibleRecords.map((question) => [question.id, question]));
  const candidates = uniqueRemedialCandidates(
    eligibleRecords.flatMap((question): RemedialPracticeCandidate[] =>
      question.topicId && question.topic
        ? [{
            id: question.id,
            topicId: question.topicId,
            topicName: question.topic.topicName,
            questionText: question.questionText,
            optionA: question.optionA!,
            optionB: question.optionB!,
            optionC: question.optionC!,
            optionD: question.optionD!,
            difficulty: question.difficulty,
            marks: question.marks,
            usedInSourceAssignment:
              sourceBankQuestionIds.has(question.id) ||
              sourceTexts.has(normalizeQuestionText(question.questionText)),
          }]
        : [],
    ),
  );
  const suggestedQuestionIds = suggestRemedialQuestionIds({
    candidates,
    weakTopics,
    requestedCount: Math.min(5, candidates.length),
  });
  const sourceRecipientIds = new Set(batch.recipients.map((recipient) => recipient.studentId));
  const students = batch.class.students.map((membership) => ({
    id: membership.student.id,
    name: membership.student.name,
    email: membership.student.email,
    sourceRecipient: sourceRecipientIds.has(membership.studentId),
    mistakeCount: evidence.studentMistakes.get(membership.studentId) ?? 0,
  }));
  const context: RemedialPracticeContext = {
    classId: batch.class.id,
    className: batch.class.name,
    batchId: batch.id,
    sourceChallengeId: batch.challenge.id,
    sourceChallengeTitle: batch.challenge.title,
    subjectId: batch.challenge.subjectId,
    subjectName: subject.name,
    weakTopics,
    students,
    candidates,
    suggestedQuestionIds,
    suggestedStudentIds: students.filter((student) => student.mistakeCount > 0).map((student) => student.id),
    freshCandidateCount: candidates.filter((candidate) => !candidate.usedInSourceAssignment).length,
    reusedCandidateCount: candidates.filter((candidate) => candidate.usedInSourceAssignment).length,
  };

  return { context, candidateRecords };
}

export async function getTeacherRemedialPracticeContext({
  classId,
  batchId,
}: {
  classId: string;
  batchId: string;
}): Promise<RemedialPracticeActionResult<RemedialPracticeContext>> {
  try {
    const user = await requireActiveWorkspace();
    const loaded = await loadRemedialSource(prisma, user.workspaceId, classId, batchId);
    return { success: true, data: loaded.context };
  } catch (error) {
    return {
      success: false,
      error: workspaceActionErrorMessage(error, "Could not load remedial practice evidence."),
    };
  }
}

export async function createTeacherRemedialPractice(
  input: CreateRemedialPracticeInput,
): Promise<
  RemedialPracticeActionResult<{
    challengeId: string;
    batchId: string;
    assignedCount: number;
  }>
> {
  try {
    const user = await requireActiveWorkspace();
    const dueDate = normalizeDueDate(input?.dueDate);
    const selectedQuestionIds = Array.isArray(input?.questionIds)
      ? input.questionIds.filter((id): id is string => typeof id === "string" && Boolean(id))
      : [];
    const selectedStudentIds = Array.isArray(input?.studentIds)
      ? input.studentIds.filter((id): id is string => typeof id === "string" && Boolean(id))
      : [];
    if (new Set(selectedStudentIds).size !== selectedStudentIds.length) {
      workspaceExpectedError("Remove duplicate students before creating the assignment.");
    }
    if (selectedStudentIds.length < 1) {
      workspaceExpectedError("Select at least one active student from this class.");
    }

    const result = await prisma.$transaction(
      async (tx) => {
        const loaded = await loadRemedialSource(
          tx,
          user.workspaceId,
          input?.classId,
          input?.batchId,
        );
        const selectionError = validateRemedialSelection(
          loaded.context.candidates,
          selectedQuestionIds,
        );
        if (selectionError) workspaceExpectedError(selectionError);
        if (loaded.context.weakTopics.length === 0) {
          workspaceExpectedError("No relational wrong-answer topics are available for this assignment.");
        }

        const activeStudentIds = new Set(loaded.context.students.map((student) => student.id));
        if (selectedStudentIds.some((studentId) => !activeStudentIds.has(studentId))) {
          workspaceExpectedError("Every selected student must be active in this exact class.");
        }

        const orderedQuestions = selectedQuestionIds.map((questionId) =>
          loaded.candidateRecords.get(questionId),
        );
        if (orderedQuestions.some((question) =>
          !question ||
          question.subjectId !== loaded.context.subjectId ||
          !question.topicId ||
          !loaded.context.weakTopics.some((topic) => topic.id === question.topicId) ||
          !isMcqCompatibleQuestion(question) ||
          (question.workspaceId !== null && question.workspaceId !== user.workspaceId)
        )) {
          workspaceExpectedError(
            "One or more questions are stale or outside the assigned subject, topics, or workspace.",
          );
        }
        const validQuestions = orderedQuestions.filter(
          (question): question is EligibleQuestion => Boolean(question),
        );
        const normalizedTexts = validQuestions.map((question) =>
          normalizeQuestionText(question.questionText),
        );
        if (new Set(normalizedTexts).size !== normalizedTexts.length) {
          workspaceExpectedError("Selected questions must have unique normalized question text.");
        }

        const title = cleanTitle(
          input?.title,
          loaded.context.weakTopics[0]?.name ?? loaded.context.sourceChallengeTitle,
        );
        const selectedTopicIds = new Set(validQuestions.flatMap((question) =>
          question.topicId ? [question.topicId] : [],
        ));
        const challenge = await tx.challenge.create({
          data: {
            workspaceId: user.workspaceId,
            title,
            subjectId: loaded.context.subjectId,
            topicId: selectedTopicIds.size === 1 ? [...selectedTopicIds][0] : null,
            difficulty: calculateDifficulty(validQuestions),
            estimatedTime: Math.max(5, validQuestions.length * 2),
            isPublished: true,
            type: "QUICK_PRACTICE",
            questions: {
              create: validQuestions.map((question, index) => ({
                questionText: question.questionText,
                optionA: question.optionA!,
                optionB: question.optionB!,
                optionC: question.optionC!,
                optionD: question.optionD!,
                correctAnswer: question.correctAnswer!,
                explanation: question.explanation,
                topicTag: question.topicTag,
                sortOrder: index,
                bankQuestionId: question.id,
                difficulty: question.difficulty,
                marks: question.marks,
              })),
            },
          },
          select: { id: true },
        });
        const assignment = await tx.workspaceAssignmentBatch.create({
          data: {
            workspaceId: user.workspaceId,
            classId: loaded.context.classId,
            challengeId: challenge.id,
            assignedById: user.id,
            audience: "SELECTED_STUDENTS",
            dueDate,
            includeLateJoiners: false,
            recipients: {
              create: selectedStudentIds.map((studentId) => ({ studentId })),
            },
          },
          select: { id: true },
        });

        return {
          challengeId: challenge.id,
          batchId: assignment.id,
          assignedCount: selectedStudentIds.length,
        };
      },
      { isolationLevel: "Serializable" },
    );

    revalidatePath(`/workspace/classes/${input.classId}`);
    revalidatePath(`/workspace/classes/${input.classId}/assignments/${input.batchId}`);
    revalidatePath("/workspace/quick-practice");
    revalidatePath("/workspace/students");
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/worksheets");
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error: workspaceActionErrorMessage(error, "Could not create and assign remedial practice."),
    };
  }
}
