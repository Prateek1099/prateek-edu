"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireActiveWorkspace } from "@/lib/require-role";
import {
  isWorkspaceAssignableChallengeType,
  normalizeDueDate,
} from "@/lib/workspace-assignment-rules";
import {
  workspaceActionErrorMessage,
  workspaceExpectedError,
} from "@/lib/workspace-action-errors";

export type CreateWorkspaceAssignmentInput = {
  classId: string;
  challengeId: string;
  audience: "CLASS" | "SELECTED_STUDENTS";
  studentIds?: string[];
  dueDate?: string | null;
  includeLateJoiners?: boolean;
};

export type WorkspaceAssignmentActionResult =
  | {
      success: true;
      batchId: string;
      assignedCount: number;
      addedCount: number;
      message: string;
    }
  | { success: false; error: string };

function revalidateAssignmentPaths(classId?: string) {
  if (classId) revalidatePath(`/workspace/classes/${classId}`);
  revalidatePath("/workspace/classes");
  revalidatePath("/workspace/worksheets");
  revalidatePath("/workspace/quick-practice");
  revalidatePath("/workspace/students");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/worksheets");
}

export async function createWorkspaceAssignment(
  input: CreateWorkspaceAssignmentInput,
): Promise<WorkspaceAssignmentActionResult> {
  try {
    const user = await requireActiveWorkspace();
    const dueDate = normalizeDueDate(input.dueDate);
    if (input.audience !== "CLASS" && input.audience !== "SELECTED_STUDENTS") {
      return { success: false, error: "Choose a valid assignment audience." };
    }

    const result = await prisma.$transaction(
      async (tx) => {
        const [classData, challenge] = await Promise.all([
          tx.class.findFirst({
            where: {
              id: input.classId,
              workspaceId: user.workspaceId,
              status: "ACTIVE",
              workspace: { status: "ACTIVE" },
            },
            include: {
              students: {
                where: { status: "ACTIVE" },
                select: { studentId: true },
              },
            },
          }),
          tx.challenge.findUnique({
            where: { id: input.challengeId },
            select: {
              id: true,
              workspaceId: true,
              subjectId: true,
              type: true,
              isPublished: true,
            },
          }),
        ]);

        if (!classData) workspaceExpectedError("Choose an active class from your workspace.");
        if (!challenge || challenge.workspaceId !== user.workspaceId) {
          workspaceExpectedError("This content is not available in your workspace.");
        }
        if (!challenge.isPublished) {
          workspaceExpectedError("Publish this content before assigning it to students.");
        }
        if (!isWorkspaceAssignableChallengeType(challenge.type)) {
          workspaceExpectedError("Only worksheets, PDF worksheets, and Quick Practice can be assigned.");
        }
        if (classData.subjectId && classData.subjectId !== challenge.subjectId) {
          workspaceExpectedError("This content does not match the class subject.");
        }

        const activeStudentIds = classData.students.map((student) => student.studentId);
        const requestedIds = Array.from(new Set(input.studentIds || []));
        const recipientIds = input.audience === "CLASS" ? activeStudentIds : requestedIds;

        if (recipientIds.length === 0) {
          workspaceExpectedError(
            input.audience === "CLASS"
              ? "This class has no active students to assign."
              : "Select at least one student.",
          );
        }
        if (
          input.audience === "SELECTED_STUDENTS" &&
          recipientIds.some((studentId) => !activeStudentIds.includes(studentId))
        ) {
          workspaceExpectedError("Every selected student must be active in this exact class.");
        }

        let batch = await tx.workspaceAssignmentBatch.findFirst({
          where: {
            workspaceId: user.workspaceId,
            classId: classData.id,
            challengeId: challenge.id,
            status: "ACTIVE",
          },
          select: { id: true, audience: true },
        });

        if (batch) {
          const keepExistingClassAudience =
            batch.audience === "CLASS" && input.audience === "SELECTED_STUDENTS";
          batch = await tx.workspaceAssignmentBatch.update({
            where: { id: batch.id },
            data: {
              audience:
                batch.audience === "CLASS" || input.audience === "CLASS"
                  ? "CLASS"
                  : "SELECTED_STUDENTS",
              dueDate: keepExistingClassAudience ? undefined : dueDate,
              includeLateJoiners: keepExistingClassAudience
                ? undefined
                : batch.audience === "CLASS" || input.audience === "CLASS"
                  ? input.includeLateJoiners !== false
                  : false,
            },
            select: { id: true, audience: true },
          });
        } else {
          batch = await tx.workspaceAssignmentBatch.create({
            data: {
              workspaceId: user.workspaceId,
              classId: classData.id,
              challengeId: challenge.id,
              assignedById: user.id,
              audience: input.audience,
              dueDate,
              includeLateJoiners:
                input.audience === "CLASS" && input.includeLateJoiners !== false,
            },
            select: { id: true, audience: true },
          });
        }

        const recipientsToEnsure = input.audience === "CLASS" ? activeStudentIds : recipientIds;
        const created = await tx.workspaceAssignmentRecipient.createMany({
          data: recipientsToEnsure.map((studentId) => ({ batchId: batch.id, studentId })),
          skipDuplicates: true,
        });

        await tx.workspaceAssignmentRecipient.updateMany({
          where: {
            batchId: batch.id,
            studentId: { in: recipientIds },
            revokedAt: { not: null },
          },
          data: { revokedAt: null },
        });

        const assignedCount = await tx.workspaceAssignmentRecipient.count({
          where: { batchId: batch.id, revokedAt: null },
        });

        return { batchId: batch.id, assignedCount, addedCount: created.count };
      },
      { isolationLevel: "Serializable" },
    );

    revalidateAssignmentPaths(input.classId);
    return {
      success: true,
      ...result,
      message:
        result.addedCount > 0
          ? `Assigned to ${result.addedCount} student${result.addedCount === 1 ? "" : "s"}.`
          : "This assignment was already up to date.",
    };
  } catch (error) {
    return {
      success: false,
      error: workspaceActionErrorMessage(error, "Could not create the assignment. Please try again."),
    };
  }
}

export async function updateWorkspaceAssignmentDueDate(
  batchId: string,
  dueDateValue: string | null,
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireActiveWorkspace();
    const dueDate = normalizeDueDate(dueDateValue);
    const updated = await prisma.workspaceAssignmentBatch.updateMany({
      where: { id: batchId, workspaceId: user.workspaceId, status: "ACTIVE" },
      data: { dueDate },
    });
    if (updated.count !== 1) return { success: false, error: "Active assignment not found." };
    const batch = await prisma.workspaceAssignmentBatch.findUnique({
      where: { id: batchId },
      select: { classId: true },
    });
    revalidateAssignmentPaths(batch?.classId);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: workspaceActionErrorMessage(error, "Could not update the due date."),
    };
  }
}

export async function cancelWorkspaceAssignment(
  batchId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireActiveWorkspace();
    const batch = await prisma.workspaceAssignmentBatch.findFirst({
      where: { id: batchId, workspaceId: user.workspaceId },
      select: { id: true, classId: true, status: true },
    });
    if (!batch) return { success: false, error: "Assignment not found." };
    if (batch.status === "CANCELLED") return { success: true };

    await prisma.workspaceAssignmentBatch.update({
      where: { id: batch.id },
      data: { status: "CANCELLED", cancelledAt: new Date() },
    });
    revalidateAssignmentPaths(batch.classId);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Could not cancel the assignment.",
    };
  }
}

export async function revokeWorkspaceAssignmentRecipient(
  batchId: string,
  studentId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireActiveWorkspace();
    const batch = await prisma.workspaceAssignmentBatch.findFirst({
      where: { id: batchId, workspaceId: user.workspaceId, status: "ACTIVE" },
      select: { id: true, classId: true },
    });
    if (!batch) return { success: false, error: "Active assignment not found." };

    const updated = await prisma.workspaceAssignmentRecipient.updateMany({
      where: { batchId, studentId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (updated.count !== 1) return { success: false, error: "Active recipient not found." };
    revalidateAssignmentPaths(batch.classId);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Could not remove this recipient.",
    };
  }
}

/** Legacy compatibility for callers that have not moved to the batch UI yet. */
export async function assignWorksheetToClass(data: {
  classId: string;
  worksheetId: string;
  dueDate?: Date | null;
}) {
  const result = await createWorkspaceAssignment({
    classId: data.classId,
    challengeId: data.worksheetId,
    audience: "CLASS",
    dueDate: data.dueDate ? data.dueDate.toISOString().slice(0, 10) : null,
    includeLateJoiners: true,
  });
  if (!result.success) throw new Error(result.error);
  return { assignedCount: result.assignedCount };
}

/** Legacy rows are retained but no new teacher assignment writes use this path. */
export async function removeAssignment(userId: string, worksheetId: string) {
  const user = await requireActiveWorkspace();
  const assignment = await prisma.worksheetAssignment.findFirst({
    where: {
      userId,
      worksheetId,
      worksheet: { workspaceId: user.workspaceId },
    },
    select: { id: true },
  });
  if (!assignment) throw new Error("Legacy assignment not found or unauthorized");
  await prisma.worksheetAssignment.delete({ where: { id: assignment.id } });
  revalidateAssignmentPaths();
}
