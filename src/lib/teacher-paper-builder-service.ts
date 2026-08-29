import "server-only";

import { validatePaperBuilderSelectionForAccess } from "@/lib/paper-builder/validate-selection";
import type { PaperValidationInput } from "@/lib/paper-builder/types";
import {
  TEACHER_GLOBAL_PAPER_QUESTION_TYPES,
  TEACHER_WORKSPACE_PAPER_QUESTION_TYPES,
} from "@/lib/teacher-paper-builder-policy";
import {
  requireWorkspaceSubjectScope,
  requireWorkspaceTopicScope,
} from "@/lib/workspace-academic-scope";

export async function validateTeacherPaperSelectionForWorkspace(
  workspaceId: string,
  input: PaperValidationInput,
) {
  await requireWorkspaceSubjectScope(workspaceId, input?.subjectId);

  const topicIds = Array.isArray(input?.topicIds)
    ? input.topicIds.filter(
        (topicId): topicId is string => typeof topicId === "string" && Boolean(topicId),
      )
    : [];
  for (const topicId of new Set(topicIds)) {
    await requireWorkspaceTopicScope(workspaceId, input.subjectId, topicId);
  }

  return validatePaperBuilderSelectionForAccess(input, {
    allowedQuestionTypes: TEACHER_GLOBAL_PAPER_QUESTION_TYPES,
    questionScope: {
      kind: "workspace",
      workspaceId,
      workspaceOwnedQuestionTypes: TEACHER_WORKSPACE_PAPER_QUESTION_TYPES,
    },
  });
}
