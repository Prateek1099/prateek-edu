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
  return error instanceof WorkspaceExpectedError ? error.message : fallback;
}
