"use server";

import type { PaperValidationInput } from "@/lib/paper-builder/types";
import { requireActiveWorkspace } from "@/lib/require-role";
import { validateTeacherPaperSelectionForWorkspace } from "@/lib/teacher-paper-builder-service";

export async function validateTeacherPaperBuilderSelection(input: PaperValidationInput) {
  try {
    const user = await requireActiveWorkspace();
    return validateTeacherPaperSelectionForWorkspace(user.workspaceId, input);
  } catch (error: unknown) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Paper validation failed.",
    };
  }
}
