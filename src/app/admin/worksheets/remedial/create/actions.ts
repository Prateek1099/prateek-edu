"use server";

import { revalidatePath } from "next/cache";

import { requireSuperAdmin } from "@/lib/require-role";
import {
  generateRemedialWorksheetDraft,
  saveRemedialWorksheetDraft,
} from "@/lib/remedial-worksheets/service";
import type {
  RemedialDifficulty,
  RemedialSaveInput,
  RemedialScopeInput,
} from "@/lib/remedial-worksheets/types";

export async function generateRemedialWorksheetDraftAction(
  scope: RemedialScopeInput,
  difficulty: RemedialDifficulty,
  requestedCount: number,
) {
  await requireSuperAdmin();
  return generateRemedialWorksheetDraft(scope, difficulty, requestedCount);
}

export async function saveRemedialWorksheetDraftAction(input: RemedialSaveInput) {
  await requireSuperAdmin();
  const result = await saveRemedialWorksheetDraft(input);
  if (result.success) {
    revalidatePath("/admin/worksheets");
  }
  return result;
}
