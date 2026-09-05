export type TeacherWorkflowAssignment = {
  id: string;
  status: "ACTIVE" | "CANCELLED";
  createdAt: Date | string;
  challenge: { title: string; type: string };
  summary: {
    assigned: number;
    completed: number;
    pending: number;
    overdue: number;
    averageScore: number | null;
  };
  recipients: Array<{ mistakesCount: number }>;
};

export type TeacherAttentionItem = {
  id: string;
  kind: "OVERDUE" | "PENDING" | "MISTAKES";
  title: string;
  context: string;
  href: string;
  actionLabel: string;
};

export function getTeacherGreeting(now = new Date()) {
  const hourPart = new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    hourCycle: "h23",
    timeZone: "Asia/Kolkata",
  })
    .formatToParts(now)
    .find((part) => part.type === "hour")?.value;
  const hour = Number(hourPart ?? 12);

  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function summarizeClassWork(assignments: TeacherWorkflowAssignment[]) {
  return assignments
    .filter((assignment) => assignment.status === "ACTIVE")
    .reduce(
      (summary, assignment) => ({
        assignedWork: summary.assignedWork + 1,
        completed: summary.completed + assignment.summary.completed,
        pending: summary.pending + assignment.summary.pending,
        overdue: summary.overdue + assignment.summary.overdue,
      }),
      { assignedWork: 0, completed: 0, pending: 0, overdue: 0 },
    );
}

export function buildTeacherAttentionItems(
  classes: Array<{
    id: string;
    name: string;
    assignments: TeacherWorkflowAssignment[];
  }>,
  limit = 5,
) {
  const items: Array<TeacherAttentionItem & { priority: number; createdAt: number }> = [];

  for (const classData of classes) {
    for (const assignment of classData.assignments) {
      if (assignment.status !== "ACTIVE") continue;

      const href = `/workspace/classes/${classData.id}/assignments/${assignment.id}`;
      const wrongAnswers = assignment.recipients.reduce(
        (total, recipient) => total + recipient.mistakesCount,
        0,
      );
      const createdAt = new Date(assignment.createdAt).getTime();

      if (assignment.summary.overdue > 0) {
        items.push({
          id: `overdue-${assignment.id}`,
          kind: "OVERDUE",
          priority: 0,
          createdAt,
          title: `${assignment.summary.overdue} student${assignment.summary.overdue === 1 ? " is" : "s are"} overdue on “${assignment.challenge.title}”`,
          context: classData.name,
          href,
          actionLabel: "Review overdue work",
        });
      } else if (assignment.summary.pending > 0) {
        items.push({
          id: `pending-${assignment.id}`,
          kind: "PENDING",
          priority: 1,
          createdAt,
          title: `${assignment.summary.pending} student${assignment.summary.pending === 1 ? " still needs" : "s still need"} to complete “${assignment.challenge.title}”`,
          context: classData.name,
          href,
          actionLabel: "View progress",
        });
      } else if (wrongAnswers > 0) {
        items.push({
          id: `mistakes-${assignment.id}`,
          kind: "MISTAKES",
          priority: 2,
          createdAt,
          title: `${wrongAnswers} wrong answer${wrongAnswers === 1 ? " was" : "s were"} recorded in “${assignment.challenge.title}”`,
          context: classData.name,
          href,
          actionLabel: "Review answers",
        });
      }
    }
  }

  return items
    .sort((left, right) => left.priority - right.priority || right.createdAt - left.createdAt)
    .slice(0, limit)
    .map((item) => ({
      id: item.id,
      kind: item.kind,
      title: item.title,
      context: item.context,
      href: item.href,
      actionLabel: item.actionLabel,
    }));
}

export function contentTypeLabel(type: string) {
  if (type === "QUICK_PRACTICE") return "practice set";
  if (type === "PDF_WORKSHEET") return "PDF worksheet";
  return "worksheet";
}
