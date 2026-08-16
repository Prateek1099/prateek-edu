import { BANK_QUESTION_TYPES } from "@/lib/bank-questions";

import {
  calculateBlueprintPaperMarks,
  findIncompatibleBlueprintSectionLabels,
} from "./blueprint-rules";
import type {
  BlueprintChapterDraft,
} from "./blueprint-types";
import type {
  BlueprintTemplateChapterSnapshot,
  BlueprintTemplateSnapshot,
  CreateBlueprintTemplateInput,
} from "./blueprint-template-types";
import {
  PAPER_DIFFICULTIES,
  type PaperDetails,
} from "./types";

const allowedTypes = new Set<string>(BANK_QUESTION_TYPES);
const allowedDifficulties = new Set<string>(PAPER_DIFFICULTIES);

function cleanText(value: unknown, label: string, maxLength: number, required = true) {
  if (typeof value !== "string") throw new Error(`${label} is invalid.`);
  const normalized = value.trim();
  if (required && !normalized) throw new Error(`${label} is required.`);
  if (normalized.length > maxLength) throw new Error(`${label} must be ${maxLength} characters or fewer.`);
  return normalized;
}

function validateHeaderDefaults(details: PaperDetails): PaperDetails {
  const durationMinutes = Number(details?.durationMinutes);
  if (!Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > 300) {
    throw new Error("Header duration must be a whole number from 1 to 300 minutes.");
  }
  if (typeof details?.showStudentName !== "boolean" || typeof details?.showRollNumber !== "boolean") {
    throw new Error("Header student fields are invalid.");
  }
  return {
    institutionName: cleanText(details?.institutionName, "Institution name", 200),
    examLabel: cleanText(details?.examLabel, "Exam label", 200),
    title: cleanText(details?.title ?? "", "Title", 200, false),
    courseLine: cleanText(details?.courseLine ?? "", "Course line", 500, false),
    topicLine: cleanText(details?.topicLine ?? "", "Topic line", 1_000, false),
    durationMinutes,
    dateText: cleanText(details?.dateText ?? "", "Date", 200, false),
    classText: cleanText(details?.classText ?? "", "Class", 200, false),
    showStudentName: details.showStudentName,
    showRollNumber: details.showRollNumber,
    instructions: cleanText(details?.instructions ?? "", "Instructions", 3_000, false),
  };
}

export function validateBlueprintTemplateInput(input: CreateBlueprintTemplateInput) {
  const draft = input?.draft;
  if (draft?.version !== 1) throw new Error("This blueprint version is not supported.");

  const name = cleanText(input?.name, "Template name", 200);
  const description = cleanText(input?.description ?? "", "Description", 1_000, false) || null;
  if (typeof input?.includeHeaderDefaults !== "boolean") throw new Error("Header default selection is invalid.");
  if (!draft.boardId || !draft.qualificationId || !draft.subjectId) {
    throw new Error("Choose a board, qualification, and subject before saving.");
  }
  if (!Array.isArray(draft.chapters) || draft.chapters.length < 1 || draft.chapters.length > 30) {
    throw new Error("Choose between 1 and 30 chapters before saving.");
  }

  const topicIds = new Set<string>();
  let rowCount = 0;
  let questionCount = 0;
  const chapters = draft.chapters.map((chapter, chapterIndex) => {
    if (!chapter?.topicId || topicIds.has(chapter.topicId)) {
      throw new Error("Every saved blueprint chapter must be unique.");
    }
    topicIds.add(chapter.topicId);
    if (!Array.isArray(chapter.rows) || chapter.rows.length < 1) {
      throw new Error("Every saved chapter needs at least one blueprint row.");
    }
    return {
      topicId: chapter.topicId,
      sortOrder: chapterIndex,
      rows: chapter.rows.map((row, rowIndex) => {
        rowCount += 1;
        questionCount += Number(row?.questionCount) || 0;
        const sectionLabel = cleanText(row?.sectionLabel, "Section label", 100);
        if (row?.topicId !== chapter.topicId) throw new Error(`${sectionLabel} is attached to the wrong chapter.`);
        if (!allowedTypes.has(row?.questionType)) throw new Error(`Choose a valid question type for ${sectionLabel}.`);
        if (!allowedDifficulties.has(row?.difficulty)) throw new Error(`Choose a valid difficulty for ${sectionLabel}.`);
        if (!Number.isInteger(row?.questionCount) || row.questionCount < 1 || row.questionCount > 100) {
          throw new Error(`${sectionLabel} needs 1 to 100 questions.`);
        }
        if (!Number.isInteger(row?.marksPerQuestion) || row.marksPerQuestion < 1 || row.marksPerQuestion > 100) {
          throw new Error(`${sectionLabel} needs 1 to 100 marks per question.`);
        }
        return {
          sectionLabel,
          questionType: row.questionType,
          questionCount: row.questionCount,
          marksPerQuestion: row.marksPerQuestion,
          difficulty: row.difficulty,
          sortOrder: rowIndex,
        };
      }),
    };
  });

  if (rowCount > 50) throw new Error("A saved blueprint can contain at most 50 rows.");
  if (questionCount > 200) throw new Error("A saved blueprint can contain at most 200 questions.");
  const labelError = findIncompatibleBlueprintSectionLabels(draft.chapters);
  if (labelError) throw new Error(labelError);

  const totalMarks = calculateBlueprintPaperMarks(draft.chapters);
  if (!Number.isInteger(totalMarks) || totalMarks < 1 || totalMarks > 10_000) {
    throw new Error("Calculated blueprint marks must be between 1 and 10,000.");
  }
  if (draft.targetMarks !== null && draft.targetMarks !== totalMarks) {
    throw new Error(`The blueprint totals ${totalMarks} marks, but the target is ${draft.targetMarks}.`);
  }

  return {
    name,
    description,
    boardId: draft.boardId,
    qualificationId: draft.qualificationId,
    subjectId: draft.subjectId,
    totalMarks,
    includeHeaderDefaults: input.includeHeaderDefaults,
    headerDefaults: input.includeHeaderDefaults ? validateHeaderDefaults(draft.details) : null,
    chapters,
  };
}

export function applyBlueprintTemplateSnapshot(
  template: BlueprintTemplateSnapshot,
  idFactory: (prefix: string) => string,
): BlueprintChapterDraft[] {
  return [...template.chapters]
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .map((chapter) => ({
      id: idFactory("blueprint-chapter"),
      topicId: chapter.topicId,
      topicName: chapter.topicName,
      sortOrder: chapter.sortOrder,
      rows: [...chapter.rows]
        .sort((left, right) => left.sortOrder - right.sortOrder)
        .map((row) => ({
          id: idFactory("blueprint-row"),
          topicId: chapter.topicId,
          sectionLabel: row.sectionLabel,
          questionType: row.questionType,
          questionCount: row.questionCount,
          marksPerQuestion: row.marksPerQuestion,
          difficulty: row.difficulty,
        })),
    }));
}

export function calculateTemplateSnapshotMarks(chapters: BlueprintTemplateChapterSnapshot[]) {
  return chapters.reduce(
    (paperTotal, chapter) => paperTotal + chapter.rows.reduce(
      (chapterTotal, row) => chapterTotal + row.questionCount * row.marksPerQuestion,
      0,
    ),
    0,
  );
}
