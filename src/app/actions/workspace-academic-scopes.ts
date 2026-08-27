"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/require-role";
import {
  scopeDeactivationError,
  validateScopeSelection,
} from "@/lib/workspace-academic-scope-rules";
import { getWorkspaceScopeDependencyCounts } from "@/lib/workspace-academic-scope";

export type WorkspaceScopeActionResult =
  | { success: true; message: string }
  | { success: false; error: string };

export async function addWorkspaceAcademicScope(input: {
  workspaceId: string;
  boardId: string;
  qualificationId: string;
  subjectId: string;
}): Promise<WorkspaceScopeActionResult> {
  try {
    const admin = await requireSuperAdmin();
    const fieldError = validateScopeSelection(input);
    if (fieldError) return { success: false, error: fieldError };

    const [workspace, subject] = await Promise.all([
      prisma.workspace.findUnique({ where: { id: input.workspaceId }, select: { id: true } }),
      prisma.subject.findFirst({
        where: {
          id: input.subjectId,
          qualificationId: input.qualificationId,
          status: "PUBLISHED",
          qualification: {
            boardId: input.boardId,
            status: "PUBLISHED",
            board: { status: "PUBLISHED" },
          },
        },
        select: { id: true },
      }),
    ]);

    if (!workspace) return { success: false, error: "Workspace not found." };
    if (!subject) {
      return {
        success: false,
        error: "The selected board, qualification, and subject do not form a valid published scope.",
      };
    }

    await prisma.workspaceAcademicScope.upsert({
      where: {
        workspaceId_subjectId: { workspaceId: input.workspaceId, subjectId: input.subjectId },
      },
      create: {
        workspaceId: input.workspaceId,
        subjectId: input.subjectId,
        assignedById: admin.id,
      },
      update: {
        status: "ACTIVE",
        assignedById: admin.id,
        deactivatedAt: null,
      },
    });

    revalidatePath("/admin/workspaces");
    revalidatePath(`/admin/workspaces/${input.workspaceId}`);
    return { success: true, message: "Academic scope assigned." };
  } catch {
    return { success: false, error: "Could not assign the academic scope. Please try again." };
  }
}

export async function deactivateWorkspaceAcademicScope(
  scopeId: string,
): Promise<WorkspaceScopeActionResult> {
  try {
    await requireSuperAdmin();

    const result = await prisma.$transaction(async (tx) => {
      const scope = await tx.workspaceAcademicScope.findUnique({
        where: { id: scopeId },
        select: { id: true, workspaceId: true, subjectId: true, status: true },
      });
      if (!scope) return { success: false as const, error: "Academic scope not found." };
      if (scope.status === "INACTIVE") {
        return { success: true as const, message: "Academic scope is already inactive.", workspaceId: scope.workspaceId };
      }

      const counts = await getWorkspaceScopeDependencyCounts(scope.workspaceId, scope.subjectId, tx);
      const dependencyError = scopeDeactivationError(counts);
      if (dependencyError) return { success: false as const, error: dependencyError };

      await tx.workspaceAcademicScope.update({
        where: { id: scope.id },
        data: { status: "INACTIVE", deactivatedAt: new Date() },
      });
      return { success: true as const, message: "Academic scope deactivated.", workspaceId: scope.workspaceId };
    });

    if (result.success) {
      revalidatePath("/admin/workspaces");
      revalidatePath(`/admin/workspaces/${result.workspaceId}`);
      return { success: true, message: result.message };
    }
    return result;
  } catch {
    return { success: false, error: "Could not deactivate the academic scope. Please try again." };
  }
}
