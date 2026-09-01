import { calculateBlueprintPaperMarks } from "./blueprint-rules";
import type { BlueprintPaperDraft } from "./blueprint-types";
import { hasClientWorkspaceId, validateTeacherBlueprintDraft } from "./teacher-blueprint-rules";
import type { WorkspaceBlueprintTemplateInput } from "./workspace-blueprint-template-types";

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

export function workspaceBlueprintTemplateNameKey(value: unknown) {
  return cleanText(value, "Template name", 200)
    .normalize("NFKC")
    .toLowerCase();
}

export function validateWorkspaceBlueprintTemplateInput(
  input: WorkspaceBlueprintTemplateInput,
) {
  if (hasClientWorkspaceId(input) || hasClientWorkspaceId(input?.draft)) {
    throw new Error("Workspace access is derived from the signed-in teacher session.");
  }

  const draftError = validateTeacherBlueprintDraft(input?.draft);
  if (draftError) throw new Error(draftError);

  const name = cleanText(input?.name, "Template name", 200);
  const description = cleanText(input?.description ?? "", "Description", 1_000, false) || null;
  const preferredHeaderTemplateId = input?.preferredHeaderTemplateId
    ? cleanId(input.preferredHeaderTemplateId, "Preferred header template")
    : null;
  const draft = input.draft;
  const totalMarks = calculateBlueprintPaperMarks(draft.chapters);

  const chapters = draft.chapters.map((chapter, sortOrder) => ({
    topicId: cleanId(chapter.topicId, "Topic"),
    sortOrder,
    rows: chapter.rows.map((row, rowSortOrder) => ({
      sectionLabel: cleanText(row.sectionLabel, "Section label", 100),
      questionType: row.questionType,
      questionCount: row.questionCount,
      marksPerQuestion: row.marksPerQuestion,
      difficulty: row.difficulty,
      sortOrder: rowSortOrder,
    })),
  }));

  return {
    name,
    nameKey: workspaceBlueprintTemplateNameKey(name),
    description,
    version: 1,
    subjectId: draft.subjectId,
    boardId: draft.boardId,
    qualificationId: draft.qualificationId,
    targetMarks: totalMarks,
    preferredHeaderTemplateId,
    chapters,
  };
}

export function workspaceBlueprintTemplateDraft(
  template: {
    boardId: string;
    qualificationId: string;
    subjectId: string;
    totalMarks: number;
    chapters: Array<{
      topicId: string;
      topicName: string;
      sortOrder: number;
      rows: Array<{
        sectionLabel: string;
        questionType: BlueprintPaperDraft["chapters"][number]["rows"][number]["questionType"];
        questionCount: number;
        marksPerQuestion: number;
        difficulty: BlueprintPaperDraft["chapters"][number]["rows"][number]["difficulty"];
        sortOrder: number;
      }>;
    }>;
  },
  details: BlueprintPaperDraft["details"],
): BlueprintPaperDraft {
  return {
    version: 1,
    details,
    boardId: template.boardId,
    qualificationId: template.qualificationId,
    subjectId: template.subjectId,
    targetMarks: template.totalMarks,
    chapters: [...template.chapters]
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map((chapter) => ({
        id: `template-chapter-${chapter.sortOrder}`,
        topicId: chapter.topicId,
        topicName: chapter.topicName,
        sortOrder: chapter.sortOrder,
        rows: [...chapter.rows]
          .sort((left, right) => left.sortOrder - right.sortOrder)
          .map((row) => ({
            id: `template-row-${chapter.sortOrder}-${row.sortOrder}`,
            topicId: chapter.topicId,
            sectionLabel: row.sectionLabel,
            questionType: row.questionType,
            questionCount: row.questionCount,
            marksPerQuestion: row.marksPerQuestion,
            difficulty: row.difficulty,
          })),
      })),
  };
}

export function nextWorkspaceBlueprintTemplateCopyName(
  originalName: string,
  existingNames: Iterable<string>,
) {
  const normalizedNames = new Set(
    [...existingNames].map((name) => workspaceBlueprintTemplateNameKey(name)),
  );
  for (let copyNumber = 1; copyNumber <= 10_000; copyNumber += 1) {
    const prefix = "Copy of ";
    const suffix = copyNumber === 1 ? "" : ` ${copyNumber}`;
    const base = originalName.trim().slice(0, Math.max(1, 200 - prefix.length - suffix.length));
    const candidate = `${prefix}${base}${suffix}`;
    if (!normalizedNames.has(workspaceBlueprintTemplateNameKey(candidate))) return candidate;
  }
  throw new Error("Could not create a unique copy name. Rename an existing template and try again.");
}
