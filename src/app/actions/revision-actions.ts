"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateRevisionTasks } from "@/lib/plan-engine";
import { revalidatePath } from "next/cache";

// ─── createRevisionPlan ──────────────────────────────────────────────────────

export async function createRevisionPlan(data: {
  examDate: string; // ISO date string from client
  studyDaysPerWeek: number;
  studyDuration: number;
  board: string;
  qualification: string;
}) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;

    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    // Validate inputs
    const examDate = new Date(data.examDate);
    if (isNaN(examDate.getTime()) || examDate <= new Date()) {
      return { success: false, error: "Exam date must be in the future" };
    }

    if (data.studyDaysPerWeek < 1 || data.studyDaysPerWeek > 7) {
      return { success: false, error: "Study days per week must be between 1 and 7" };
    }

    if (![30, 45, 60, 90].includes(data.studyDuration)) {
      return { success: false, error: "Study duration must be 30, 45, 60, or 90 minutes" };
    }

    // Check if user already has a plan (1:1 relation)
    const existingPlan = await prisma.revisionPlan.findUnique({
      where: { userId },
    });

    if (existingPlan) {
      return { success: false, error: "You already have a revision plan. Delete it first or update settings." };
    }

    // Create the plan
    const plan = await prisma.revisionPlan.create({
      data: {
        userId,
        board: data.board,
        qualification: data.qualification,
        examDate,
        studyDaysPerWeek: data.studyDaysPerWeek,
        studyDuration: data.studyDuration,
      },
    });

    // Generate tasks
    await generateRevisionTasks(
      userId,
      plan.id,
      data.board,
      data.qualification,
      examDate,
      data.studyDaysPerWeek,
      data.studyDuration
    );

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/revision-planner");

    return { success: true, planId: plan.id };
  } catch (error: any) {
    console.error("Error creating revision plan:", error);
    return { success: false, error: "Failed to create revision plan. Please try again." };
  }
}

// ─── regeneratePlan ──────────────────────────────────────────────────────────

export async function regeneratePlan(planId: string) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;

    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    // Verify ownership
    const plan = await prisma.revisionPlan.findFirst({
      where: { id: planId, userId },
    });

    if (!plan) {
      return { success: false, error: "Plan not found" };
    }

    // Regenerate tasks (the engine handles deleting old PENDING tasks)
    await generateRevisionTasks(
      userId,
      plan.id,
      plan.board,
      plan.qualification,
      plan.examDate,
      plan.studyDaysPerWeek,
      plan.studyDuration
    );

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/revision-planner");

    return { success: true };
  } catch (error: any) {
    console.error("Error regenerating plan:", error);
    return { success: false, error: "Failed to regenerate plan. Please try again." };
  }
}

// ─── updateTaskStatus ────────────────────────────────────────────────────────

export async function updateTaskStatus(
  taskId: string,
  status: "COMPLETED" | "SKIPPED"
) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;

    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    if (!["COMPLETED", "SKIPPED"].includes(status)) {
      return { success: false, error: "Invalid status" };
    }

    // Verify ownership through the plan relation
    const task = await prisma.revisionTask.findFirst({
      where: {
        id: taskId,
        revisionPlan: { userId },
      },
    });

    if (!task) {
      return { success: false, error: "Task not found" };
    }

    await prisma.revisionTask.update({
      where: { id: taskId },
      data: {
        status,
        completedAt: status === "COMPLETED" ? new Date() : null,
      },
    });

    revalidatePath("/dashboard/revision-planner");

    return { success: true };
  } catch (error: any) {
    console.error("Error updating task status:", error);
    return { success: false, error: "Failed to update task. Please try again." };
  }
}

// ─── deleteRevisionPlan ──────────────────────────────────────────────────────

export async function deleteRevisionPlan(planId: string) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;

    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    // Verify ownership
    const plan = await prisma.revisionPlan.findFirst({
      where: { id: planId, userId },
    });

    if (!plan) {
      return { success: false, error: "Plan not found" };
    }

    // Delete plan (cascade deletes all tasks)
    await prisma.revisionPlan.delete({
      where: { id: planId },
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/revision-planner");

    return { success: true };
  } catch (error: any) {
    console.error("Error deleting revision plan:", error);
    return { success: false, error: "Failed to delete plan. Please try again." };
  }
}

// ─── updatePlanSettings ──────────────────────────────────────────────────────

export async function updatePlanSettings(
  planId: string,
  data: {
    examDate?: string; // ISO date string
    studyDaysPerWeek?: number;
    studyDuration?: number;
  }
) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;

    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    // Verify ownership
    const plan = await prisma.revisionPlan.findFirst({
      where: { id: planId, userId },
    });

    if (!plan) {
      return { success: false, error: "Plan not found" };
    }

    // Build update data
    const updateData: Record<string, any> = {};

    if (data.examDate) {
      const examDate = new Date(data.examDate);
      if (isNaN(examDate.getTime()) || examDate <= new Date()) {
        return { success: false, error: "Exam date must be in the future" };
      }
      updateData.examDate = examDate;
    }

    if (data.studyDaysPerWeek !== undefined) {
      if (data.studyDaysPerWeek < 1 || data.studyDaysPerWeek > 7) {
        return { success: false, error: "Study days per week must be between 1 and 7" };
      }
      updateData.studyDaysPerWeek = data.studyDaysPerWeek;
    }

    if (data.studyDuration !== undefined) {
      if (![30, 45, 60, 90].includes(data.studyDuration)) {
        return { success: false, error: "Study duration must be 30, 45, 60, or 90 minutes" };
      }
      updateData.studyDuration = data.studyDuration;
    }

    if (Object.keys(updateData).length === 0) {
      return { success: false, error: "No settings to update" };
    }

    // Update plan settings
    const updatedPlan = await prisma.revisionPlan.update({
      where: { id: planId },
      data: updateData,
    });

    // Regenerate tasks with new settings
    await generateRevisionTasks(
      userId,
      updatedPlan.id,
      updatedPlan.board,
      updatedPlan.qualification,
      updatedPlan.examDate,
      updatedPlan.studyDaysPerWeek,
      updatedPlan.studyDuration
    );

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/revision-planner");

    return { success: true };
  } catch (error: any) {
    console.error("Error updating plan settings:", error);
    return { success: false, error: "Failed to update settings. Please try again." };
  }
}
