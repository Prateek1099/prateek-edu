"use server";

import { validatePaperBuilderSelectionForAccess } from "@/lib/paper-builder/validate-selection";
import type { PaperValidationInput } from "@/lib/paper-builder/types";
import { requireActiveWorkspace } from "@/lib/require-role";
import {
  TEACHER_GLOBAL_PAPER_QUESTION_TYPES,
  TEACHER_WORKSPACE_PAPER_QUESTION_TYPES,
} from "@/lib/teacher-paper-builder-policy";
import {
  requireWorkspaceSubjectScope,
  requireWorkspaceTopicScope,
} from "@/lib/workspace-academic-scope";

export async function validateTeacherPaperBuilderSelection(input: PaperValidationInput) {
  try {
    const user = await requireActiveWorkspace();
    await requireWorkspaceSubjectScope(user.workspaceId, input?.subjectId);

    const topicIds = Array.isArray(input?.topicIds)
      ? input.topicIds.filter(
          (topicId): topicId is string => typeof topicId === "string" && Boolean(topicId),
        )
      : [];
    for (const topicId of new Set(topicIds)) {
      await requireWorkspaceTopicScope(user.workspaceId, input.subjectId, topicId);
    }

    return validatePaperBuilderSelectionForAccess(input, {
      allowedQuestionTypes: TEACHER_GLOBAL_PAPER_QUESTION_TYPES,
      questionScope: {
        kind: "workspace",
        workspaceId: user.workspaceId,
        workspaceOwnedQuestionTypes: TEACHER_WORKSPACE_PAPER_QUESTION_TYPES,
      },
    });
  } catch (error: unknown) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Paper validation failed.",
    };
  }
}
