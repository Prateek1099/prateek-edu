export type StudentWorkDisplayState =
  | "COMPLETED"
  | "OVERDUE"
  | "DUE_TODAY"
  | "UPCOMING"
  | "NO_DUE_DATE";

type StudentWorkDates = {
  status: string;
  assignedAt: Date | string;
  dueDate: Date | string | null;
};

function utcDateKey(value: Date | string) {
  return new Date(value).toISOString().slice(0, 10);
}

export function getStudentWorkDisplayState(
  assignment: Pick<StudentWorkDates, "status" | "dueDate">,
  now = new Date(),
): StudentWorkDisplayState {
  if (assignment.status === "COMPLETED" || assignment.status === "MARKED_DONE") {
    return "COMPLETED";
  }
  if (!assignment.dueDate) return "NO_DUE_DATE";

  const dueDate = new Date(assignment.dueDate);
  if (dueDate.getTime() < now.getTime()) return "OVERDUE";
  if (utcDateKey(dueDate) === utcDateKey(now)) return "DUE_TODAY";
  return "UPCOMING";
}

const workPriority: Record<StudentWorkDisplayState, number> = {
  OVERDUE: 0,
  DUE_TODAY: 1,
  UPCOMING: 2,
  NO_DUE_DATE: 3,
  COMPLETED: 4,
};

export function orderStudentWork<T extends StudentWorkDates>(
  assignments: T[],
  now = new Date(),
) {
  return [...assignments].sort((left, right) => {
    const leftState = getStudentWorkDisplayState(left, now);
    const rightState = getStudentWorkDisplayState(right, now);
    const stateDifference = workPriority[leftState] - workPriority[rightState];
    if (stateDifference !== 0) return stateDifference;

    if (left.dueDate && right.dueDate) {
      const dueDifference = new Date(left.dueDate).getTime() - new Date(right.dueDate).getTime();
      if (dueDifference !== 0) return dueDifference;
    }
    return new Date(right.assignedAt).getTime() - new Date(left.assignedAt).getTime();
  });
}

export function getStudentWorkStatusLabel(state: StudentWorkDisplayState) {
  if (state === "COMPLETED") return "Completed";
  if (state === "OVERDUE") return "Overdue";
  if (state === "DUE_TODAY") return "Due today";
  if (state === "NO_DUE_DATE") return "No due date";
  return "Upcoming";
}
