export const WORKSPACE_SCOPE_NOT_CONFIGURED =
  "Your academic access has not been configured yet. Please contact the administrator.";

export type ScopeDependencyCounts = {
  activeClasses: number;
  publishedChallenges: number;
  publishedWorkspaceContent: number;
  activeAssignmentBatches: number;
};

export function scopeDependencyTotal(counts: ScopeDependencyCounts) {
  return (
    counts.activeClasses +
    counts.publishedChallenges +
    counts.publishedWorkspaceContent +
    counts.activeAssignmentBatches
  );
}

export function scopeDeactivationError(counts: ScopeDependencyCounts): string | null {
  if (scopeDependencyTotal(counts) === 0) return null;

  const parts = [
    counts.activeClasses ? `${counts.activeClasses} active class${counts.activeClasses === 1 ? "" : "es"}` : null,
    counts.publishedChallenges
      ? `${counts.publishedChallenges} published workspace item${counts.publishedChallenges === 1 ? "" : "s"}`
      : null,
    counts.publishedWorkspaceContent
      ? `${counts.publishedWorkspaceContent} published content item${counts.publishedWorkspaceContent === 1 ? "" : "s"}`
      : null,
    counts.activeAssignmentBatches
      ? `${counts.activeAssignmentBatches} active assignment batch${counts.activeAssignmentBatches === 1 ? "" : "es"}`
      : null,
  ].filter(Boolean);

  return `This scope cannot be deactivated because it has ${parts.join(", ")}. Archive or cancel those dependencies first.`;
}

export function validateScopeSelection(input: {
  boardId: string;
  qualificationId: string;
  subjectId: string;
}) {
  if (!input.boardId.trim()) return "Choose a board.";
  if (!input.qualificationId.trim()) return "Choose a qualification or class.";
  if (!input.subjectId.trim()) return "Choose a subject.";
  return null;
}
