import "server-only";

import { SavedGeneratedPaperOrderMode } from "@prisma/client";

import {
  assembleBlueprintSelections,
  calculateBlueprintPaperMarks,
  groupBlueprintRowsForOutput,
  questionMatchesBlueprintRow,
} from "@/lib/paper-builder/blueprint-rules";
import type {
  BlueprintGeneratedRow,
  BlueprintGenerationResult,
  BlueprintPaperDraft,
  BlueprintSelection,
} from "@/lib/paper-builder/blueprint-types";
import {
  cleanTeacherBlueprintDetails,
  hasClientWorkspaceId,
  reviewTeacherBlueprintQuestionAvailability,
  teacherBlueprintRows,
  teacherBlueprintShortageMessage,
  validateTeacherBlueprintDraft,
} from "@/lib/paper-builder/teacher-blueprint-rules";
import { findDuplicateSelection } from "@/lib/paper-builder/rules";
import {
  validateAndApplyFinalOrder,
  validateSavedPaperMetadata,
  validateSourceVersions,
} from "@/lib/paper-builder/saved-paper-rules";
import { persistSavedGeneratedPaper } from "@/lib/paper-builder/saved-paper-service";
import type { SaveGeneratedPaperInput } from "@/lib/paper-builder/saved-paper-types";
import type { PaperBuilderQuestion } from "@/lib/paper-builder/types";
import { prisma } from "@/lib/prisma";
import {
  TEACHER_GLOBAL_PAPER_QUESTION_TYPES,
  TEACHER_WORKSPACE_PAPER_QUESTION_TYPES,
} from "@/lib/teacher-paper-builder-policy";
import { requireWorkspaceSubjectScope } from "@/lib/workspace-academic-scope";

const orderToDatabase = {
  chapter_wise: SavedGeneratedPaperOrderMode.CHAPTER_WISE,
  shuffle_within_sections: SavedGeneratedPaperOrderMode.SHUFFLE_WITHIN_SECTIONS,
  fully_shuffled: SavedGeneratedPaperOrderMode.FULLY_SHUFFLED,
} as const;

type RowError = { rowId: string; message: string };
type TeacherBlueprintScope = Awaited<ReturnType<typeof loadTeacherBlueprintScope>>;

function mapQuestion(question: {
  id: string;
  updatedAt: Date;
  workspaceId: string | null;
  subjectId: string;
  topicId: string | null;
  questionType: PaperBuilderQuestion["questionType"];
  questionText: string;
  optionA: string | null;
  optionB: string | null;
  optionC: string | null;
  optionD: string | null;
  correctAnswer: string | null;
  modelAnswer: string | null;
  explanation: string | null;
  source: string | null;
  imageUrl: string | null;
  imageAlt: string | null;
  imageCaption: string | null;
  topicTag: string | null;
  difficulty: string;
  marks: number;
  topic: { topicName: string } | null;
}): PaperBuilderQuestion {
  return {
    id: question.id,
    sourceUpdatedAt: question.updatedAt.toISOString(),
    subjectId: question.subjectId,
    topicId: question.topicId,
    questionType: question.questionType,
    questionText: question.questionText,
    optionA: question.optionA,
    optionB: question.optionB,
    optionC: question.optionC,
    optionD: question.optionD,
    correctAnswer: question.correctAnswer,
    modelAnswer: question.modelAnswer,
    explanation: question.explanation,
    source: question.source,
    imageUrl: question.imageUrl,
    imageAlt: question.imageAlt,
    imageCaption: question.imageCaption,
    topicTag: question.topicTag,
    difficulty: question.difficulty,
    marks: question.marks,
    topicName: question.topic?.topicName ?? null,
  };
}

async function loadTeacherBlueprintScope(
  workspaceId: string,
  input: BlueprintPaperDraft,
  selectedQuestionIds?: string[],
) {
  await requireWorkspaceSubjectScope(workspaceId, input.subjectId);
  const topicIds = input.chapters.map((chapter) => chapter.topicId);
  const [subject, topics, records] = await Promise.all([
    prisma.subject.findFirst({
      where: {
        id: input.subjectId,
        status: "PUBLISHED",
        qualification: {
          id: input.qualificationId,
          status: "PUBLISHED",
          board: { id: input.boardId, status: "PUBLISHED" },
        },
      },
      select: {
        id: true,
        name: true,
        qualification: {
          select: {
            id: true,
            title: true,
            board: { select: { id: true, title: true } },
          },
        },
      },
    }),
    prisma.topic.findMany({
      where: {
        id: { in: topicIds },
        subjectId: input.subjectId,
        status: "PUBLISHED",
      },
      select: { id: true, topicName: true, sortOrder: true },
      orderBy: [{ sortOrder: "asc" }, { topicName: "asc" }],
    }),
    prisma.bankQuestion.findMany({
      where: {
        id: selectedQuestionIds ? { in: selectedQuestionIds } : undefined,
        subjectId: input.subjectId,
        topicId: { in: topicIds },
        OR: [
          {
            workspaceId: null,
            questionType: { in: [...TEACHER_GLOBAL_PAPER_QUESTION_TYPES] },
          },
          {
            workspaceId,
            questionType: { in: [...TEACHER_WORKSPACE_PAPER_QUESTION_TYPES] },
          },
        ],
      },
      select: {
        id: true,
        updatedAt: true,
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
        modelAnswer: true,
        explanation: true,
        source: true,
        imageUrl: true,
        imageAlt: true,
        imageCaption: true,
        topicTag: true,
        difficulty: true,
        marks: true,
        topic: { select: { topicName: true } },
      },
    }),
  ]);

  const globalTypes = new Set<string>(TEACHER_GLOBAL_PAPER_QUESTION_TYPES);
  const workspaceTypes = new Set<string>(TEACHER_WORKSPACE_PAPER_QUESTION_TYPES);
  const invalidOwnership = records.some((question) =>
    question.workspaceId === null
      ? !globalTypes.has(question.questionType)
      : question.workspaceId !== workspaceId || !workspaceTypes.has(question.questionType),
  );
  if (invalidOwnership) {
    throw new Error("A Question Bank record is outside this teacher workspace policy.");
  }

  return { subject, topics, questions: records.map(mapQuestion) };
}

function teacherBlueprintScopeError(
  input: BlueprintPaperDraft,
  scope: TeacherBlueprintScope,
) {
  if (!scope.subject) {
    return "The selected subject, board, or qualification is no longer published and assigned.";
  }
  if (
    scope.subject.qualification.id !== input.qualificationId ||
    scope.subject.qualification.board.id !== input.boardId
  ) {
    return "The selected subject does not belong to the chosen board and qualification.";
  }
  if (scope.topics.length !== input.chapters.length) {
    return "One or more selected chapters are unpublished or do not belong to the assigned subject.";
  }
  return null;
}

function buildTeacherBlueprintGenerationResult(
  input: BlueprintPaperDraft,
  scope: TeacherBlueprintScope,
  selected: Map<string, PaperBuilderQuestion[]>,
): BlueprintGenerationResult {
  const topicById = new Map(scope.topics.map((topic) => [topic.id, topic]));
  const rows: BlueprintGeneratedRow[] = input.chapters.flatMap((chapter) =>
    chapter.rows.map((row) => ({
      ...row,
      sectionLabel: row.sectionLabel.trim().slice(0, 100),
      topicName: topicById.get(row.topicId)?.topicName ?? chapter.topicName,
      questions: selected.get(row.id) ?? [],
    })),
  );
  const questions = rows.flatMap((row) => row.questions);
  const duplicateError = findDuplicateSelection(questions);
  if (duplicateError) throw new Error(duplicateError);

  const details = cleanTeacherBlueprintDetails(input.details);
  if (!details || !scope.subject) throw new Error("The teacher blueprint details are invalid.");
  const topicNames = input.chapters.map(
    (chapter) => topicById.get(chapter.topicId)?.topicName ?? chapter.topicName,
  );
  const totalMarks = questions.reduce((total, question) => total + question.marks, 0);
  const blueprintMarks = calculateBlueprintPaperMarks(input.chapters);
  if (totalMarks !== blueprintMarks) {
    throw new Error("The generated question marks do not match the teacher blueprint total.");
  }

  return {
    paper: {
      details: {
        ...details,
        courseLine:
          details.courseLine ||
          `${scope.subject.name} · ${scope.subject.qualification.title} · ${scope.subject.qualification.board.title}`,
      },
      boardTitle: scope.subject.qualification.board.title,
      qualificationTitle: scope.subject.qualification.title,
      subjectName: scope.subject.name,
      topicNames,
      totalMarks,
      sections: groupBlueprintRowsForOutput(rows),
    },
    rows,
    selections: rows.map((row) => ({
      rowId: row.id,
      questionIds: row.questions.map((question) => question.id),
    })),
  };
}

export async function reviewTeacherBlueprintAvailabilityForWorkspace(
  workspaceId: string,
  input: BlueprintPaperDraft,
) {
  const inputError = validateTeacherBlueprintDraft(input);
  if (inputError) return { success: false as const, error: inputError };
  const scope = await loadTeacherBlueprintScope(workspaceId, input);
  const scopeError = teacherBlueprintScopeError(input, scope);
  if (scopeError) return { success: false as const, error: scopeError };

  const topicNames = new Map(scope.topics.map((topic) => [topic.id, topic.topicName]));
  const reviewed = reviewTeacherBlueprintQuestionAvailability(input, scope.questions);
  return {
    success: true as const,
    availability: reviewed.availability.map((item) => {
      if (item.status !== "insufficient") return item;
      const row = teacherBlueprintRows(input).find((candidate) => candidate.id === item.rowId)!;
      return {
        ...item,
        errors: [
          teacherBlueprintShortageMessage(
            row,
            topicNames.get(row.topicId) ?? "Selected chapter",
            item.uniqueTextCount,
          ),
        ],
      };
    }),
    totalMarks: calculateBlueprintPaperMarks(input.chapters),
  };
}

export async function generateTeacherBlueprintPaperForWorkspace(
  workspaceId: string,
  input: BlueprintPaperDraft,
) {
  const inputError = validateTeacherBlueprintDraft(input);
  if (inputError) {
    return { success: false as const, error: inputError, rowErrors: [] as RowError[] };
  }
  const scope = await loadTeacherBlueprintScope(workspaceId, input);
  const scopeError = teacherBlueprintScopeError(input, scope);
  if (scopeError) {
    return { success: false as const, error: scopeError, rowErrors: [] as RowError[] };
  }

  const rows = teacherBlueprintRows(input);
  const topicNames = new Map(scope.topics.map((topic) => [topic.id, topic.topicName]));
  const { availability, pools } = reviewTeacherBlueprintQuestionAvailability(
    input,
    scope.questions,
  );
  const rowErrors = availability
    .filter((item) => item.status === "insufficient")
    .map((item) => {
      const row = rows.find((candidate) => candidate.id === item.rowId)!;
      return {
        rowId: item.rowId,
        message: teacherBlueprintShortageMessage(
          row,
          topicNames.get(row.topicId) ?? "Selected chapter",
          item.uniqueTextCount,
        ),
      };
    });
  if (rowErrors.length > 0) {
    return {
      success: false as const,
      error: "The teacher blueprint cannot be filled completely yet.",
      rowErrors,
    };
  }

  const assembled = assembleBlueprintSelections(rows, pools);
  if (assembled.shortages.length > 0) {
    return {
      success: false as const,
      error: "Some rows compete for the same usable questions. Adjust the blueprint and try again.",
      rowErrors: assembled.shortages.map((shortage) => {
        const row = rows.find((candidate) => candidate.id === shortage.rowId)!;
        return {
          rowId: row.id,
          message: teacherBlueprintShortageMessage(
            row,
            topicNames.get(row.topicId) ?? "Selected chapter",
            shortage.usableCount,
          ),
        };
      }),
    };
  }

  return {
    success: true as const,
    result: buildTeacherBlueprintGenerationResult(input, scope, assembled.selected),
  };
}

export async function validateTeacherBlueprintSelectionForWorkspace(
  workspaceId: string,
  input: BlueprintPaperDraft,
  selections: BlueprintSelection[],
) {
  const inputError = validateTeacherBlueprintDraft(input);
  if (inputError) return { success: false as const, error: inputError };
  const rows = teacherBlueprintRows(input);
  if (!Array.isArray(selections) || selections.length !== rows.length) {
    return { success: false as const, error: "Every blueprint row needs one selection." };
  }

  const rowIds = new Set(rows.map((row) => row.id));
  const selectionByRow = new Map<string, string[]>();
  for (const selection of selections) {
    if (
      !selection?.rowId ||
      !rowIds.has(selection.rowId) ||
      selectionByRow.has(selection.rowId) ||
      !Array.isArray(selection.questionIds)
    ) {
      return { success: false as const, error: "Current teacher blueprint selections are invalid." };
    }
    selectionByRow.set(
      selection.rowId,
      selection.questionIds.filter(
        (id): id is string => typeof id === "string" && Boolean(id),
      ),
    );
  }

  const selectedIds = rows.flatMap((row) => selectionByRow.get(row.id) ?? []);
  if (new Set(selectedIds).size !== selectedIds.length) {
    return { success: false as const, error: "Duplicate Question Bank IDs are not allowed." };
  }
  const scope = await loadTeacherBlueprintScope(workspaceId, input, selectedIds);
  const scopeError = teacherBlueprintScopeError(input, scope);
  if (scopeError) return { success: false as const, error: scopeError };
  if (scope.questions.length !== selectedIds.length) {
    return {
      success: false as const,
      error:
        "One or more questions are missing or outside the permitted academic and workspace scope.",
    };
  }

  const questionById = new Map(scope.questions.map((question) => [question.id, question]));
  const selected = new Map<string, PaperBuilderQuestion[]>();
  for (const row of rows) {
    const ids = selectionByRow.get(row.id) ?? [];
    if (ids.length !== row.questionCount) {
      return {
        success: false as const,
        error: `${row.sectionLabel} requires ${row.questionCount} questions but has ${ids.length}.`,
      };
    }
    const questions = ids
      .map((id) => questionById.get(id))
      .filter((question): question is PaperBuilderQuestion => Boolean(question));
    if (
      questions.length !== ids.length ||
      questions.some(
        (question) => !questionMatchesBlueprintRow(question, input.subjectId, row),
      )
    ) {
      return {
        success: false as const,
        error: `${row.sectionLabel} contains a stale or incomplete question that no longer matches its exact chapter, type, marks, or difficulty.`,
      };
    }
    selected.set(row.id, questions);
  }

  const duplicateError = findDuplicateSelection([...selected.values()].flat());
  if (duplicateError) return { success: false as const, error: duplicateError };
  return {
    success: true as const,
    result: buildTeacherBlueprintGenerationResult(input, scope, selected),
  };
}

export async function saveTeacherBlueprintGeneratedPaperForWorkspace(
  teacher: { id: string; workspaceId: string },
  input: SaveGeneratedPaperInput,
) {
  if (hasClientWorkspaceId(input)) {
    return {
      success: false as const,
      error: "Workspace access is derived from the signed-in teacher session.",
    };
  }
  if (input?.sourceBlueprintTemplateId != null) {
    return {
      success: false as const,
      error: "Teacher blueprint templates are not available in this phase.",
    };
  }
  const metadata = validateSavedPaperMetadata(input?.name, input?.description);
  if (!metadata.success) return metadata;

  const validation = await validateTeacherBlueprintSelectionForWorkspace(
    teacher.workspaceId,
    input.draft,
    input.selections,
  );
  if (!validation.success) return validation;
  const questions = validation.result.paper.sections.flatMap((section) => section.questions);
  const staleError = validateSourceVersions(questions, input.questionVersions);
  if (staleError) return { success: false as const, error: staleError };

  const ordered = validateAndApplyFinalOrder(
    validation.result.paper,
    input.finalOrderMode,
    input.orderedQuestionIds,
  );
  if (!ordered.success) return ordered;

  return persistSavedGeneratedPaper({
    name: metadata.name,
    description: metadata.description,
    paper: ordered.paper,
    boardId: input.draft.boardId,
    qualificationId: input.draft.qualificationId,
    subjectId: input.draft.subjectId,
    createdById: teacher.id,
    workspaceId: teacher.workspaceId,
    finalOrderMode: orderToDatabase[input.finalOrderMode],
    sourceBlueprintTemplateId: null,
    sourceBlueprintTemplateName: null,
  });
}
