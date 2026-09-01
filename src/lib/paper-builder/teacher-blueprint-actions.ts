"use server";

import { revalidatePath } from "next/cache";

import type {
  BlueprintPaperDraft,
  BlueprintSelection,
} from "@/lib/paper-builder/blueprint-types";
import type { SaveGeneratedPaperInput } from "@/lib/paper-builder/saved-paper-types";
import {
  generateTeacherBlueprintPaperForWorkspace,
  getTeacherBlueprintReplacementCandidatesForWorkspace,
  regenerateTeacherBlueprintRowForWorkspace,
  regenerateTeacherBlueprintTopicForWorkspace,
  replaceTeacherBlueprintQuestionForWorkspace,
  reviewTeacherBlueprintAvailabilityForWorkspace,
  saveTeacherBlueprintGeneratedPaperForWorkspace,
  validateTeacherBlueprintSelectionForWorkspace,
} from "@/lib/paper-builder/teacher-blueprint-service";
import { requireActiveWorkspace } from "@/lib/require-role";

export async function reviewTeacherBlueprintAvailability(input: BlueprintPaperDraft) {
  try {
    const teacher = await requireActiveWorkspace();
    return await reviewTeacherBlueprintAvailabilityForWorkspace(teacher.workspaceId, input);
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Could not review teacher blueprint availability.",
    };
  }
}

export async function generateTeacherBlueprintPaper(input: BlueprintPaperDraft) {
  try {
    const teacher = await requireActiveWorkspace();
    return await generateTeacherBlueprintPaperForWorkspace(teacher.workspaceId, input);
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Could not generate the teacher blueprint paper.",
      rowErrors: [] as Array<{ rowId: string; message: string }>,
    };
  }
}

export async function getTeacherBlueprintReplacementCandidates(
  input: BlueprintPaperDraft,
  selections: BlueprintSelection[],
  rowId: string,
  replaceQuestionId?: string,
) {
  try {
    const teacher = await requireActiveWorkspace();
    return await getTeacherBlueprintReplacementCandidatesForWorkspace(
      teacher.workspaceId,
      input,
      selections,
      rowId,
      replaceQuestionId,
    );
  } catch (error) {
    return {
      success: false as const,
      error:
        error instanceof Error
          ? error.message
          : "Could not load teacher blueprint replacement candidates.",
    };
  }
}

export async function replaceTeacherBlueprintQuestion(
  input: BlueprintPaperDraft,
  selections: BlueprintSelection[],
  rowId: string,
  candidateId: string,
  replaceQuestionId?: string,
) {
  try {
    const teacher = await requireActiveWorkspace();
    return await replaceTeacherBlueprintQuestionForWorkspace(
      teacher.workspaceId,
      input,
      selections,
      rowId,
      candidateId,
      replaceQuestionId,
    );
  } catch (error) {
    return {
      success: false as const,
      error:
        error instanceof Error
          ? error.message
          : "Could not replace this teacher blueprint question.",
    };
  }
}

export async function regenerateTeacherBlueprintRow(
  input: BlueprintPaperDraft,
  selections: BlueprintSelection[],
  rowId: string,
) {
  try {
    const teacher = await requireActiveWorkspace();
    return await regenerateTeacherBlueprintRowForWorkspace(
      teacher.workspaceId,
      input,
      selections,
      rowId,
    );
  } catch (error) {
    return {
      success: false as const,
      error:
        error instanceof Error
          ? error.message
          : "Could not regenerate this teacher blueprint row.",
    };
  }
}

export async function regenerateTeacherBlueprintTopic(
  input: BlueprintPaperDraft,
  selections: BlueprintSelection[],
  topicOrChapterId: string,
) {
  try {
    const teacher = await requireActiveWorkspace();
    return await regenerateTeacherBlueprintTopicForWorkspace(
      teacher.workspaceId,
      input,
      selections,
      topicOrChapterId,
    );
  } catch (error) {
    return {
      success: false as const,
      error:
        error instanceof Error
          ? error.message
          : "Could not regenerate this teacher blueprint topic.",
      rowErrors: [] as Array<{ rowId: string; message: string }>,
    };
  }
}

export async function validateTeacherBlueprintSelection(
  input: BlueprintPaperDraft,
  selections: BlueprintSelection[],
) {
  try {
    const teacher = await requireActiveWorkspace();
    return await validateTeacherBlueprintSelectionForWorkspace(
      teacher.workspaceId,
      input,
      selections,
    );
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Could not validate the teacher blueprint paper.",
    };
  }
}

export async function saveTeacherBlueprintGeneratedPaper(input: SaveGeneratedPaperInput) {
  try {
    const teacher = await requireActiveWorkspace();
    const result = await saveTeacherBlueprintGeneratedPaperForWorkspace(
      { id: teacher.id, workspaceId: teacher.workspaceId },
      input,
    );
    if (result.success) {
      revalidatePath("/workspace/paper-builder/archive");
      revalidatePath(`/workspace/paper-builder/archive/${result.id}`);
    }
    return result;
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Could not save the teacher blueprint paper.",
    };
  }
}
