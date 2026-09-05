export type PracticeSetSegment = "all" | "unassigned" | "assigned";

export type PracticeSetAssignmentContext = {
  classId: string;
  className: string;
  recipientCount: number;
};

export type PracticeSetWorklistItem = {
  id: string;
  title: string;
  subjectId: string;
  topicId: string | null;
  difficulty: string;
  assignedRecipientCount: number;
  assignmentContexts: PracticeSetAssignmentContext[];
  subject: { name: string };
  topic: { topicName: string } | null;
};

export type PracticeSetFilters = {
  segment: PracticeSetSegment;
  searchQuery: string;
  classId: string;
  subjectId: string;
  topicId: string;
  difficulty: string;
};

export function countPracticeSetAssignmentUsage({
  validLegacyAssignmentCount,
  assignmentContexts,
}: {
  validLegacyAssignmentCount: number;
  assignmentContexts: PracticeSetAssignmentContext[];
}) {
  return (
    validLegacyAssignmentCount +
    assignmentContexts.reduce((total, context) => total + context.recipientCount, 0)
  );
}

export function isPracticeSetAssigned(item: PracticeSetWorklistItem) {
  return item.assignedRecipientCount > 0;
}

export function filterPracticeSets<T extends PracticeSetWorklistItem>(
  items: T[],
  filters: PracticeSetFilters,
) {
  const query = filters.searchQuery.trim().toLocaleLowerCase("en");

  return items.filter((item) => {
    const assigned = isPracticeSetAssigned(item);
    if (filters.segment === "assigned" && !assigned) return false;
    if (filters.segment === "unassigned" && assigned) return false;
    if (
      filters.classId !== "all" &&
      !item.assignmentContexts.some((context) => context.classId === filters.classId)
    ) {
      return false;
    }
    if (filters.subjectId !== "all" && item.subjectId !== filters.subjectId) return false;
    if (filters.topicId !== "all" && item.topicId !== filters.topicId) return false;
    if (
      filters.difficulty !== "all" &&
      item.difficulty.toLocaleLowerCase("en") !== filters.difficulty
    ) {
      return false;
    }
    if (!query) return true;

    return [
      item.title,
      item.subject.name,
      item.topic?.topicName,
      ...item.assignmentContexts.map((context) => context.className),
    ].some((value) => value?.toLocaleLowerCase("en").includes(query));
  });
}

export type AssignmentWorklistStatus =
  | "PENDING"
  | "COMPLETED"
  | "MARKED_DONE"
  | "OVERDUE";

export type StudentAssignmentWorklistItem = {
  id: string;
  createdAt: Date | string;
  dueDate: Date | string | null;
  recipient: {
    status: AssignmentWorklistStatus;
    attemptCount: number;
    mistakesCount: number;
    latestAttemptAt: Date | string | null;
    completedAt: Date | string | null;
  };
};

export type StudentAssignmentGroup = "needsAttention" | "inProgress" | "completed";

function isCompletedStatus(status: AssignmentWorklistStatus) {
  return status === "COMPLETED" || status === "MARKED_DONE";
}

export function getStudentAssignmentGroup(
  assignment: StudentAssignmentWorklistItem,
): StudentAssignmentGroup {
  if (
    assignment.recipient.status === "OVERDUE" ||
    (isCompletedStatus(assignment.recipient.status) && assignment.recipient.mistakesCount > 0)
  ) {
    return "needsAttention";
  }
  if (isCompletedStatus(assignment.recipient.status)) return "completed";
  return "inProgress";
}

function time(value: Date | string | null | undefined, fallback: number) {
  if (!value) return fallback;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function groupStudentAssignments<T extends StudentAssignmentWorklistItem>(items: T[]) {
  const groups: Record<StudentAssignmentGroup, T[]> = {
    needsAttention: [],
    inProgress: [],
    completed: [],
  };

  for (const item of items) groups[getStudentAssignmentGroup(item)].push(item);

  groups.needsAttention.sort((left, right) => {
    const overdueDifference =
      Number(right.recipient.status === "OVERDUE") -
      Number(left.recipient.status === "OVERDUE");
    if (overdueDifference) return overdueDifference;
    const dueDifference = time(left.dueDate, Number.POSITIVE_INFINITY) - time(right.dueDate, Number.POSITIVE_INFINITY);
    if (dueDifference) return dueDifference;
    return time(right.recipient.latestAttemptAt, time(right.createdAt, 0)) -
      time(left.recipient.latestAttemptAt, time(left.createdAt, 0));
  });

  groups.inProgress.sort((left, right) => {
    const dueDifference = time(left.dueDate, Number.POSITIVE_INFINITY) - time(right.dueDate, Number.POSITIVE_INFINITY);
    if (dueDifference) return dueDifference;
    return time(right.createdAt, 0) - time(left.createdAt, 0);
  });

  groups.completed.sort(
    (left, right) =>
      time(right.recipient.completedAt, time(right.recipient.latestAttemptAt, time(right.createdAt, 0))) -
      time(left.recipient.completedAt, time(left.recipient.latestAttemptAt, time(left.createdAt, 0))),
  );

  return groups;
}

export type AssignmentRecipientWorklistItem = {
  id: string;
  status: AssignmentWorklistStatus;
  attemptCount: number;
  mistakesCount: number;
  latestAttemptAt: Date | string | null;
  completedAt: Date | string | null;
  student: { name: string | null; email: string | null };
};

export type AssignmentRecipientGroup = "needsAttention" | "pending" | "completed";

export function getAssignmentRecipientGroup(
  recipient: AssignmentRecipientWorklistItem,
): AssignmentRecipientGroup {
  if (
    recipient.status === "OVERDUE" ||
    (isCompletedStatus(recipient.status) && recipient.mistakesCount > 0)
  ) {
    return "needsAttention";
  }
  if (isCompletedStatus(recipient.status)) return "completed";
  return "pending";
}

export function groupAssignmentRecipients<T extends AssignmentRecipientWorklistItem>(items: T[]) {
  const groups: Record<AssignmentRecipientGroup, T[]> = {
    needsAttention: [],
    pending: [],
    completed: [],
  };

  for (const item of items) groups[getAssignmentRecipientGroup(item)].push(item);

  groups.needsAttention.sort((left, right) => {
    const overdueDifference = Number(right.status === "OVERDUE") - Number(left.status === "OVERDUE");
    if (overdueDifference) return overdueDifference;
    if (right.mistakesCount !== left.mistakesCount) return right.mistakesCount - left.mistakesCount;
    return time(right.latestAttemptAt, 0) - time(left.latestAttemptAt, 0);
  });
  groups.pending.sort((left, right) =>
    (left.student.name || left.student.email || "").localeCompare(
      right.student.name || right.student.email || "",
    ),
  );
  groups.completed.sort(
    (left, right) =>
      time(right.completedAt, time(right.latestAttemptAt, 0)) -
      time(left.completedAt, time(left.latestAttemptAt, 0)),
  );

  return groups;
}
