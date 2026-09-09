export const TEACHER_ASSESSMENT_PAGE_SIZE = 20;

export type TeacherAssessmentFilter = "ALL" | "SCHEDULED" | "ACTIVE" | "COMPLETED";
export type TeacherAssessmentState = Exclude<TeacherAssessmentFilter, "ALL"> | "CANCELLED";
export type TeacherAssessmentCompletionReason =
  | "WINDOW_CLOSED"
  | "ALL_FINALIZED"
  | "NO_ACTIVE_RECIPIENTS"
  | null;

export type TeacherAssessmentCenterInput = {
  status?: unknown;
  search?: unknown;
  classId?: unknown;
  page?: unknown;
};

export type TeacherAssessmentCenterQuery = {
  status: TeacherAssessmentFilter;
  search: string;
  classId: string;
  page: number;
  pageSize: number;
};

export type TeacherAssessmentProgress = {
  assigned: number;
  notStarted: number;
  inProgress: number;
  submittedReady: number;
  released: number;
};

export type TeacherAssessmentCenterItem = {
  id: string;
  title: string;
  classId: string;
  className: string;
  subjectName: string;
  assignedAt: string;
  opensAt: string;
  closesAt: string;
  durationMinutes: number;
  totalMarks: number;
  questionCount: number;
  status: TeacherAssessmentState;
  completionReason: TeacherAssessmentCompletionReason;
  progress: TeacherAssessmentProgress;
};

export type TeacherAssessmentCenterResult = {
  serverNow: string;
  query: TeacherAssessmentCenterQuery;
  classes: Array<{ id: string; name: string; subjectName: string; academicYear: string }>;
  items: TeacherAssessmentCenterItem[];
  counts: { active: number; scheduled: number; completed: number };
  total: number;
  totalPages: number;
};

function oneString(value: unknown) {
  return typeof value === "string" ? value : "";
}

export function normalizeTeacherAssessmentCenterQuery(
  input: TeacherAssessmentCenterInput = {},
): TeacherAssessmentCenterQuery {
  const requestedStatus = oneString(input.status).toUpperCase();
  const status: TeacherAssessmentFilter = ["SCHEDULED", "ACTIVE", "COMPLETED"].includes(
    requestedStatus,
  )
    ? (requestedStatus as TeacherAssessmentFilter)
    : "ALL";
  const search = oneString(input.search).replace(/\s+/g, " ").trim().slice(0, 100);
  const rawClassId = oneString(input.classId).trim();
  const classId = rawClassId.length <= 200 ? rawClassId : "";
  const rawPage = Number.parseInt(oneString(input.page), 10);
  const page = Number.isInteger(rawPage) && rawPage >= 1 && rawPage <= 10_000 ? rawPage : 1;

  return { status, search, classId, page, pageSize: TEACHER_ASSESSMENT_PAGE_SIZE };
}

export function deriveTeacherAssessmentState(input: {
  now: Date;
  opensAt: Date;
  closesAt: Date;
  cancelledAt: Date | null;
  classIsActive: boolean;
  activeRecipientCount: number;
  actionableRecipientCount: number;
  finalizedRecipientCount: number;
}): { status: TeacherAssessmentState; completionReason: TeacherAssessmentCompletionReason } {
  if (input.cancelledAt) return { status: "CANCELLED", completionReason: null };
  if (
    input.now < input.opensAt &&
    input.classIsActive &&
    input.activeRecipientCount > 0
  ) {
    return { status: "SCHEDULED", completionReason: null };
  }
  if (input.now >= input.closesAt) {
    return { status: "COMPLETED", completionReason: "WINDOW_CLOSED" };
  }
  if (
    input.now >= input.opensAt &&
    input.classIsActive &&
    input.actionableRecipientCount > 0
  ) {
    return { status: "ACTIVE", completionReason: null };
  }
  if (
    input.activeRecipientCount > 0 &&
    input.finalizedRecipientCount === input.activeRecipientCount
  ) {
    return { status: "COMPLETED", completionReason: "ALL_FINALIZED" };
  }
  return { status: "COMPLETED", completionReason: "NO_ACTIVE_RECIPIENTS" };
}

export function teacherAssessmentStatusLabel(
  status: TeacherAssessmentState,
  reason: TeacherAssessmentCompletionReason,
) {
  if (status === "CANCELLED") return "Cancelled";
  if (status === "COMPLETED" && reason === "WINDOW_CLOSED") {
    return "Completed · Window closed";
  }
  if (status === "COMPLETED") return "Completed";
  return status === "ACTIVE" ? "Active" : "Scheduled";
}
