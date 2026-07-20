import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { RevisionOnboarding } from "./RevisionOnboarding";
import { RevisionPlannerDashboard } from "./RevisionPlannerDashboard";

export default async function RevisionPlannerPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    redirect("/login");
  }

  const userId = (session.user as { id?: string }).id;
  if (!userId) {
    redirect("/login");
  }

  // Fetch user preferences
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      preferredBoard: true,
      preferredQualification: true,
    },
  });

  // Fetch revision plan with all tasks
  const revisionPlan = await prisma.revisionPlan.findUnique({
    where: { userId },
    include: {
      tasks: {
        where: { type: { not: "PAST_PAPER" } },
        orderBy: { dueDate: "asc" },
      },
    },
  });

  // No plan — show onboarding
  if (!revisionPlan) {
    return (
      <div className="container px-4 md:px-8 py-8 max-w-7xl mx-auto">
        <Link
          href="/dashboard"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "mb-6 text-muted-foreground hover:text-foreground"
          )}
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Dashboard
        </Link>
        <RevisionOnboarding
          board={user?.preferredBoard ?? null}
          qualification={user?.preferredQualification ?? null}
        />
      </div>
    );
  }

  // Plan exists — compute stats
  const allTasks = revisionPlan.tasks;
  const totalTasks = allTasks.length;
  const completedTasks = allTasks.filter(
    (t) => t.status === "COMPLETED"
  ).length;

  // Today's date boundaries (start and end of day in local context)
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59,
    999
  );

  const todayTasks = allTasks.filter(
    (t) => t.dueDate >= todayStart && t.dueDate <= todayEnd
  );

  // Upcoming tasks: after today, grouped by date string, max 7 days
  const sevenDaysLater = new Date(todayEnd);
  sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);

  const upcomingRaw = allTasks.filter(
    (t) => t.dueDate > todayEnd && t.dueDate <= sevenDaysLater
  );

  // Serialize dates for client components
  const serializeTask = (t: (typeof allTasks)[0]) => ({
    id: t.id,
    title: t.title,
    subject: t.subject,
    topic: t.topic,
    type: t.type,
    status: t.status,
    dueDate: t.dueDate.toISOString(),
    priority: t.priority,
    source: t.source,
    sourceDetail: t.sourceDetail,
    linkUrl: t.linkUrl,
    linkLabel: t.linkLabel,
    completedAt: t.completedAt ? t.completedAt.toISOString() : null,
  });

  const serializedTasks = allTasks.map(serializeTask);
  const serializedTodayTasks = todayTasks.map(serializeTask);

  // Group upcoming by date string
  const upcomingGrouped: Record<string, ReturnType<typeof serializeTask>[]> = {};
  for (const task of upcomingRaw) {
    const dateKey = task.dueDate.toISOString().split("T")[0]; // YYYY-MM-DD
    if (!upcomingGrouped[dateKey]) {
      upcomingGrouped[dateKey] = [];
    }
    upcomingGrouped[dateKey].push(serializeTask(task));
  }

  const serializedPlan = {
    id: revisionPlan.id,
    board: revisionPlan.board,
    qualification: revisionPlan.qualification,
    examDate: revisionPlan.examDate.toISOString(),
    studyDaysPerWeek: revisionPlan.studyDaysPerWeek,
    studyDuration: revisionPlan.studyDuration,
    createdAt: revisionPlan.createdAt.toISOString(),
  };

  return (
    <div className="container px-4 md:px-8 py-8 max-w-7xl mx-auto">
      <Link
        href="/dashboard"
        className={cn(
          buttonVariants({ variant: "ghost", size: "sm" }),
          "mb-6 text-muted-foreground hover:text-foreground"
        )}
      >
        <ArrowLeft className="w-4 h-4 mr-1" />
        Back to Dashboard
      </Link>
      <RevisionPlannerDashboard
        plan={serializedPlan}
        tasks={serializedTasks}
        todayTasks={serializedTodayTasks}
        upcomingTasks={upcomingGrouped}
        totalTasks={totalTasks}
        completedTasks={completedTasks}
      />
    </div>
  );
}
