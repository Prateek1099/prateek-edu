"use server";

import { BANK_QUESTION_TYPES } from "@/lib/bank-questions";
import { validatePaperBuilderSelectionForAccess } from "@/lib/paper-builder/validate-selection";
import type { PaperValidationInput } from "@/lib/paper-builder/types";
import { requireSuperAdmin } from "@/lib/require-role";

export async function validatePaperBuilderSelection(input: PaperValidationInput) {
  try {
    await requireSuperAdmin();
    return validatePaperBuilderSelectionForAccess(input, {
      allowedQuestionTypes: BANK_QUESTION_TYPES,
      questionScope: { kind: "global-only" },
    });
  } catch (error: unknown) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Paper validation failed.",
    };
  }
}
