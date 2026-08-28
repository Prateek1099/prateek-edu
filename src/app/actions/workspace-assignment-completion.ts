"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-role";

export type MarkWorksheetDoneResult =
  | { success: true; completedAt: string; alreadyCompleted: boolean }
  | { success: false; error: string };

const activeWorksheetRecipientWhere = (
  recipientId: string,
  studentId: string,
  workspaceId?: string,
) => ({
  id: recipientId,
  studentId,
  revokedAt: null,
  batch: {
    ...(workspaceId ? { workspaceId } : {}),
    status: "ACTIVE" as const,
    workspace: { status: "ACTIVE" as const },
    class: {
      ...(workspaceId ? { workspaceId } : {}),
      status: "ACTIVE" as const,
      students: { some: { studentId, status: "ACTIVE" as const } },
    },
    challenge: {
      ...(workspaceId ? { workspaceId } : {}),
      isPublished: true,
      type: { in: ["WORKSHEET", "PDF_WORKSHEET"] },
    },
  },
});

export async function markAssignedWorksheetDone(
  recipientId: string,
): Promise<MarkWorksheetDoneResult> {
  try {
    const user = await requireAuth();
    if (user.role !== "STUDENT") {
      return { success: false, error: "Only student accounts can complete assigned worksheets." };
    }

    const result = await prisma.$transaction(async (tx) => {
      const recipient = await tx.workspaceAssignmentRecipient.findFirst({
        where: activeWorksheetRecipientWhere(recipientId, user.id),
        select: {
          id: true,
          status: true,
          completedAt: true,
          batch: {
            select: {
              classId: true,
              challengeId: true,
              workspaceId: true,
              class: { select: { workspaceId: true } },
              challenge: { select: { workspaceId: true } },
            },
          },
        },
      });
      if (!recipient) return null;
      if (
        recipient.batch.class.workspaceId !== recipient.batch.workspaceId
        || recipient.batch.challenge.workspaceId !== recipient.batch.workspaceId
      ) return null;
      if (recipient.status === "COMPLETED" && recipient.completedAt) {
        return {
          classId: recipient.batch.classId,
          challengeId: recipient.batch.challengeId,
          completedAt: recipient.completedAt,
          alreadyCompleted: true,
        };
      }

      const completedAt = new Date();
      const updated = await tx.workspaceAssignmentRecipient.updateMany({
        where: {
          ...activeWorksheetRecipientWhere(recipient.id, user.id, recipient.batch.workspaceId),
          status: "NOT_STARTED",
        },
        data: { status: "COMPLETED", completedAt },
      });
      if (updated.count !== 1) return null;

      return {
        classId: recipient.batch.classId,
        challengeId: recipient.batch.challengeId,
        completedAt,
        alreadyCompleted: false,
      };
    });

    if (!result) {
      return {
        success: false,
        error: "This worksheet is no longer an active assignment for your account.",
      };
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/worksheets");
    revalidatePath("/dashboard/classes");
    revalidatePath(`/dashboard/classes/${result.classId}`);
    revalidatePath(`/workspace/classes/${result.classId}`);

    return {
      success: true,
      completedAt: result.completedAt.toISOString(),
      alreadyCompleted: result.alreadyCompleted,
    };
  } catch {
    return { success: false, error: "Could not mark this worksheet as done." };
  }
}
