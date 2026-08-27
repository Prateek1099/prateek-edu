export class WorkspaceExpectedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WorkspaceExpectedError";
  }
}

export function workspaceExpectedError(message: string): never {
  throw new WorkspaceExpectedError(message);
}

export function workspaceActionErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error &&
    (error instanceof WorkspaceExpectedError || error.name === "WorkspaceAcademicScopeError")
    ? error.message
    : fallback;
}
