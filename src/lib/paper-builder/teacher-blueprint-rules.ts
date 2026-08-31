import {
  calculateBlueprintPaperMarks,
  findIncompatibleBlueprintSectionLabels,
  questionMatchesBlueprintRow,
  uniqueBlueprintCandidates,
} from "./blueprint-rules";
import type {
  BlueprintAvailability,
  BlueprintPaperDraft,
  BlueprintRowDraft,
} from "./blueprint-types";
import { normalizeQuestionText } from "./rules";
import {
  PAPER_DIFFICULTIES,
  type PaperBuilderQuestion,
  type PaperDetails,
} from "./types";
import { TEACHER_GLOBAL_PAPER_QUESTION_TYPES } from "../teacher-paper-builder-policy";

export const TEACHER_BLUEPRINT_LIMITS = {
  topics: 20,
  rows: 40,
  questions: 150,
  marks: 1_000,
} as const;

const allowedTypes = new Set<string>(TEACHER_GLOBAL_PAPER_QUESTION_TYPES);
const allowedDifficulties = new Set<string>(PAPER_DIFFICULTIES);

export function cleanTeacherBlueprintText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export function cleanTeacherBlueprintDetails(details: PaperDetails): PaperDetails | null {
  const durationMinutes = details?.durationMinutes;
  const institutionName = cleanTeacherBlueprintText(details?.institutionName, 200);
  const examLabel = cleanTeacherBlueprintText(details?.examLabel, 200);
  if (!institutionName || !examLabel) return null;
  if (!Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > 300) {
    return null;
  }
  if (
    typeof details?.showStudentName !== "boolean" ||
    typeof details?.showRollNumber !== "boolean"
  ) {
    return null;
  }
  return {
    institutionName,
    examLabel,
    title: cleanTeacherBlueprintText(details.title, 200),
    courseLine: cleanTeacherBlueprintText(details.courseLine, 500),
    topicLine: cleanTeacherBlueprintText(details.topicLine, 1_000),
    durationMinutes,
    dateText: cleanTeacherBlueprintText(details.dateText, 200),
    classText: cleanTeacherBlueprintText(details.classText, 200),
    showStudentName: details.showStudentName,
    showRollNumber: details.showRollNumber,
    instructions: cleanTeacherBlueprintText(details.instructions, 3_000),
  };
}

export function hasClientWorkspaceId(value: unknown) {
  return Boolean(
    value &&
      typeof value === "object" &&
      Object.prototype.hasOwnProperty.call(value, "workspaceId"),
  );
}

export function validateTeacherBlueprintDraft(input: BlueprintPaperDraft) {
  if (hasClientWorkspaceId(input)) {
    return "Workspace access is derived from the signed-in teacher session.";
  }
  if (input?.version !== 1) return "This blueprint version is not supported.";
  if (!cleanTeacherBlueprintDetails(input.details)) {
    return "Complete the institution, exam label, and valid duration.";
  }
  if (typeof input.boardId !== "string" || !input.boardId) return "Choose a board.";
  if (typeof input.qualificationId !== "string" || !input.qualificationId) {
    return "Choose a qualification or class.";
  }
  if (typeof input.subjectId !== "string" || !input.subjectId) return "Choose a subject.";
  if (
    input.targetMarks !== null &&
    (!Number.isInteger(input.targetMarks) ||
      input.targetMarks < 1 ||
      input.targetMarks > TEACHER_BLUEPRINT_LIMITS.marks)
  ) {
    return `Target marks must be between 1 and ${TEACHER_BLUEPRINT_LIMITS.marks}, or left blank.`;
  }
  if (
    !Array.isArray(input.chapters) ||
    input.chapters.length < 1 ||
    input.chapters.length > TEACHER_BLUEPRINT_LIMITS.topics
  ) {
    return `Choose between 1 and ${TEACHER_BLUEPRINT_LIMITS.topics} chapters.`;
  }

  const chapterIds = new Set<string>();
  const topicIds = new Set<string>();
  const rowIds = new Set<string>();
  let rowCount = 0;
  let questionCount = 0;

  for (const chapter of input.chapters) {
    if (
      typeof chapter?.id !== "string" ||
      !chapter.id ||
      chapterIds.has(chapter.id) ||
      typeof chapter.topicId !== "string" ||
      !chapter.topicId ||
      topicIds.has(chapter.topicId)
    ) {
      return "Every selected chapter must be unique.";
    }
    chapterIds.add(chapter.id);
    topicIds.add(chapter.topicId);
    if (!Array.isArray(chapter.rows) || chapter.rows.length < 1) {
      return `${cleanTeacherBlueprintText(chapter.topicName, 200) || "Each chapter"} needs at least one blueprint row.`;
    }

    for (const row of chapter.rows) {
      rowCount += 1;
      if (
        typeof row?.id !== "string" ||
        !row.id ||
        rowIds.has(row.id)
      ) {
        return "Every blueprint row must have a unique identifier.";
      }
      rowIds.add(row.id);
      if (row.topicId !== chapter.topicId) {
        return "A blueprint row is attached to the wrong chapter.";
      }
      const sectionLabel = cleanTeacherBlueprintText(row.sectionLabel, 100);
      if (!sectionLabel) return "Every blueprint row needs a section label.";
      if (!allowedTypes.has(row.questionType)) {
        return `Choose a supported question type for ${sectionLabel}.`;
      }
      if (!allowedDifficulties.has(row.difficulty)) {
        return `Choose a valid difficulty for ${sectionLabel}.`;
      }
      if (
        !Number.isInteger(row.questionCount) ||
        row.questionCount < 1 ||
        row.questionCount > 100
      ) {
        return `${sectionLabel} needs 1 to 100 questions.`;
      }
      if (
        !Number.isInteger(row.marksPerQuestion) ||
        row.marksPerQuestion < 1 ||
        row.marksPerQuestion > 100
      ) {
        return `${sectionLabel} needs positive whole-number marks.`;
      }
      questionCount += row.questionCount;
    }
  }

  if (rowCount > TEACHER_BLUEPRINT_LIMITS.rows) {
    return `A teacher blueprint can contain at most ${TEACHER_BLUEPRINT_LIMITS.rows} rows.`;
  }
  if (questionCount > TEACHER_BLUEPRINT_LIMITS.questions) {
    return `A teacher blueprint can contain at most ${TEACHER_BLUEPRINT_LIMITS.questions} questions.`;
  }

  const labelError = findIncompatibleBlueprintSectionLabels(input.chapters);
  if (labelError) return labelError;

  const totalMarks = calculateBlueprintPaperMarks(input.chapters);
  if (totalMarks < 1 || totalMarks > TEACHER_BLUEPRINT_LIMITS.marks) {
    return `Calculated paper marks must be between 1 and ${TEACHER_BLUEPRINT_LIMITS.marks}.`;
  }
  if (input.targetMarks !== null && totalMarks !== input.targetMarks) {
    return `The blueprint totals ${totalMarks} marks, but the target is ${input.targetMarks}.`;
  }
  return null;
}

export function teacherBlueprintRows(input: BlueprintPaperDraft) {
  return input.chapters.flatMap((chapter) => chapter.rows);
}

export function reviewTeacherBlueprintQuestionAvailability(
  input: BlueprintPaperDraft,
  questions: PaperBuilderQuestion[],
) {
  const rows = teacherBlueprintRows(input);
  const pools = new Map<string, PaperBuilderQuestion[]>();
  const textOwners = new Map<string, Set<string>>();

  for (const row of rows) {
    const pool = uniqueBlueprintCandidates(questions, input.subjectId, row);
    pools.set(row.id, pool);
    for (const question of pool) {
      const normalized = normalizeQuestionText(question.questionText);
      const owners = textOwners.get(normalized) ?? new Set<string>();
      owners.add(row.id);
      textOwners.set(normalized, owners);
    }
  }

  const availability: BlueprintAvailability[] = rows.map((row) => {
    const matchingCount = questions.filter((question) =>
      questionMatchesBlueprintRow(question, input.subjectId, row),
    ).length;
    const uniqueTextCount = pools.get(row.id)?.length ?? 0;
    const reserve = uniqueTextCount - row.questionCount;
    const warnings: string[] = [];
    const errors: string[] = [];
    const overlapping = (pools.get(row.id) ?? []).filter(
      (question) =>
        (textOwners.get(normalizeQuestionText(question.questionText))?.size ?? 0) > 1,
    ).length;
    if (overlapping > 0) {
      warnings.push(
        `${overlapping} candidate${overlapping === 1 ? "" : "s"} overlap with another row.`,
      );
    }
    if (uniqueTextCount < row.questionCount) {
      errors.push(teacherBlueprintShortageMessage(row, "Selected chapter", uniqueTextCount));
    } else if (reserve < Math.max(2, Math.ceil(row.questionCount * 0.25))) {
      warnings.push("Low replacement reserve after generation.");
    }
    return {
      rowId: row.id,
      requiredCount: row.questionCount,
      matchingCount,
      uniqueTextCount,
      usableCount: uniqueTextCount,
      status:
        errors.length > 0
          ? "insufficient"
          : warnings.length > 0
            ? "low_reserve"
            : "ready",
      warnings,
      errors,
    };
  });

  return { availability, pools };
}

export function teacherBlueprintShortageMessage(
  row: BlueprintRowDraft,
  topicName: string,
  available: number,
) {
  return `Only ${available} unique matching questions are available for ${topicName} · ${row.questionType} · ${row.marksPerQuestion} marks, but ${row.questionCount} are required.`;
}
