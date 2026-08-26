export type StudentClassAssignmentState = "PENDING" | "COMPLETED" | "OVERDUE";

export function getStudentClassAssignmentState(
  assignment: { status: string; dueDate: Date | string | null },
  now = new Date(),
): StudentClassAssignmentState {
  if (assignment.status === "COMPLETED") return "COMPLETED";
  if (assignment.dueDate && new Date(assignment.dueDate).getTime() < now.getTime()) {
    return "OVERDUE";
  }
  return "PENDING";
}

export function summarizeStudentClassAssignments(
  assignments: Array<{ status: string; dueDate: Date | string | null }>,
  now = new Date(),
) {
  return assignments.reduce(
    (summary, assignment) => {
      const state = getStudentClassAssignmentState(assignment, now);
      summary.total += 1;
      summary[state.toLowerCase() as "pending" | "completed" | "overdue"] += 1;
      return summary;
    },
    { total: 0, pending: 0, completed: 0, overdue: 0 },
  );
}
