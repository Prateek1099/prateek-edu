"use server";

import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/require-role";
import { isSuperAdmin } from "@/lib/roles";
import { revalidatePath } from "next/cache";

export async function deleteUserAction(id: string) {
  try {
    const admin = await requireSuperAdmin();

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id },
        select: {
          id: true,
          role: true,
          workspaceId: true,
          isPremium: true,
          subscriptionStart: true,
          subscriptionExpiry: true,
          revisionPlan: { select: { id: true } },
          ownedWorkspace: { select: { id: true } },
          _count: {
            select: {
              payments: true,
              enrollments: true,
              progress: true,
              topicProgress: true,
              savedPapers: true,
              reflections: true,
              challengeAttempts: true,
              mistakeEntries: true,
              worksheetAssignments: true,
              classEnrollments: true,
            },
          },
        },
      });

      if (!user) {
        return { success: false, error: "User not found." };
      }

      if (user.id === admin.id) {
        return {
          success: false,
          error: "You cannot delete your own administrator account.",
        };
      }

      if (isSuperAdmin(user.role)) {
        return {
          success: false,
          error: "SUPER_ADMIN accounts cannot be deleted from the Admin Panel.",
        };
      }

      const blockers: string[] = [];
      const counts = user._count;

      if (counts.payments > 0) blockers.push(`${counts.payments} payment record(s)`);
      if (counts.enrollments > 0) blockers.push(`${counts.enrollments} course enrollment(s)`);
      if (counts.challengeAttempts > 0) {
        blockers.push(`${counts.challengeAttempts} challenge attempt(s)`);
      }
      if (counts.mistakeEntries > 0) blockers.push(`${counts.mistakeEntries} mistake record(s)`);
      if (counts.reflections > 0) blockers.push(`${counts.reflections} reflection(s)`);
      if (user.revisionPlan) blockers.push("a revision plan");
      if (counts.progress > 0) blockers.push(`${counts.progress} progress record(s)`);
      if (counts.topicProgress > 0) blockers.push(`${counts.topicProgress} topic progress record(s)`);
      if (counts.savedPapers > 0) blockers.push(`${counts.savedPapers} saved paper record(s)`);
      if (counts.worksheetAssignments > 0) {
        blockers.push(`${counts.worksheetAssignments} worksheet assignment(s)`);
      }
      if (counts.classEnrollments > 0) {
        blockers.push(`${counts.classEnrollments} class enrollment(s)`);
      }
      if (user.ownedWorkspace) blockers.push("an owned teacher workspace");
      if (user.workspaceId) blockers.push("workspace membership");
      if (
        user.isPremium ||
        user.subscriptionStart ||
        user.subscriptionExpiry
      ) {
        blockers.push("subscription history or access");
      }

      if (blockers.length > 0) {
        return {
          success: false,
          error: `This user cannot be deleted because they have ${blockers.join(
            ", "
          )}. Preserve the account and its learning/payment history.`,
        };
      }

      await tx.user.delete({ where: { id: user.id } });
      return { success: true };
    });

    if (result.success) {
      revalidatePath("/admin/users");
    }

    return result;
  } catch (error) {
    console.error("Failed to delete user:", error);
    return {
      success: false,
      error:
        error instanceof Error && error.message.startsWith("Unauthorized")
          ? "Only a SUPER_ADMIN can delete users."
          : "Failed to delete user safely.",
    };
  }
}
