import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { BookOpen, Clock, Trophy, Target, ArrowRight, CheckCircle2, AlertCircle, AlertTriangle, FileText, Sparkles, CalendarDays, Users } from "lucide-react";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { cn } from "@/lib/utils";
import { AiInsightCard } from "./AiInsightCard";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    redirect("/login");
  }

  const role = (session.user as { role?: string }).role;
  if (role === "SUPER_ADMIN") redirect("/admin");
  if (role === "TEACHER") redirect("/workspace");

  const userId = (session.user as { id?: string }).id;
  if (!userId) {
    console.error("Dashboard error: session missing userId");
    redirect("/login");
  }

  // 1. Fetch Overview Data
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const [enrollments, topicProgress, recentChallenges, challengeAgg, mistakeStats, topMistakeTopics, revisionPlan, worksheetAssignments] = await Promise.all([
    prisma.enrollment.count({ where: { userId, paymentStatus: "completed" } }),
    prisma.userTopicProgress.findMany({
      where: { userId },
      select: {
        id: true,
        completed: true,
        topic: { select: { topicName: true, subjectId: true, subject: { select: { id: true, name: true } } } }
      },
      orderBy: { id: "desc" }
    }),
    prisma.challengeAttempt.findMany({
      where: { userId },
      select: {
        id: true,
        percentage: true,
        completedAt: true,
        challenge: { select: { title: true, subject: { select: { name: true } } } }
      },
      orderBy: { completedAt: "desc" },
      take: 5,
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
      _count: { id: true }
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
    prisma.worksheetAssignment.findMany({
      where: {
        userId,
        worksheet: { isPublished: true },
      },
      select: {
        id: true,
        dueDate: true,
        status: true,
        worksheet: {
          select: {
            id: true,
            title: true,
            type: true,
            subject: { select: { name: true, slug: true, qualification: { select: { name: true, board: { select: { name: true } } } } } },
            _count: { select: { questions: true } }
          }
        }
      },
      orderBy: { assignedAt: "desc" },
      take: 3
    })
  ]);

  const mistakeNeedsRevision = mistakeStats.find(s => s.status === "needs_revision")?._count.id || 0;
  const mistakeRevised = mistakeStats.find(s => s.status === "revised")?._count.id || 0;
  const mistakeTotal = mistakeNeedsRevision + mistakeRevised;

  // Revision plan stats
  const planTotalTasks = revisionPlan ? await prisma.revisionTask.count({ where: { revisionPlanId: revisionPlan.id, type: { not: "PAST_PAPER" } } }) : 0;
  const planCompletedTasks = revisionPlan?._count?.tasks || 0;
  const planCompletionPct = planTotalTasks > 0 ? Math.round((planCompletedTasks / planTotalTasks) * 100) : 0;
  const daysUntilExam = revisionPlan ? Math.max(0, Math.ceil((new Date(revisionPlan.examDate).getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24))) : 0;

  // 2. Process Subject Progress accurately
  const subjectIds = Array.from(new Set(topicProgress.map(tp => tp.topic.subjectId)));
  const totalTopicsPerSubject = await prisma.topic.groupBy({
    by: ['subjectId'],
    where: { subjectId: { in: subjectIds } },
    _count: { id: true }
  });

  const subjectMap = new Map<string, { name: string, completed: number, total: number }>();

  topicProgress.forEach(tp => {
    const sub = tp.topic.subject;
    if (!subjectMap.has(sub.id)) {
      const totalCount = totalTopicsPerSubject.find(t => t.subjectId === sub.id)?._count.id || 0;
      subjectMap.set(sub.id, { name: sub.name, completed: 0, total: totalCount });
    }
    const current = subjectMap.get(sub.id)!;
    if (tp.completed) {
      current.completed += 1;
    }
  });
  const subjectProgressList = Array.from(subjectMap.values());

  // 3. Process Strengths & Weaknesses heuristics
  const strongTopics = topicProgress.filter(tp => tp.completed).map(tp => tp.topic.topicName).slice(0, 4);
  const weakTopics = topicProgress.filter(tp => !tp.completed).map(tp => tp.topic.topicName).slice(0, 4);

  // 4. Generate Context & Lists for AI & Reflections
  const mistakeTopicsList = topMistakeTopics.map((t) => `${t.topicTag} (${t._sum.mistakeCount}×)`).join(", ");
  const contextData = `
Strong Topics: ${strongTopics.join(", ") || "None yet"}
Needs Revision: ${weakTopics.join(", ") || "None yet"}
Mistake Book: ${mistakeTotal} total, ${mistakeNeedsRevision} needs revision, ${mistakeRevised} revised
Most Repeated Mistakes: ${mistakeTopicsList || "None yet"}
Challenge Performance: ${challengeAgg._count} taken, ${challengeAgg._avg?.percentage ? Math.round(challengeAgg._avg.percentage) : 0}% average
  `.trim();
  return (
    <div className="container px-4 md:px-8 py-6 md:py-8 max-w-7xl mx-auto space-y-8">

      {/* ── 1. WELCOME HEADER ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            Welcome back, {session.user.name || "Student"} 👋
          </h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">
            Track your progress, revisit mistakes, and stay on top of your study plan.
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <Link
            href="/dashboard/join"
            className={cn(
              buttonVariants({ size: "sm", variant: "outline" }),
              "shadow-sm rounded-xl h-9"
            )}
          >
            <Users className="w-4 h-4 mr-1.5" /> Join Class
          </Link>
          <Link
            href="/dashboard/ask-teacher"
            className={cn(buttonVariants({ size: "sm" }), "shadow-sm rounded-xl h-9 font-medium")}
          >
            Ask Teacher
          </Link>
        </div>
      </div>

      {/* ── 2. CONTINUE LEARNING ── */}
      <section>
        {revisionPlan ? (
          <Card className="shadow-md border border-primary/20 rounded-2xl bg-card overflow-hidden">
            <CardContent className="p-5 md:p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                    <CalendarDays className="size-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-bold leading-tight">Continue Learning</h2>
                    <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                      {revisionPlan.qualification.toUpperCase()} · {daysUntilExam} day{daysUntilExam !== 1 ? "s" : ""} until exam
                    </p>
                  </div>
                </div>
                <Link
                  href="/dashboard/revision-planner"
                  className={cn(buttonVariants({ size: "sm" }), "shadow-sm shrink-0 rounded-xl gap-1 font-medium")}
                >
                  <span>Open Planner</span>
                  <ArrowRight className="size-3.5" />
                </Link>
              </div>

              <div className="mb-4">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-muted-foreground font-medium">Plan completion</span>
                  <span className="font-bold text-primary">{planCompletionPct}%</span>
                </div>
                <Progress value={planCompletionPct} className="h-2" />
              </div>

              {revisionPlan.tasks.length > 0 ? (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Today&apos;s Tasks</p>
                  <div className="space-y-2">
                    {revisionPlan.tasks.map((task) => (
                      <div key={task.id} className="flex items-center gap-2.5 text-sm p-2 rounded-lg bg-muted/30 border border-border/50">
                        {task.status === "COMPLETED" ? (
                          <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                        ) : (
                          <div className="size-4 rounded-full border-2 border-muted-foreground/40 shrink-0" />
                        )}
                        <span className={task.status === "COMPLETED" ? "line-through text-muted-foreground flex-1" : "font-medium flex-1"}>
                          {task.title}
                        </span>
                        {task.priority === "HIGH" && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-destructive/10 text-destructive shrink-0">HIGH</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No tasks scheduled for today. Check your planner for upcoming review tasks.</p>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-sm border border-border/80 hover:border-primary/40 transition-colors rounded-2xl bg-card">
            <CardContent className="p-5 md:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="size-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                  <CalendarDays className="size-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold">What should you study today?</h2>
                  <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">
                    Set up your Revision Planner to get personalized daily study tasks based on your syllabus.
                  </p>
                </div>
              </div>
              <Link
                href="/dashboard/revision-planner"
                className={cn(buttonVariants({ size: "sm" }), "shadow-sm shrink-0 rounded-xl font-semibold")}
              >
                Set Up Planner
              </Link>
            </CardContent>
          </Card>
        )}
      </section>

      {/* ── 3. THREE COMPACT METRICS ── */}
      <section className="grid grid-cols-3 gap-3 md:gap-5">
        <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-sm">
          <div className="flex items-center gap-2 text-muted-foreground mb-1.5">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Target className="size-3.5 shrink-0" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider truncate">Courses</span>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1">{enrollments}</p>
        </div>
        <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-sm">
          <div className="flex items-center gap-2 text-muted-foreground mb-1.5">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500">
              <Target className="size-3.5 shrink-0" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider truncate">Accuracy</span>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1">{challengeAgg._avg?.percentage ? Math.round(challengeAgg._avg.percentage) : 0}%</p>
        </div>
        <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-sm">
          <div className="flex items-center gap-2 text-muted-foreground mb-1.5">
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500">
              <CheckCircle2 className="size-3.5 shrink-0" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider truncate">Topics Done</span>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1">{topicProgress.filter((t) => t.completed).length}</p>
        </div>
      </section>

      {/* ── 4 & 5. MY SUBJECTS + RECOMMENDED / AI ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-8 items-start">
        {/* 4. My Subjects — wider column */}
        <section className="lg:col-span-3">
          <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" /> My Subjects
          </h2>
          {subjectProgressList.length > 0 ? (
            <div className="space-y-4 rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-sm">
              {subjectProgressList.map((sp, i) => {
                const percentage = sp.total > 0 ? Math.round((sp.completed / sp.total) * 100) : 0;
                return (
                  <div key={i} className="space-y-2">
                    <div className="flex justify-between text-sm items-center">
                      <span className="font-semibold">{sp.name}</span>
                      <span className="text-muted-foreground text-xs font-medium">{sp.completed}/{sp.total} topics · <span className="text-foreground font-semibold">{percentage}%</span></span>
                    </div>
                    <Progress value={percentage} className="h-2" />
                  </div>
                );
              })}
            </div>
          ) : (
            <Card className="rounded-2xl border border-border/80 bg-card">
              <CardContent className="p-8 flex flex-col items-center text-center gap-2">
                <div className="size-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-1">
                  <BookOpen className="size-6 text-primary" />
                </div>
                <h3 className="text-base font-bold text-foreground">No subject progress yet</h3>
                <p className="text-xs text-muted-foreground max-w-sm">Complete a practice challenge or review notes to start tracking your subject completion.</p>
              </CardContent>
            </Card>
          )}
        </section>

        {/* 5. Recommended Next + AI Insight — narrower column, stacks on mobile */}
        <section className="lg:col-span-2 space-y-5">
          {/* Recommended Revision */}
          {topMistakeTopics.length > 0 && (
            <div>
              <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" /> Recommended Next
              </h2>
              <Card className="border border-primary/20 rounded-2xl bg-card shadow-sm">
                <CardContent className="p-5">
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {topMistakeTopics.slice(0, 3).map((t, index) => (
                      <Badge key={t.topicTag ?? index} variant="outline" className="text-xs border-primary/30 text-primary bg-primary/5">
                        {t.topicTag ?? "Uncategorised"}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mb-3 leading-relaxed">These topics have the most repeated mistakes in your recent practice.</p>
                  <Link href="/dashboard/mistakes" className="text-xs text-primary font-semibold hover:underline inline-flex items-center gap-1">
                    Open Mistake Book <ArrowRight className="size-3" />
                  </Link>
                </CardContent>
              </Card>
            </div>
          )}

          {/* AI Insight */}
          <AiInsightCard contextData={contextData} />
        </section>
      </div>

      {/* ── 6. ASSIGNED WORKSHEETS ── */}
      {worksheetAssignments.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" /> Assigned Worksheets
            </h2>
            <Link href="/dashboard/worksheets" className={cn(buttonVariants({ size: "sm", variant: "ghost" }), "text-primary text-xs font-semibold")}>
              View All <ArrowRight className="size-3.5 ml-1" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {worksheetAssignments.map((assignment) => {
              const ws = assignment.worksheet;
              const isCompleted = assignment.status === "COMPLETED";
              const isOverdue = assignment.dueDate && new Date() > new Date(assignment.dueDate) && !isCompleted;
              const board = ws.subject.qualification.board.name;
              const qual = ws.subject.qualification.name;
              const isDocumentWorksheet = ws.type === "WORKSHEET" || ws.type === "PDF_WORKSHEET";
              const worksheetLink = `/resources/${board}/${qual}/${ws.subject.slug}/worksheet/${ws.id}`;
              const attemptLink = `/resources/${board}/${qual}/${ws.subject.slug}/challenge/${ws.id}/attempt`;
              const assignmentLink = isDocumentWorksheet ? worksheetLink : attemptLink;
              return (
                <Link
                  key={assignment.id}
                  href={isCompleted && !isDocumentWorksheet ? "#" : assignmentLink}
                  className="block group focus-visible:outline-none"
                >
                  <Card className={cn("h-full border transition-all duration-200 hover:shadow-md rounded-2xl bg-card", isOverdue ? "border-destructive/40" : "border-border/80 hover:border-primary/40")}>
                    <CardContent className="p-5 flex flex-col h-full justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          {isCompleted ? (
                            <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              <CheckCircle2 className="size-3" /> Done
                            </span>
                          ) : isOverdue ? (
                            <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-destructive/10 text-destructive border border-destructive/20">
                              <AlertCircle className="size-3" /> Overdue
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                              <FileText className="size-3" /> Pending
                            </span>
                          )}
                          {assignment.dueDate && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="size-3 text-muted-foreground" /> {new Date(assignment.dueDate).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        <h3 className="font-semibold text-sm group-hover:text-primary transition-colors line-clamp-2 leading-snug">{ws.title}</h3>
                        <p className="text-xs text-muted-foreground mt-1">{ws.subject.name}</p>
                      </div>
                      <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground border-t border-border/60 pt-3">
                        <span className="font-medium">{ws.type === "PDF_WORKSHEET" ? "PDF assignment" : `${ws._count.questions} questions`}</span>
                        {isDocumentWorksheet ? (
                          <span className="text-primary font-semibold group-hover:underline">View worksheet →</span>
                        ) : (
                          !isCompleted && <span className="text-primary font-semibold group-hover:underline">Start challenge →</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* ── 7. RECENT ACTIVITY (secondary) ── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Trophy className="w-4 h-4 text-primary" /> Recent Activity
          </h2>
          {mistakeTotal > 0 && (
            <Link href="/dashboard/mistakes" className={cn(buttonVariants({ size: "sm", variant: "ghost" }), "text-primary text-xs font-semibold")}>
              Mistake Book <ArrowRight className="size-3.5 ml-1" />
            </Link>
          )}
        </div>

        {/* Challenge Performance + Mistakes — compact inline strip */}
        {(challengeAgg._count > 0 || mistakeTotal > 0) && (
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm mb-4 px-1">
            {challengeAgg._count > 0 && (
              <>
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">Challenges:</span>
                  <span className="font-semibold">{challengeAgg._count}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">Avg:</span>
                  <span className="font-semibold">{challengeAgg._avg?.percentage ? Math.round(challengeAgg._avg.percentage) : 0}%</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">Best:</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">{challengeAgg._max?.percentage ? Math.round(challengeAgg._max.percentage) : 0}%</span>
                </div>
              </>
            )}
            {mistakeTotal > 0 && (
              <>
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">Mistakes:</span>
                  <span className="font-semibold">{mistakeTotal}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">Needs revision:</span>
                  <span className="font-semibold text-amber-600 dark:text-amber-400">{mistakeNeedsRevision}</span>
                </div>
              </>
            )}
          </div>
        )}

        {/* Recent Challenges list */}
        {recentChallenges.length > 0 ? (
          <Card className="overflow-hidden rounded-2xl border border-border/80 bg-card">
            <div className="divide-y divide-border/60">
              {recentChallenges.map((ca) => (
                <div key={ca.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors">
                  <div className="min-w-0">
                    <h4 className="font-semibold text-sm truncate">{ca.challenge.title}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">{ca.challenge.subject.name} · {new Date(ca.completedAt).toLocaleDateString()}</p>
                  </div>
                  <Badge variant="outline" className={cn(
                    "shrink-0 ml-3 font-bold px-2.5 py-0.5 rounded-full",
                    ca.percentage >= 75 ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" :
                    ca.percentage >= 50 ? "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400" :
                    "border-destructive/30 bg-destructive/10 text-destructive"
                  )}>
                    {Math.round(ca.percentage)}%
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        ) : (
          <Card className="rounded-2xl border border-border/80 bg-card">
            <CardContent className="p-8 flex flex-col items-center text-center gap-2">
              <div className="size-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-1">
                <Trophy className="size-6 text-primary" />
              </div>
              <h3 className="text-base font-bold text-foreground">No challenges attempted yet</h3>
              <p className="text-xs text-muted-foreground max-w-sm">Complete a practice challenge or quiz in any subject to see your results tracked here.</p>
            </CardContent>
          </Card>
        )}

        {/* Most Repeated Mistakes — compact */}
        {topMistakeTopics.length > 0 && (
          <div className="mt-4 rounded-2xl border border-border/80 bg-card p-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
              <AlertTriangle className="size-3.5 text-amber-500" /> Most Repeated Mistakes
            </h3>
            <div className="space-y-2">
              {topMistakeTopics.map((t, i) => (
                <div key={t.topicTag ?? i} className="flex items-center justify-between text-sm">
                  <span className="font-medium">{t.topicTag ?? "Uncategorised"}</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">
                    {t._sum.mistakeCount}×
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

    </div>
  );
}
