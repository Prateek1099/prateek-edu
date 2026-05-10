export function isAdminRole(role: unknown): role is string {
  return typeof role === "string" && role.trim().length > 0 &&
    role.toLowerCase() === "admin";
}
