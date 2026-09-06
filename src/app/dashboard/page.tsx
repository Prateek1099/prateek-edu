import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  School,
  Trophy,
  Users,
} from "lucide-react";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AiInsightCard } from "./AiInsightCard";
import { StudentAssignmentRow } from "@/components/student/StudentAssignmentRow";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withStudentReturnTo } from "@/lib/student-assignment-navigation";
import {
  getStudentWorkDisplayState,
  orderStudentWork,
} from "@/lib/student-work-presentation";
import { getStudentWorkspaceAssignments } from "@/lib/workspace-assignment-service";
import type { StudentAssignedWork } from "@/lib/workspace-assignment-service";
import { getStudentWorkspaceClasses } from "@/lib/student-workspace-classes";
import { cn } from "@/lib/utils";
import { formatAssignmentDueDate } from "@/lib/workspace-assignment-rules";

function getAssignmentPresentation(assignment: StudentAssignedWork, returnTo: string) {
  const challenge = assignment.challenge;
  const board = challenge.subject.boardName;
  const qualification = challenge.subject.qualificationName;
  const isDocument = challenge.type === "WORKSHEET" || challenge.type === "PDF_WORKSHEET";
  const worksheetHref = withStudentReturnTo(
    `/resources/${board}/${qualification}/${challenge.subject.slug}/worksheet/${challenge.id}`,
    returnTo,
    assignment.source === "DURABLE" ? assignment.id : undefined,
  );
  const practiceHref = withStudentReturnTo(
    assignment.attemptSummary
      ? `/resources/${board}/${qualification}/${challenge.subject.slug}/challenge/${challenge.id}/results/${assignment.attemptSummary.latestAttemptId}`
      : `/resources/${board}/${qualification}/${challenge.subject.slug}/challenge/${challenge.id}/attempt`,
    returnTo,
  );

  return {
    href: isDocument ? worksheetHref : practiceHref,
    actionLabel: isDocument
      ? "Open worksheet"
      : assignment.attemptSummary ? "Review answers" : "Start practice",
    typeLabel: isDocument ? "Worksheet" : "Practice set",
    detail: isDocument
      ? challenge.type === "PDF_WORKSHEET" ? "PDF worksheet" : "View and complete"
      : `${challenge.questionCount} questions`,
    note: isDocument
      ? assignment.source === "DURABLE"
        ? "This worksheet is not scored. Mark it as done after you finish."
        : "Completion is not tracked for this earlier assignment."
      : null,
    scoreText: assignment.attemptSummary
      ? `Latest ${Math.round(assignment.attemptSummary.latestPercentage)}% · Best ${Math.round(assignment.attemptSummary.bestPercentage)}%`
      : null,
  };
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const role = (session.user as { role?: string }).role;
  if (role === "SUPER_ADMIN") redirect("/admin");
  if (role === "TEACHER") redirect("/workspace");

  const userId = (session.user as { id?: string }).id;
  if (!userId) redirect("/login");

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  const [
    topicProgress,
    recentChallenges,
    challengeAgg,
    mistakeStats,
    topMistakeTopics,
    revisionPlan,
    assignments,
    myClasses,
  ] = await Promise.all([
    prisma.userTopicProgress.findMany({
      where: { userId },
      select: {
        id: true,
        completed: true,
        topic: {
          select: {
            topicName: true,
            subjectId: true,
            subject: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { id: "desc" },
    }),
    prisma.challengeAttempt.findMany({
      where: { userId },
      select: {
        id: true,
        percentage: true,
        completedAt: true,
        challenge: { select: { title: true, subject: { select: { name: true } } } },
      },
      orderBy: { completedAt: "desc" },
      take: 4,
    }),
    prisma.challengeAttempt.aggregate({
      where: { userId },
      _avg: { percentage: true },
      _max: { percentage: true },
      _count: true,
    }),
    prisma.mistakeEntry.groupBy({
      by: ["status"],
      where: { userId },
      _count: { id: true },
    }),
    prisma.mistakeEntry.groupBy({
      by: ["topicTag"],
      where: { userId, topicTag: { not: null } },
      _sum: { mistakeCount: true },
      orderBy: { _sum: { mistakeCount: "desc" } },
      take: 5,
    }),
    prisma.revisionPlan.findUnique({
      where: { userId },
      include: {
        tasks: {
          where: { type: { not: "PAST_PAPER" }, dueDate: { gte: todayStart, lte: todayEnd } },
          orderBy: { createdAt: "asc" },
          take: 5,
        },
        _count: {
          select: { tasks: { where: { type: { not: "PAST_PAPER" }, status: { not: "PENDING" } } } },
        },
      },
    }),
    getStudentWorkspaceAssignments(userId),
    getStudentWorkspaceClasses(userId, now),
  ]);

  const mistakeNeedsRevision = mistakeStats.find((item) => item.status === "needs_revision")?._count.id || 0;
  const mistakeRevised = mistakeStats.find((item) => item.status === "revised")?._count.id || 0;
  const mistakeTotal = mistakeNeedsRevision + mistakeRevised;

  const planTotalTasks = revisionPlan
    ? await prisma.revisionTask.count({ where: { revisionPlanId: revisionPlan.id, type: { not: "PAST_PAPER" } } })
    : 0;
  const planCompletedTasks = revisionPlan?._count?.tasks || 0;
  const planCompletionPct = planTotalTasks > 0
    ? Math.round((planCompletedTasks / planTotalTasks) * 100)
    : 0;
  const daysUntilExam = revisionPlan
    ? Math.max(0, Math.ceil((new Date(revisionPlan.examDate).getTime() - todayStart.getTime()) / 86_400_000))
    : 0;

  const subjectIds = Array.from(new Set(topicProgress.map((progress) => progress.topic.subjectId)));
  const totalTopicsPerSubject = subjectIds.length
    ? await prisma.topic.groupBy({
        by: ["subjectId"],
        where: { subjectId: { in: subjectIds } },
        _count: { id: true },
      })
    : [];
  const subjectMap = new Map<string, { name: string; completed: number; total: number }>();
  for (const progress of topicProgress) {
    const subject = progress.topic.subject;
    if (!subjectMap.has(subject.id)) {
      const total = totalTopicsPerSubject.find((item) => item.subjectId === subject.id)?._count.id || 0;
      subjectMap.set(subject.id, { name: subject.name, completed: 0, total });
    }
    if (progress.completed) subjectMap.get(subject.id)!.completed += 1;
  }
  const subjectProgressList = Array.from(subjectMap.values());

  const orderedAssignments = orderStudentWork(assignments, now);
  const workToDo = orderedAssignments
    .filter((assignment) => getStudentWorkDisplayState(assignment, now) !== "COMPLETED")
    .slice(0, 5);
  const recentlyCompleted = orderedAssignments
    .filter((assignment) => getStudentWorkDisplayState(assignment, now) === "COMPLETED")
    .slice(0, 3);

  const strongTopics = topicProgress.filter((progress) => progress.completed).map((progress) => progress.topic.topicName).slice(0, 4);
  const weakTopics = topicProgress.filter((progress) => !progress.completed).map((progress) => progress.topic.topicName).slice(0, 4);
  const mistakeTopicsList = topMistakeTopics.map((topic) => `${topic.topicTag} (${topic._sum.mistakeCount}×)`).join(", ");
  const contextData = `
Strong Topics: ${strongTopics.join(", ") || "None yet"}
Needs Revision: ${weakTopics.join(", ") || "None yet"}
Mistake Book: ${mistakeTotal} total, ${mistakeNeedsRevision} needs revision, ${mistakeRevised} revised
Most Repeated Mistakes: ${mistakeTopicsList || "None yet"}
Challenge Performance: ${challengeAgg._count} taken, ${challengeAgg._avg?.percentage ? Math.round(challengeAgg._avg.percentage) : 0}% average
  `.trim();

  return (
    <main className="container mx-auto max-w-6xl space-y-9 px-4 py-7 sm:py-9 md:px-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-primary">Student home</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Welcome back, {session.user.name || "Student"}</h1>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">Start with your class work, then continue learning at your own pace.</p>
        </div>
        <div className="flex flex-col gap-2 min-[390px]:flex-row">
          <Link href="/dashboard/join" className={cn(buttonVariants({ size: "sm", variant: "outline" }), "min-h-10 rounded-xl")}>
            <Users className="size-4" /> Join class
          </Link>
          <Link href="/dashboard/ask-teacher" className={cn(buttonVariants({ size: "sm" }), "min-h-10 rounded-xl")}>Ask teacher</Link>
        </div>
      </header>

      <section aria-labelledby="today-work-heading">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="today-work-heading" className="text-xl font-semibold tracking-tight">Today&apos;s work</h2>
            <p className="mt-1 text-sm text-muted-foreground">Overdue and due work comes first. Items without a due date are labelled clearly.</p>
          </div>
          {assignments.length > 0 ? <Link href="/dashboard/worksheets" className="inline-flex min-h-10 items-center text-sm font-semibold text-primary hover:underline">All assigned work <ArrowRight className="ml-1 size-4" /></Link> : null}
        </div>
        {workToDo.length > 0 ? (
          <div className="divide-y divide-border/70 overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
            {workToDo.map((assignment) => {
              const state = getStudentWorkDisplayState(assignment, now);
              const presentation = getAssignmentPresentation(assignment, "/dashboard");
              return <StudentAssignmentRow key={assignment.id} title={assignment.challenge.title} typeLabel={presentation.typeLabel} context={`${assignment.className} · ${assignment.challenge.subject.name}`} state={state} dueText={assignment.dueDate ? `Due ${formatAssignmentDueDate(assignment.dueDate)}` : `Assigned ${assignment.assignedAt.toLocaleDateString()}`} detail={presentation.detail} note={presentation.note} actionHref={presentation.href} actionLabel={presentation.actionLabel} />;
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-5 py-10 text-center">
            <CheckCircle2 className="mx-auto size-9 text-emerald-600 dark:text-emerald-400" />
            <h3 className="mt-3 font-semibold">You&apos;re all caught up.</h3>
            <p className="mt-1 text-sm text-muted-foreground">Nothing is waiting for you right now.</p>
            <Link href="/dashboard/classes" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-4 rounded-xl")}>Open my classes</Link>
          </div>
        )}
      </section>

      <section aria-labelledby="my-classes-heading">
        <div className="mb-3 flex items-center justify-between gap-4">
          <div><h2 id="my-classes-heading" className="text-xl font-semibold tracking-tight">My classes</h2><p className="mt-1 text-sm text-muted-foreground">Open a class to see work from that teacher.</p></div>
          {myClasses.length > 0 ? <Link href="/dashboard/classes" className="inline-flex min-h-10 shrink-0 items-center text-sm font-semibold text-primary hover:underline">All classes <ArrowRight className="ml-1 size-4" /></Link> : null}
        </div>
        {myClasses.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {myClasses.slice(0, 3).map((studentClass) => {
              const teacherName = studentClass.workspace.owner.name || studentClass.workspace.owner.email || "Teacher";
              return (
                <Card key={studentClass.id} className="rounded-2xl border-border/80 bg-card shadow-sm">
                  <CardContent className="flex h-full flex-col p-5">
                    <p className="text-sm font-medium text-primary">{studentClass.subject?.name || "Class workspace"}</p>
                    <h3 className="mt-1 text-lg font-semibold">{studentClass.name}</h3>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{teacherName} · {studentClass.academicYear}</p>
                    <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 border-t border-border/70 pt-3 text-xs"><span><strong>{studentClass.assignmentCounts.pending}</strong> to do</span>{studentClass.assignmentCounts.overdue > 0 ? <span className="font-semibold text-destructive">{studentClass.assignmentCounts.overdue} overdue</span> : null}<span className="text-muted-foreground">{studentClass.assignmentCounts.completed} completed</span></div>
                    <Link href={`/dashboard/classes/${studentClass.id}`} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-4 min-h-10 w-full rounded-xl")}>Open class</Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-5 py-10 text-center"><School className="mx-auto size-9 text-muted-foreground" /><h3 className="mt-3 font-semibold">You haven&apos;t joined a class yet.</h3><p className="mt-1 text-sm text-muted-foreground">Use a class code from your teacher to get started.</p><Link href="/dashboard/join" className={cn(buttonVariants({ size: "sm" }), "mt-4 rounded-xl")}>Join class</Link></div>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-5">
        <section className="lg:col-span-3" aria-labelledby="continue-learning-heading">
          <h2 id="continue-learning-heading" className="text-lg font-semibold">Continue learning</h2>
          <div className="mt-3 rounded-2xl border border-border/80 bg-card p-5 shadow-sm sm:p-6">
            {revisionPlan ? (
              <><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="font-semibold">Revision plan</p><p className="mt-1 text-sm text-muted-foreground">{revisionPlan.qualification.toUpperCase()} · {daysUntilExam} day{daysUntilExam === 1 ? "" : "s"} until exam</p></div><Link href="/dashboard/revision-planner" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "min-h-10 rounded-xl")}>Open planner</Link></div><div className="mt-4"><div className="mb-1.5 flex justify-between text-xs"><span className="text-muted-foreground">Plan completion</span><span className="font-semibold">{planCompletionPct}%</span></div><Progress value={planCompletionPct} className="h-2" /></div>{revisionPlan.tasks.length > 0 ? <div className="mt-4 divide-y divide-border/60 border-t border-border/60">{revisionPlan.tasks.map((task) => <div key={task.id} className="flex items-center gap-3 py-3 text-sm">{task.status === "COMPLETED" ? <CheckCircle2 className="size-4 text-emerald-600" /> : <span className="size-4 rounded-full border border-muted-foreground/50" />}<span className={cn("flex-1", task.status === "COMPLETED" && "text-muted-foreground line-through")}>{task.title}</span></div>)}</div> : <p className="mt-4 text-sm text-muted-foreground">No revision tasks are scheduled for today.</p>}</>
            ) : (
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold">Plan your revision</p><p className="mt-1 text-sm text-muted-foreground">Create a study plan when you are ready to organise exam revision.</p></div><Link href="/dashboard/revision-planner" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "min-h-10 rounded-xl")}>Set up planner</Link></div>
            )}
          </div>
        </section>
        <section className="lg:col-span-2" aria-labelledby="revision-heading"><h2 id="revision-heading" className="text-lg font-semibold">Mistakes and revision</h2><div className="mt-3 rounded-2xl border border-border/80 bg-card p-5 shadow-sm"><div className="flex items-start justify-between gap-4"><div><p className="font-semibold">{mistakeNeedsRevision} to review</p><p className="mt-1 text-sm text-muted-foreground">{mistakeRevised} marked revised</p></div><BookOpen className="size-5 text-primary" /></div><Link href="/dashboard/mistakes" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-4 min-h-10 w-full rounded-xl")}>Open Mistake Book</Link></div></section>
      </div>

      {recentlyCompleted.length > 0 ? (
        <section aria-labelledby="completed-heading"><h2 id="completed-heading" className="text-lg font-semibold">Recently completed</h2><p className="mt-1 text-sm text-muted-foreground">Completed class work stays available for review.</p><div className="mt-3 divide-y divide-border/70 overflow-hidden rounded-2xl border border-border/80 bg-card">{recentlyCompleted.map((assignment) => { const presentation = getAssignmentPresentation(assignment, "/dashboard"); return <StudentAssignmentRow key={assignment.id} title={assignment.challenge.title} typeLabel={presentation.typeLabel} context={`${assignment.className} · ${assignment.challenge.subject.name}`} state="COMPLETED" dueText={`Assigned ${assignment.assignedAt.toLocaleDateString()}`} detail={presentation.detail} scoreText={presentation.scoreText} actionHref={presentation.href} actionLabel={presentation.actionLabel} />; })}</div></section>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-5">
        <section className="lg:col-span-3" aria-labelledby="progress-heading"><h2 id="progress-heading" className="text-lg font-semibold">Learning progress</h2>{subjectProgressList.length > 0 ? <div className="mt-3 space-y-4 rounded-2xl border border-border/80 bg-card p-5 shadow-sm">{subjectProgressList.map((subject) => { const percentage = subject.total > 0 ? Math.round((subject.completed / subject.total) * 100) : 0; return <div key={subject.name}><div className="mb-1.5 flex justify-between gap-3 text-sm"><span className="font-medium">{subject.name}</span><span className="text-xs text-muted-foreground">{subject.completed}/{subject.total} topics</span></div><Progress value={percentage} className="h-2" /></div>; })}</div> : <div className="mt-3 rounded-2xl border border-dashed border-border bg-muted/20 p-5 text-sm text-muted-foreground">Your subject progress will appear after you start learning.</div>}</section>
        <section className="lg:col-span-2"><AiInsightCard contextData={contextData} /></section>
      </div>

      <section aria-labelledby="recent-heading"><div className="flex items-center justify-between gap-4"><h2 id="recent-heading" className="text-lg font-semibold">Recent practice</h2>{mistakeTotal > 0 ? <Link href="/dashboard/mistakes" className="text-sm font-semibold text-primary hover:underline">Review mistakes</Link> : null}</div>{recentChallenges.length > 0 ? <div className="mt-3 divide-y divide-border/70 overflow-hidden rounded-2xl border border-border/80 bg-card">{recentChallenges.map((attempt) => <div key={attempt.id} className="flex items-center justify-between gap-4 px-4 py-3 sm:px-5"><div className="min-w-0"><p className="truncate text-sm font-medium">{attempt.challenge.title}</p><p className="mt-0.5 text-xs text-muted-foreground">{attempt.challenge.subject.name} · {attempt.completedAt.toLocaleDateString()}</p></div><span className="shrink-0 text-sm font-semibold">{Math.round(attempt.percentage)}%</span></div>)}</div> : <div className="mt-3 rounded-2xl border border-dashed border-border bg-muted/20 p-5 text-sm text-muted-foreground">Completed practice sets will appear here.</div>}</section>

      <section className="border-t border-border/70 pt-7" aria-labelledby="explore-heading"><div><h2 id="explore-heading" className="text-lg font-semibold">Explore more learning</h2><p className="mt-1 text-sm text-muted-foreground">Browse Vexa when your assigned work is under control.</p></div><div className="mt-3 grid gap-3 sm:grid-cols-2"><Link href="/resources" className="flex min-h-16 items-center justify-between rounded-2xl border border-border/80 bg-card px-4 py-3 text-sm font-semibold transition-colors hover:border-primary/40 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><span className="inline-flex items-center gap-2"><BookOpen className="size-4 text-primary" /> Learning resources</span><ArrowRight className="size-4 text-muted-foreground" /></Link><Link href="/courses" className="flex min-h-16 items-center justify-between rounded-2xl border border-border/80 bg-card px-4 py-3 text-sm font-semibold transition-colors hover:border-primary/40 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><span className="inline-flex items-center gap-2"><Trophy className="size-4 text-primary" /> Courses</span><ArrowRight className="size-4 text-muted-foreground" /></Link></div></section>
    </main>
  );
}
