"use server";

import { BANK_QUESTION_TYPES } from "@/lib/bank-questions";
import {
  assembleBlueprintSelections,
  calculateBlueprintPaperMarks,
  findIncompatibleBlueprintSectionLabels,
  groupBlueprintRowsForOutput,
  questionMatchesBlueprintRow,
  uniqueBlueprintCandidates,
} from "@/lib/paper-builder/blueprint-rules";
import type {
  BlueprintAvailability,
  BlueprintGeneratedRow,
  BlueprintGenerationResult,
  BlueprintPaperDraft,
  BlueprintRowDraft,
  BlueprintSelection,
} from "@/lib/paper-builder/blueprint-types";
import {
  findDuplicateSelection,
  normalizeQuestionText,
} from "@/lib/paper-builder/rules";
import {
  PAPER_DIFFICULTIES,
  type PaperBuilderQuestion,
  type PaperDetails,
} from "@/lib/paper-builder/types";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/require-role";

const allowedTypes = new Set<string>(BANK_QUESTION_TYPES);
const allowedDifficulties = new Set<string>(PAPER_DIFFICULTIES);

type RowError = { rowId: string; message: string };
type Scope = Awaited<ReturnType<typeof loadBlueprintScope>>;

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function cleanDetails(details: PaperDetails): PaperDetails | null {
  const durationMinutes = details?.durationMinutes;
  const institutionName = cleanText(details?.institutionName, 200);
  const examLabel = cleanText(details?.examLabel, 200);
  if (!institutionName || !examLabel) return null;
  if (!Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > 300) return null;
  if (typeof details?.showStudentName !== "boolean" || typeof details?.showRollNumber !== "boolean") return null;
  return {
    institutionName,
    examLabel,
    title: cleanText(details.title, 200),
    courseLine: cleanText(details.courseLine, 500),
    topicLine: cleanText(details.topicLine, 1_000),
    durationMinutes,
    dateText: cleanText(details.dateText, 200),
    classText: cleanText(details.classText, 200),
    showStudentName: details.showStudentName,
    showRollNumber: details.showRollNumber,
    instructions: cleanText(details.instructions, 3_000),
  };
}

function validateDraft(input: BlueprintPaperDraft) {
  if (input?.version !== 1) return "This blueprint version is not supported.";
  if (!cleanDetails(input.details)) return "Complete the institution, exam label, and valid duration.";
  if (typeof input.boardId !== "string" || !input.boardId) return "Choose a board.";
  if (typeof input.qualificationId !== "string" || !input.qualificationId) return "Choose a qualification or class.";
  if (typeof input.subjectId !== "string" || !input.subjectId) return "Choose a subject.";
  if (input.targetMarks !== null && (!Number.isInteger(input.targetMarks) || input.targetMarks < 1 || input.targetMarks > 10_000)) {
    return "Target marks must be a positive whole number or left blank.";
  }
  if (!Array.isArray(input.chapters) || input.chapters.length < 1 || input.chapters.length > 30) {
    return "Choose between 1 and 30 chapters.";
  }

  const chapterIds = new Set<string>();
  const topicIds = new Set<string>();
  const rowIds = new Set<string>();
  let rowCount = 0;
  let questionCount = 0;
  for (const chapter of input.chapters) {
    if (!chapter.id || chapterIds.has(chapter.id) || !chapter.topicId || topicIds.has(chapter.topicId)) {
      return "Every selected chapter must be unique.";
    }
    chapterIds.add(chapter.id);
    topicIds.add(chapter.topicId);
    if (!Array.isArray(chapter.rows) || chapter.rows.length < 1) {
      return `${cleanText(chapter.topicName, 200) || "Each chapter"} needs at least one blueprint row.`;
    }
    for (const row of chapter.rows) {
      rowCount += 1;
      questionCount += row.questionCount;
      if (!row.id || rowIds.has(row.id)) return "Every blueprint row must have a unique identifier.";
      rowIds.add(row.id);
      if (row.topicId !== chapter.topicId) return "A blueprint row is attached to the wrong chapter.";
      if (!cleanText(row.sectionLabel, 100)) return "Every blueprint row needs a section label.";
      if (!allowedTypes.has(row.questionType)) return `Choose a valid question type for ${row.sectionLabel}.`;
      if (!allowedDifficulties.has(row.difficulty)) return `Choose a valid difficulty for ${row.sectionLabel}.`;
      if (!Number.isInteger(row.questionCount) || row.questionCount < 1 || row.questionCount > 100) {
        return `${row.sectionLabel} needs 1 to 100 questions.`;
      }
      if (!Number.isInteger(row.marksPerQuestion) || row.marksPerQuestion < 1 || row.marksPerQuestion > 100) {
        return `${row.sectionLabel} needs positive whole-number marks.`;
      }
    }
  }
  if (rowCount > 50) return "A blueprint can contain at most 50 rows.";
  if (questionCount > 200) return "A blueprint can contain at most 200 questions.";

  const labelError = findIncompatibleBlueprintSectionLabels(input.chapters);
  if (labelError) return labelError;

  const totalMarks = calculateBlueprintPaperMarks(input.chapters);
  if (totalMarks < 1 || totalMarks > 10_000) return "Calculated paper marks must be between 1 and 10,000.";
  if (input.targetMarks !== null && totalMarks !== input.targetMarks) {
    return `The blueprint totals ${totalMarks} marks, but the target is ${input.targetMarks}.`;
  }
  return null;
}

function mapQuestion(question: {
  id: string;
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
    imageUrl: question.imageUrl,
    imageAlt: question.imageAlt,
    imageCaption: question.imageCaption,
    topicTag: question.topicTag,
    difficulty: question.difficulty,
    marks: question.marks,
    topicName: question.topic?.topicName ?? null,
  };
}

async function loadBlueprintScope(input: BlueprintPaperDraft) {
  const topicIds = input.chapters.map((chapter) => chapter.topicId);
  const [subject, topics, records] = await Promise.all([
    prisma.subject.findUnique({
      where: { id: input.subjectId },
      select: {
        id: true,
        name: true,
        qualification: { select: { id: true, title: true, board: { select: { id: true, title: true } } } },
      },
    }),
    prisma.topic.findMany({
      where: { id: { in: topicIds }, subjectId: input.subjectId },
      select: { id: true, topicName: true, sortOrder: true },
    }),
    prisma.bankQuestion.findMany({
      where: { workspaceId: null, subjectId: input.subjectId, topicId: { in: topicIds } },
      select: {
        id: true,
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
  return { subject, topics, questions: records.map(mapQuestion) };
}

function scopeError(input: BlueprintPaperDraft, scope: Scope) {
  if (!scope.subject) return "The selected subject no longer exists.";
  if (
    scope.subject.qualification.id !== input.qualificationId ||
    scope.subject.qualification.board.id !== input.boardId
  ) {
    return "The selected subject does not belong to the chosen board and qualification.";
  }
  if (scope.topics.length !== input.chapters.length) {
    return "One or more selected chapters do not belong to the subject.";
  }
  return null;
}

function allRows(input: BlueprintPaperDraft) {
  return input.chapters.flatMap((chapter) => chapter.rows);
}

function availabilityFor(input: BlueprintPaperDraft, questions: PaperBuilderQuestion[]) {
  const rows = allRows(input);
  const pools = new Map<string, PaperBuilderQuestion[]>();
  const textOwners = new Map<string, Set<string>>();

  for (const row of rows) {
    const pool = uniqueBlueprintCandidates(questions, input.subjectId, row);
    pools.set(row.id, pool);
    for (const question of pool) {
      const text = normalizeQuestionText(question.questionText);
      const owners = textOwners.get(text) ?? new Set<string>();
      owners.add(row.id);
      textOwners.set(text, owners);
    }
  }

  const availability: BlueprintAvailability[] = rows.map((row) => {
    const matchingCount = questions.filter((question) => questionMatchesBlueprintRow(question, input.subjectId, row)).length;
    const uniqueTextCount = pools.get(row.id)?.length ?? 0;
    const surplus = uniqueTextCount - row.questionCount;
    const warnings: string[] = [];
    const errors: string[] = [];
    const overlapping = (pools.get(row.id) ?? []).filter((question) => (textOwners.get(normalizeQuestionText(question.questionText))?.size ?? 0) > 1).length;
    if (overlapping > 0) warnings.push(`${overlapping} candidate${overlapping === 1 ? "" : "s"} overlap with another row.`);
    if (uniqueTextCount < row.questionCount) {
      errors.push(`Only ${uniqueTextCount} unique matching question${uniqueTextCount === 1 ? " is" : "s are"} available, but ${row.questionCount} are required.`);
    } else if (surplus < Math.max(2, Math.ceil(row.questionCount * 0.25))) {
      warnings.push("Low replacement reserve after generation.");
    }
    return {
      rowId: row.id,
      requiredCount: row.questionCount,
      matchingCount,
      uniqueTextCount,
      usableCount: uniqueTextCount,
      status: errors.length > 0 ? "insufficient" : warnings.length > 0 ? "low_reserve" : "ready",
      warnings,
      errors,
    };
  });
  return { availability, pools };
}

function rowErrorMessage(row: BlueprintRowDraft, topicName: string, available: number) {
  return `Only ${available} unique matching questions are available for ${topicName} · ${row.questionType} · ${row.marksPerQuestion} marks, but ${row.questionCount} are required.`;
}

function buildGenerationResult(
  input: BlueprintPaperDraft,
  scope: Scope,
  selected: Map<string, PaperBuilderQuestion[]>,
): BlueprintGenerationResult {
  const topicById = new Map(scope.topics.map((topic) => [topic.id, topic]));
  const generatedRows: BlueprintGeneratedRow[] = input.chapters.flatMap((chapter) =>
    chapter.rows.map((row) => ({
      ...row,
      sectionLabel: cleanText(row.sectionLabel, 100),
      topicName: topicById.get(row.topicId)?.topicName ?? chapter.topicName,
      questions: selected.get(row.id) ?? [],
    })),
  );
  const questions = generatedRows.flatMap((row) => row.questions);
  const duplicateError = findDuplicateSelection(questions);
  if (duplicateError) throw new Error(duplicateError);
  const details = cleanDetails(input.details)!;
  const subject = scope.subject!;
  const topicNames = input.chapters.map((chapter) => topicById.get(chapter.topicId)?.topicName ?? chapter.topicName);
  return {
    paper: {
      details: {
        ...details,
        courseLine: details.courseLine || `${subject.name} · ${subject.qualification.title} · ${subject.qualification.board.title}`,
      },
      boardTitle: subject.qualification.board.title,
      qualificationTitle: subject.qualification.title,
      subjectName: subject.name,
      topicNames,
      totalMarks: questions.reduce((total, question) => total + question.marks, 0),
      sections: groupBlueprintRowsForOutput(generatedRows),
    },
    rows: generatedRows,
    selections: generatedRows.map((row) => ({ rowId: row.id, questionIds: row.questions.map((question) => question.id) })),
  };
}

export async function reviewBlueprintAvailability(input: BlueprintPaperDraft) {
  try {
    await requireSuperAdmin();
    const error = validateDraft(input);
    if (error) return { success: false as const, error };
    const scope = await loadBlueprintScope(input);
    const invalidScope = scopeError(input, scope);
    if (invalidScope) return { success: false as const, error: invalidScope };
    return {
      success: true as const,
      availability: availabilityFor(input, scope.questions).availability,
      totalMarks: calculateBlueprintPaperMarks(input.chapters),
    };
  } catch (error: unknown) {
    return { success: false as const, error: error instanceof Error ? error.message : "Could not review availability." };
  }
}

export async function generateBlueprintPaper(input: BlueprintPaperDraft) {
  try {
    await requireSuperAdmin();
    const error = validateDraft(input);
    if (error) return { success: false as const, error, rowErrors: [] as RowError[] };
    const scope = await loadBlueprintScope(input);
    const invalidScope = scopeError(input, scope);
    if (invalidScope) return { success: false as const, error: invalidScope, rowErrors: [] as RowError[] };
    const topicNames = new Map(scope.topics.map((topic) => [topic.id, topic.topicName]));
    const { availability, pools } = availabilityFor(input, scope.questions);
    const independentErrors = availability
      .filter((item) => item.status === "insufficient")
      .map((item) => {
        const row = allRows(input).find((candidate) => candidate.id === item.rowId)!;
        return { rowId: item.rowId, message: rowErrorMessage(row, topicNames.get(row.topicId) ?? "Selected chapter", item.uniqueTextCount) };
      });
    if (independentErrors.length > 0) {
      return { success: false as const, error: "The blueprint cannot be filled yet.", rowErrors: independentErrors };
    }
    const assembled = assembleBlueprintSelections(allRows(input), pools);
    if (assembled.shortages.length > 0) {
      return {
        success: false as const,
        error: "Some rows compete for the same questions. Adjust the blueprint and try again.",
        rowErrors: assembled.shortages.map((shortage) => {
          const row = allRows(input).find((candidate) => candidate.id === shortage.rowId)!;
          return {
            rowId: shortage.rowId,
            message: rowErrorMessage(row, topicNames.get(row.topicId) ?? "Selected chapter", shortage.usableCount),
          };
        }),
      };
    }
    return { success: true as const, result: buildGenerationResult(input, scope, assembled.selected) };
  } catch (error: unknown) {
    return { success: false as const, error: error instanceof Error ? error.message : "Could not generate the paper.", rowErrors: [] as RowError[] };
  }
}

export async function validateBlueprintSelection(input: BlueprintPaperDraft, selections: BlueprintSelection[]) {
  try {
    await requireSuperAdmin();
    const error = validateDraft(input);
    if (error) return { success: false as const, error };
    const scope = await loadBlueprintScope(input);
    const invalidScope = scopeError(input, scope);
    if (invalidScope) return { success: false as const, error: invalidScope };
    const selectionByRow = new Map(selections.map((selection) => [selection.rowId, selection.questionIds]));
    if (selectionByRow.size !== allRows(input).length) return { success: false as const, error: "Every blueprint row needs one selection." };
    const questionById = new Map(scope.questions.map((question) => [question.id, question]));
    const selected = new Map<string, PaperBuilderQuestion[]>();
    for (const row of allRows(input)) {
      const ids = selectionByRow.get(row.id) ?? [];
      if (ids.length !== row.questionCount) return { success: false as const, error: `${row.sectionLabel} requires ${row.questionCount} questions but has ${ids.length}.` };
      const questions = ids.map((id) => questionById.get(id)).filter((question): question is PaperBuilderQuestion => Boolean(question));
      if (questions.length !== ids.length || questions.some((question) => !questionMatchesBlueprintRow(question, input.subjectId, row))) {
        return { success: false as const, error: `${row.sectionLabel} contains a question that no longer matches its exact chapter, type, marks, or difficulty.` };
      }
      selected.set(row.id, questions);
    }
    return { success: true as const, result: buildGenerationResult(input, scope, selected) };
  } catch (error: unknown) {
    return { success: false as const, error: error instanceof Error ? error.message : "Could not validate the selected questions." };
  }
}
