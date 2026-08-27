import "server-only";

import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { WORKSPACE_SCOPE_NOT_CONFIGURED } from "@/lib/workspace-academic-scope-rules";
import type { ScopeDependencyCounts } from "@/lib/workspace-academic-scope-rules";

type ScopeDatabase = typeof prisma | Prisma.TransactionClient;

export class WorkspaceAcademicScopeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WorkspaceAcademicScopeError";
  }
}

export async function getWorkspaceScopeDependencyCounts(
  workspaceId: string,
  subjectId: string,
  db: ScopeDatabase = prisma,
): Promise<ScopeDependencyCounts> {
  const [activeClasses, publishedChallenges, publishedWorkspaceContent, activeAssignmentBatches] =
    await Promise.all([
      db.class.count({ where: { workspaceId, subjectId, status: "ACTIVE" } }),
      db.challenge.count({ where: { workspaceId, subjectId, isPublished: true } }),
      db.workspaceContent.count({ where: { workspaceId, subjectId, status: "PUBLISHED" } }),
      db.workspaceAssignmentBatch.count({
        where: { workspaceId, status: "ACTIVE", challenge: { subjectId } },
      }),
    ]);

  return { activeClasses, publishedChallenges, publishedWorkspaceContent, activeAssignmentBatches };
}

export async function listActiveWorkspaceScopes(workspaceId: string, db: ScopeDatabase = prisma) {
  return db.workspaceAcademicScope.findMany({
    where: {
      workspaceId,
      status: "ACTIVE",
      subject: {
        status: "PUBLISHED",
        qualification: { status: "PUBLISHED", board: { status: "PUBLISHED" } },
      },
    },
    include: {
      subject: {
        include: {
          qualification: { include: { board: true } },
        },
      },
      assignedBy: { select: { id: true, name: true, email: true } },
    },
    orderBy: [
      { subject: { qualification: { board: { title: "asc" } } } },
      { subject: { qualification: { sortOrder: "asc" } } },
      { subject: { name: "asc" } },
    ],
  });
}

export async function listActiveWorkspaceSubjectIds(workspaceId: string, db: ScopeDatabase = prisma) {
  const scopes = await db.workspaceAcademicScope.findMany({
    where: {
      workspaceId,
      status: "ACTIVE",
      subject: {
        status: "PUBLISHED",
        qualification: { status: "PUBLISHED", board: { status: "PUBLISHED" } },
      },
    },
    select: { subjectId: true },
  });
  return scopes.map((scope) => scope.subjectId);
}

export async function assertWorkspaceHasAnyActiveScope(workspaceId: string, db: ScopeDatabase = prisma) {
  const scope = await db.workspaceAcademicScope.findFirst({
    where: { workspaceId, status: "ACTIVE" },
    select: { id: true },
  });
  if (!scope) throw new WorkspaceAcademicScopeError(WORKSPACE_SCOPE_NOT_CONFIGURED);
  return scope;
}

export async function isWorkspaceSubjectScoped(
  workspaceId: string,
  subjectId: string,
  db: ScopeDatabase = prisma,
) {
  const scope = await db.workspaceAcademicScope.findFirst({
    where: {
      workspaceId,
      subjectId,
      status: "ACTIVE",
      workspace: { status: "ACTIVE" },
      subject: {
        status: "PUBLISHED",
        qualification: { status: "PUBLISHED", board: { status: "PUBLISHED" } },
      },
    },
    select: { id: true },
  });
  return Boolean(scope);
}

export async function requireWorkspaceSubjectScope(
  workspaceId: string,
  subjectId: string | null | undefined,
  db: ScopeDatabase = prisma,
) {
  if (!subjectId) {
    throw new WorkspaceAcademicScopeError("Choose a subject assigned to your workspace.");
  }
  const allowed = await isWorkspaceSubjectScoped(workspaceId, subjectId, db);
  if (!allowed) {
    throw new WorkspaceAcademicScopeError("This subject is not assigned to your workspace.");
  }
  return subjectId;
}

export async function requireWorkspaceTopicScope(
  workspaceId: string,
  subjectId: string | null | undefined,
  topicId: string | null | undefined,
  db: ScopeDatabase = prisma,
) {
  const scopedSubjectId = await requireWorkspaceSubjectScope(workspaceId, subjectId, db);
  if (!topicId) return null;

  const topic = await db.topic.findFirst({
    where: { id: topicId, subjectId: scopedSubjectId },
    select: { id: true },
  });
  if (!topic) {
    throw new WorkspaceAcademicScopeError("The selected topic does not belong to the assigned subject.");
  }
  return topic.id;
}
