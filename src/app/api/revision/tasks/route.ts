import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/revision/tasks
 * Update a task's status. Body: { taskId, status }
 */
export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { taskId, status } = await request.json();

    if (!taskId || !["COMPLETED", "SKIPPED", "PENDING"].includes(status)) {
      return Response.json(
        { error: "Invalid request. Provide taskId and valid status." },
        { status: 400 }
      );
    }

    // Verify ownership through the plan relation
    const task = await prisma.revisionTask.findFirst({
      where: {
        id: taskId,
        revisionPlan: { userId },
      },
    });

    if (!task) {
      return Response.json({ error: "Task not found" }, { status: 404 });
    }

    await prisma.revisionTask.update({
      where: { id: taskId },
      data: {
        status,
        completedAt: status === "COMPLETED" ? new Date() : null,
      },
    });

    return Response.json({ success: true });
  } catch (error: any) {
    console.error("Error updating task:", error);
    return Response.json(
      { error: "Failed to update task" },
      { status: 500 }
    );
  }
}
