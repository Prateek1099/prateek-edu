import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateRevisionTasks } from "@/lib/plan-engine";

// GET: Fetch user's mistake entries
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status"); // "needs_revision" | "revised" | null (all)

  const where: any = { userId };
  if (status === "needs_revision" || status === "revised") {
    where.status = status;
  }

  const mistakes = await prisma.mistakeEntry.findMany({
    where,
    include: {
      question: {
        select: {
          questionText: true,
          optionA: true,
          optionB: true,
          optionC: true,
          optionD: true,
          explanation: true,
        },
      },
      challenge: {
        select: {
          id: true,
          title: true,
          subject: { select: { name: true, slug: true, qualification: { select: { name: true, board: { select: { name: true } } } } } },
        },
      },
    },
    orderBy: [{ mistakeCount: "desc" }, { updatedAt: "desc" }],
  });

  return Response.json({ mistakes });
}

// PATCH: Toggle mistake status
export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;

  try {
    const { id, status } = await request.json();

    if (!id || !["needs_revision", "revised"].includes(status)) {
      return Response.json({ error: "Invalid request" }, { status: 400 });
    }

    // Verify ownership
    const entry = await prisma.mistakeEntry.findFirst({
      where: { id, userId },
    });

    if (!entry) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.mistakeEntry.update({
      where: { id },
      data: { status },
    });

    // AUTO-REGENERATE REVISION PLAN: Refresh tasks when mistake status changes
    try {
      const plan = await prisma.revisionPlan.findUnique({ where: { userId } });
      if (plan) {
        await generateRevisionTasks(
          userId, plan.id, plan.board, plan.qualification,
          plan.examDate, plan.studyDaysPerWeek, plan.studyDuration
        );
      }
    } catch (regenErr) {
      console.error("Revision plan auto-regeneration failed:", regenErr);
    }

    return Response.json({ success: true });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
