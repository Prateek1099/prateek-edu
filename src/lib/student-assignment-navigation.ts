const SAFE_STUDENT_RETURN_PATHS = new Set([
  "/dashboard",
  "/dashboard/classes",
  "/dashboard/worksheets",
]);

const STUDENT_CLASS_RETURN_PATH = /^\/dashboard\/classes\/[A-Za-z0-9_-]+$/;

export function getSafeStudentReturnPath(
  value: string | string[] | undefined,
  fallback: string,
) {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (!candidate) return fallback;
  if (SAFE_STUDENT_RETURN_PATHS.has(candidate)) return candidate;
  if (STUDENT_CLASS_RETURN_PATH.test(candidate)) return candidate;
  return fallback;
}

export function withStudentReturnTo(
  href: string,
  returnTo: string,
  assignmentId?: string,
) {
  const separator = href.includes("?") ? "&" : "?";
  const context = assignmentId
    ? `assignmentId=${encodeURIComponent(assignmentId)}&`
    : "";
  return `${href}${separator}${context}returnTo=${encodeURIComponent(returnTo)}`;
}

export function getStudentReturnLabel(returnTo: string, fallback: string) {
  if (STUDENT_CLASS_RETURN_PATH.test(returnTo)) return "Back to Class";
  if (returnTo === "/dashboard/classes") return "Back to My Classes";
  if (returnTo === "/dashboard/worksheets") return "Back to Assigned Work";
  if (returnTo === "/dashboard") return "Back to Dashboard";
  return fallback;
}
