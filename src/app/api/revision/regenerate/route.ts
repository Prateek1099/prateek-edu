import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateRevisionTasks } from "@/lib/plan-engine";

export const dynamic = "force-dynamic";

/**
 * POST /api/revision/regenerate
 * Regenerate tasks for a revision plan. Body: { planId }
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { planId } = await request.json();

    if (!planId) {
      return Response.json(
        { error: "planId is required" },
        { status: 400 }
      );
    }

    // Verify ownership
    const plan = await prisma.revisionPlan.findFirst({
      where: { id: planId, userId },
    });

    if (!plan) {
      return Response.json({ error: "Plan not found" }, { status: 404 });
    }

    // Regenerate tasks (engine handles deleting old PENDING tasks)
    await generateRevisionTasks(
      userId,
      plan.id,
      plan.board,
      plan.qualification,
      plan.examDate,
      plan.studyDaysPerWeek,
      plan.studyDuration
    );

    return Response.json({ success: true });
  } catch (error: any) {
    console.error("Error regenerating plan:", error);
    return Response.json(
      { error: "Failed to regenerate plan" },
      { status: 500 }
    );
  }
}
