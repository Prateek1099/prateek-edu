import { TEACHER_GLOBAL_PAPER_QUESTION_TYPES } from "../teacher-paper-builder-policy";

import type { PaperPatternRow } from "./types";
import type {
  WorkspacePaperTemplateInput,
  WorkspacePaperTemplateRowSnapshot,
} from "./workspace-paper-template-types";

const allowedQuestionTypes = new Set<string>(TEACHER_GLOBAL_PAPER_QUESTION_TYPES);
const allowedDifficulties = new Set<string>(["any", "easy", "medium", "hard"]);

function cleanText(value: unknown, label: string, maxLength: number, required = true) {
  if (typeof value !== "string") throw new Error(`${label} is invalid.`);
  const normalized = value.trim().replace(/\s+/g, " ");
  if (required && !normalized) throw new Error(`${label} is required.`);
  if (normalized.length > maxLength) {
    throw new Error(`${label} must be ${maxLength} characters or fewer.`);
  }
  return normalized;
}

function cleanId(value: unknown, label: string) {
  return cleanText(value, label, 200);
}

export function workspacePaperTemplateNameKey(value: unknown) {
  return cleanText(value, "Template name", 200)
    .normalize("NFKC")
    .toLowerCase();
}

export function calculateWorkspacePaperTemplateMarks(
  rows: Array<{ questionCount: number; marksPerQuestion: number }>,
) {
  return rows.reduce(
    (total, row) => total + row.questionCount * row.marksPerQuestion,
    0,
  );
}

export function validateWorkspacePaperTemplateInput(input: WorkspacePaperTemplateInput) {
  const name = cleanText(input?.name, "Template name", 200);
  const description = cleanText(input?.description ?? "", "Description", 1_000, false) || null;
  const subjectId = cleanId(input?.subjectId, "Subject");

  if (!Array.isArray(input?.topicIds) || input.topicIds.length < 1 || input.topicIds.length > 30) {
    throw new Error("Choose between 1 and 30 topics before saving a paper template.");
  }
  const topicIds = input.topicIds.map((topicId) => cleanId(topicId, "Topic"));
  if (new Set(topicIds).size !== topicIds.length) {
    throw new Error("Every saved paper-template topic must be unique.");
  }

  if (!Array.isArray(input?.rows) || input.rows.length < 1 || input.rows.length > 50) {
    throw new Error("Choose between 1 and 50 paper sections before saving a template.");
  }
  let totalQuestions = 0;
  const rows = input.rows.map((row, sortOrder) => {
    const sectionLabel = cleanText(row?.sectionLabel, "Section label", 100);
    if (!allowedQuestionTypes.has(row?.questionType)) {
      throw new Error(`Choose a valid question type for ${sectionLabel}.`);
    }
    if (!allowedDifficulties.has(row?.difficulty)) {
      throw new Error(`Choose a valid difficulty for ${sectionLabel}.`);
    }
    if (!Number.isInteger(row?.questionCount) || row.questionCount < 1 || row.questionCount > 100) {
      throw new Error(`${sectionLabel} needs 1 to 100 questions.`);
    }
    if (
      !Number.isInteger(row?.marksPerQuestion) ||
      row.marksPerQuestion < 1 ||
      row.marksPerQuestion > 100
    ) {
      throw new Error(`${sectionLabel} needs 1 to 100 marks per question.`);
    }
    totalQuestions += row.questionCount;
    return {
      sectionLabel,
      questionType: row.questionType,
      questionCount: row.questionCount,
      marksPerQuestion: row.marksPerQuestion,
      difficulty: row.difficulty,
      sortOrder,
    };
  });
  if (totalQuestions > 200) {
    throw new Error("A saved paper template can contain at most 200 questions.");
  }

  const targetMarks = Number(input?.targetMarks);
  const calculatedMarks = calculateWorkspacePaperTemplateMarks(rows);
  if (!Number.isInteger(calculatedMarks) || calculatedMarks < 1 || calculatedMarks > 10_000) {
    throw new Error("Calculated template marks must be between 1 and 10,000.");
  }
  if (!Number.isInteger(targetMarks) || targetMarks !== calculatedMarks) {
    throw new Error(`The template totals ${calculatedMarks} marks, but the target is ${targetMarks}.`);
  }

  const preferredHeaderTemplateId = input?.preferredHeaderTemplateId === null ||
      input?.preferredHeaderTemplateId === undefined ||
      input?.preferredHeaderTemplateId === ""
    ? null
    : cleanId(input.preferredHeaderTemplateId, "Preferred header template");

  return {
    name,
    nameKey: workspacePaperTemplateNameKey(name),
    description,
    version: 1,
    subjectId,
    topicIds,
    rows,
    targetMarks: calculatedMarks,
    preferredHeaderTemplateId,
  };
}

export function workspacePaperTemplateRowsToPatterns(
  rows: WorkspacePaperTemplateRowSnapshot[],
  idFactory: (sortOrder: number) => string,
): PaperPatternRow[] {
  return [...rows]
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .map((row) => ({
      id: idFactory(row.sortOrder),
      label: row.sectionLabel,
      questionType: row.questionType,
      questionCount: row.questionCount,
      marksPerQuestion: row.marksPerQuestion,
      difficulty: row.difficulty,
    }));
}

export function nextWorkspacePaperTemplateCopyName(
  originalName: string,
  existingNames: Iterable<string>,
) {
  const normalizedNames = new Set(
    [...existingNames].map((name) => workspacePaperTemplateNameKey(name)),
  );
  for (let copyNumber = 1; copyNumber <= 10_000; copyNumber += 1) {
    const suffix = copyNumber === 1 ? " Copy" : ` Copy ${copyNumber}`;
    const base = originalName.trim().slice(0, Math.max(1, 200 - suffix.length)).trimEnd();
    const candidate = `${base}${suffix}`;
    if (!normalizedNames.has(workspacePaperTemplateNameKey(candidate))) return candidate;
  }
  throw new Error("Could not create a unique copy name. Rename an existing template and try again.");
}
