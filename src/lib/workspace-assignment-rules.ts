export const WORKSPACE_ASSIGNABLE_CHALLENGE_TYPES = [
  "WORKSHEET",
  "PDF_WORKSHEET",
  "QUICK_PRACTICE",
] as const;

export type WorkspaceAssignableChallengeType =
  (typeof WORKSPACE_ASSIGNABLE_CHALLENGE_TYPES)[number];

export function isWorkspaceAssignableChallengeType(
  value: string,
): value is WorkspaceAssignableChallengeType {
  return WORKSPACE_ASSIGNABLE_CHALLENGE_TYPES.some((type) => type === value);
}

export function normalizeDueDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("Choose a valid due date.");
  }

  const dueDate = new Date(`${value}T23:59:59.999Z`);
  if (Number.isNaN(dueDate.getTime()) || dueDate.toISOString().slice(0, 10) !== value) {
    throw new Error("Choose a valid due date.");
  }

  const today = new Date();
  const todayStart = Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate(),
  );
  if (dueDate.getTime() < todayStart) {
    throw new Error("Due date cannot be in the past.");
  }
  return dueDate;
}

export function formatAssignmentDueDate(value: Date | string) {
  return new Date(value).toLocaleDateString(undefined, { timeZone: "UTC" });
}

export function isAssignmentOverdue({
  dueDate,
  completed,
  now = new Date(),
}: {
  dueDate: Date | string | null;
  completed: boolean;
  now?: Date;
}) {
  return Boolean(dueDate && !completed && new Date(dueDate).getTime() < now.getTime());
}

export function summarizeAssignmentRecipients(
  recipients: Array<{ status: string; revokedAt: Date | string | null }>,
  dueDate: Date | string | null,
  now = new Date(),
) {
  const active = recipients.filter((recipient) => !recipient.revokedAt);
  const completed = active.filter((recipient) => recipient.status === "COMPLETED").length;
  const pending = active.length - completed;

  return {
    assigned: active.length,
    completed,
    pending,
    overdue: dueDate && new Date(dueDate).getTime() < now.getTime() ? pending : 0,
  };
}
