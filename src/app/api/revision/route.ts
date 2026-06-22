import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/revision
 * Returns the current user's revision plan with all tasks ordered by dueDate.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;

    const plan = await prisma.revisionPlan.findUnique({
      where: { userId },
      include: {
        tasks: {
          orderBy: { dueDate: "asc" },
        },
      },
    });

    if (!plan) {
      return Response.json({ plan: null });
    }

    return Response.json({ plan });
  } catch (error: any) {
    console.error("Error fetching revision plan:", error);
    return Response.json(
      { error: "Failed to fetch revision plan" },
      { status: 500 }
    );
  }
}
