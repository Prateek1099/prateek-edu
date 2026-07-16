// Role utilities for the Vexa multi-tenant system
// Role hierarchy: SUPER_ADMIN > TEACHER > STUDENT

export function isSuperAdmin(role: unknown): boolean {
  return typeof role === "string" && role === "SUPER_ADMIN";
}

export function isTeacher(role: unknown): boolean {
  return typeof role === "string" && role === "TEACHER";
}

export function isTeacherOrAbove(role: unknown): boolean {
  return isSuperAdmin(role) || isTeacher(role);
}

// Backward compatibility — existing code that calls isAdminRole() continues to work.
// "admin" (old string value) and "SUPER_ADMIN" (new enum value) both accepted.
export function isAdminRole(role: unknown): role is string {
  if (typeof role !== "string" || role.trim().length === 0) return false;
  const normalized = role.toLowerCase();
  return normalized === "admin" || normalized === "super_admin";
}
