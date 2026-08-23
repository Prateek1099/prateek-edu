import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/require-role";
import { getScopedTeachingInsights } from "@/lib/teaching-intelligence";

import {
  findRemedialSelectionError,
  selectRemedialQuestions,
  toRemedialDraftQuestion,
  uniqueEligibleRemedialQuestions,
  validateRemedialRequest,
  validateRemedialScopeInput,
} from "./rules";
import {
  REMEDIAL_DIFFICULTIES,
  type RemedialActionResult,
  type RemedialAvailability,
  type RemedialDifficulty,
  type RemedialDraft,
  type RemedialEvidence,
  type RemedialQuestionCandidate,
  type RemedialSaveInput,
  type RemedialScopeContext,
  type RemedialScopeInput,
} from "./types";

type DbClient = Prisma.TransactionClient | typeof prisma;

const bankQuestionSelect = {
  id: true,
  updatedAt: true,
  subjectId: true,
  topicId: true,
  workspaceId: true,
  questionType: true,
  questionText: true,
  optionA: true,
  optionB: true,
  optionC: true,
  optionD: true,
  correctAnswer: true,
  explanation: true,
  imageUrl: true,
  topicTag: true,
  difficulty: true,
  marks: true,
} satisfies Prisma.BankQuestionSelect;

function cleanTitle(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, 200)
    : fallback;
}

function mapCandidate(
  question: Prisma.BankQuestionGetPayload<{ select: typeof bankQuestionSelect }>,
): RemedialQuestionCandidate {
  return {
    ...question,
    questionType: question.questionType,
    updatedAt: question.updatedAt.toISOString(),
  };
}

async function validateAcademicScope(
  db: DbClient,
  input: RemedialScopeInput,
): Promise<RemedialScopeContext> {
  const inputError = validateRemedialScopeInput(input);
  if (inputError) throw new Error(inputError);

  const subject = await db.subject.findFirst({
    where: {
      id: input.subjectId,
      qualificationId: input.qualificationId,
      status: "PUBLISHED",
      qualification: {
        id: input.qualificationId,
        boardId: input.boardId,
        status: "PUBLISHED",
        board: { id: input.boardId, status: "PUBLISHED" },
      },
    },
    select: {
      id: true,
      name: true,
      code: true,
      qualification: {
        select: {
          id: true,
          title: true,
          board: { select: { id: true, title: true } },
        },
      },
      topics: {
        where: { id: input.topicId, status: "PUBLISHED" },
        select: { id: true, topicName: true },
        take: 1,
      },
    },
  });

  const topic = subject?.topics[0];
  if (!subject || !topic) {
    throw new Error(
      "The selected board, qualification, subject, and topic do not form a valid published academic scope.",
    );
  }

  return {
    ...input,
    boardLabel: subject.qualification.board.title,
    qualificationLabel: subject.qualification.title,
    subjectLabel: subject.code ? `${subject.name} (${subject.code})` : subject.name,
    topicLabel: topic.topicName,
  };
}

async function loadCandidates(
  db: DbClient,
  scope: RemedialScopeInput,
  ids?: string[],
): Promise<RemedialQuestionCandidate[]> {
  const records = await db.bankQuestion.findMany({
    where: {
      ...(ids ? { id: { in: ids } } : {}),
      workspaceId: null,
      subjectId: scope.subjectId,
      topicId: scope.topicId,
      questionType: "MCQ",
    },
    select: bankQuestionSelect,
  });
  return records.map(mapCandidate);
}

async function loadEvidence(scope: RemedialScopeInput): Promise<RemedialEvidence> {
  const insights = await getScopedTeachingInsights({
    boardId: scope.boardId,
    qualificationId: scope.qualificationId,
    subjectId: scope.subjectId,
    topicId: scope.topicId,
    dateRange: scope.dateRange,
  });
  const topic = insights.topics.find((row) => row.topicId === scope.topicId);
  return {
    attempts: topic?.attempts ?? 0,
    averageScore: topic?.averageScore ?? null,
    wrongOrUnanswered: topic?.wrongOrUnanswered ?? 0,
    affectedStudents: topic?.affectedStudents ?? 0,
    sufficientData: topic?.sufficientData ?? false,
  };
}

async function loadAvailability(scope: RemedialScopeInput): Promise<RemedialAvailability> {
  const [context, evidence, candidates] = await Promise.all([
    validateAcademicScope(prisma, scope),
    loadEvidence(scope),
    loadCandidates(prisma, scope),
  ]);
  const counts = Object.fromEntries(
    REMEDIAL_DIFFICULTIES.map((difficulty) => [
      difficulty,
      uniqueEligibleRemedialQuestions(candidates, scope, difficulty).length,
    ]),
  ) as RemedialAvailability["counts"];
  return { scope: context, evidence, counts };
}

export async function getRemedialWorksheetAvailability(
  scope: RemedialScopeInput,
): Promise<RemedialActionResult<RemedialAvailability>> {
  try {
    await requireSuperAdmin();
    return { success: true, data: await loadAvailability(scope) };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Could not load remedial worksheet availability.",
    };
  }
}

export async function generateRemedialWorksheetDraft(
  scope: RemedialScopeInput,
  difficulty: RemedialDifficulty,
  requestedCount: number,
): Promise<RemedialActionResult<RemedialDraft>> {
  try {
    await requireSuperAdmin();
    const requestError = validateRemedialRequest(scope, difficulty, requestedCount);
    if (requestError) return { success: false, error: requestError };

    const [availability, candidates] = await Promise.all([
      loadAvailability(scope),
      loadCandidates(prisma, scope),
    ]);
    const selected = selectRemedialQuestions(
      candidates,
      scope,
      difficulty,
      requestedCount,
    );
    if (!selected.success) return selected;

    return {
      success: true,
      data: {
        ...availability,
        difficulty,
        requestedCount,
        questions: selected.questions.map(toRemedialDraftQuestion),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Could not generate the remedial worksheet draft.",
    };
  }
}

export async function saveRemedialWorksheetDraft(
  input: RemedialSaveInput,
): Promise<RemedialActionResult<{ worksheetId: string; title: string }>> {
  try {
    await requireSuperAdmin();
    const scopeError = validateRemedialScopeInput(input?.scope);
    if (scopeError) return { success: false, error: scopeError };
    if (!REMEDIAL_DIFFICULTIES.includes(input.difficulty)) {
      return { success: false, error: "Choose a valid difficulty." };
    }
    if (!Array.isArray(input.questions)) {
      return { success: false, error: "Generate a draft before saving." };
    }

    const selectedIds = input.questions.map((question) => question.id);
    const selectedVersions = new Map(
      input.questions.map((question) => [question.id, question.sourceUpdatedAt]),
    );

    const result = await prisma.$transaction(async (tx) => {
      const context = await validateAcademicScope(tx, input.scope);
      const candidates = await loadCandidates(tx, input.scope, selectedIds);
      const selectionError = findRemedialSelectionError(
        candidates,
        input.scope,
        input.difficulty,
        selectedIds,
      );
      if (selectionError) throw new Error(selectionError);

      const candidateById = new Map(candidates.map((question) => [question.id, question]));
      const ordered = selectedIds.map((id) => candidateById.get(id)!);
      const stale = ordered.find(
        (question) => selectedVersions.get(question.id) !== question.updatedAt,
      );
      if (stale) {
        throw new Error("A source question changed after preview. Generate a fresh draft before saving.");
      }

      const title = cleanTitle(input.title, `Remedial Worksheet: ${context.topicLabel}`);
      const worksheet = await tx.challenge.create({
        data: {
          title,
          subjectId: context.subjectId,
          topicId: context.topicId,
          workspaceId: null,
          difficulty: input.difficulty === "all" ? "mixed" : input.difficulty,
          estimatedTime: ordered.length * 2,
          isPublished: false,
          type: "WORKSHEET",
          questions: {
            create: ordered.map((question, sortOrder) => {
              const draft = toRemedialDraftQuestion(question);
              return {
                questionText: draft.questionText,
                optionA: draft.optionA,
                optionB: draft.optionB,
                optionC: draft.optionC,
                optionD: draft.optionD,
                correctAnswer: draft.correctAnswer,
                explanation: draft.explanation,
                topicTag: draft.topicTag,
                difficulty: draft.difficulty,
                marks: draft.marks,
                bankQuestionId: question.id,
                sortOrder,
              };
            }),
          },
        },
        select: { id: true, title: true },
      });
      return worksheet;
    });

    return { success: true, data: { worksheetId: result.id, title: result.title } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Could not save the remedial worksheet draft.",
    };
  }
}
