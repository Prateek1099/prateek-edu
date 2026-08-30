export type WorkspaceHeaderTemplateInput = {
  name: string;
  institutionName: string;
  examLabel: string;
  courseLine: string;
  defaultDuration: number;
  defaultInstructions: string;
  showStudentName: boolean;
  showRollNumber: boolean;
  defaultClassLine: string | null;
  defaultTopicLine: string | null;
};

function cleanText(
  value: unknown,
  label: string,
  maximum: number,
  required = true,
) {
  if (typeof value !== "string") throw new Error(`${label} is invalid.`);
  const normalized = value.trim().replace(/\s+/g, " ");
  if (required && !normalized) throw new Error(`${label} is required.`);
  if (normalized.length > maximum) {
    throw new Error(`${label} must be ${maximum} characters or fewer.`);
  }
  return normalized;
}

export function workspaceHeaderTemplateNameKey(value: unknown) {
  return cleanText(value, "Template name", 200)
    .normalize("NFKC")
    .toLowerCase();
}

export function validateWorkspaceHeaderTemplateInput(input: WorkspaceHeaderTemplateInput) {
  const defaultDuration = Number(input?.defaultDuration);
  if (!Number.isInteger(defaultDuration) || defaultDuration < 1 || defaultDuration > 300) {
    throw new Error("Default duration must be a whole number from 1 to 300 minutes.");
  }
  if (
    typeof input?.showStudentName !== "boolean" ||
    typeof input?.showRollNumber !== "boolean"
  ) {
    throw new Error("Student detail options are invalid.");
  }

  const name = cleanText(input?.name, "Template name", 200);
  return {
    name,
    nameKey: workspaceHeaderTemplateNameKey(name),
    institutionName: cleanText(input?.institutionName, "Institution name", 200),
    examLabel: cleanText(input?.examLabel, "Exam label", 200),
    courseLine: cleanText(input?.courseLine ?? "", "Course / class / board line", 500, false),
    defaultClassLine:
      cleanText(input?.defaultClassLine ?? "", "Class line", 200, false) || null,
    defaultTopicLine:
      cleanText(input?.defaultTopicLine ?? "", "Topic line", 1_000, false) || null,
    defaultDuration,
    defaultInstructions: cleanText(
      input?.defaultInstructions ?? "",
      "Instructions",
      3_000,
      false,
    ),
    showStudentName: input.showStudentName,
    showRollNumber: input.showRollNumber,
  };
}
