export const INTERACTIVE_CHALLENGE_TYPES = ["CHALLENGE", "QUICK_PRACTICE"] as const;

export type ChallengeAccessAction = "view" | "attempt" | "teacher_manage";

export type ChallengeAccessContext = {
  role: string;
  action: ChallengeAccessAction;
  isPublished: boolean;
  challengeType: string;
  workspaceId: string | null;
  ownsActiveWorkspace: boolean;
  hasExactAssignment: boolean;
  hasActiveWorkspaceMembership: boolean;
};

export type ChallengeAccessDecision = {
  allowed: boolean;
  reason:
    | "allowed"
    | "unsupported_role"
    | "unpublished"
    | "document_not_attemptable"
    | "teacher_workspace_mismatch"
    | "student_assignment_required"
    | "student_membership_required"
    | "admin_only";
};

export function isInteractiveChallengeType(type: string): boolean {
  return INTERACTIVE_CHALLENGE_TYPES.some((allowedType) => allowedType === type);
}

export function decideChallengeAccess(
  context: ChallengeAccessContext,
): ChallengeAccessDecision {
  const isSuperAdmin = context.role === "SUPER_ADMIN";
  const isTeacher = context.role === "TEACHER";
  const isStudent = context.role === "STUDENT";

  if (!isSuperAdmin && !isTeacher && !isStudent) {
    return { allowed: false, reason: "unsupported_role" };
  }

  if (context.action === "attempt") {
    if (!context.isPublished) return { allowed: false, reason: "unpublished" };
    if (!isInteractiveChallengeType(context.challengeType)) {
      return { allowed: false, reason: "document_not_attemptable" };
    }
  }

  if (isSuperAdmin) return { allowed: true, reason: "allowed" };

  if (context.action === "teacher_manage") {
    if (!isTeacher) return { allowed: false, reason: "admin_only" };
    return context.workspaceId && context.ownsActiveWorkspace
      ? { allowed: true, reason: "allowed" }
      : { allowed: false, reason: "teacher_workspace_mismatch" };
  }

  // Published global Vexa resources keep their existing authenticated access.
  if (!context.workspaceId) {
    return context.isPublished
      ? { allowed: true, reason: "allowed" }
      : { allowed: false, reason: "unpublished" };
  }

  if (isTeacher) {
    if (!context.ownsActiveWorkspace) {
      return { allowed: false, reason: "teacher_workspace_mismatch" };
    }
    if (context.action === "view" || context.isPublished) {
      return { allowed: true, reason: "allowed" };
    }
    return { allowed: false, reason: "unpublished" };
  }

  if (!context.isPublished) return { allowed: false, reason: "unpublished" };
  if (!context.hasExactAssignment) {
    return { allowed: false, reason: "student_assignment_required" };
  }
  if (!context.hasActiveWorkspaceMembership) {
    return { allowed: false, reason: "student_membership_required" };
  }

  return { allowed: true, reason: "allowed" };
}
