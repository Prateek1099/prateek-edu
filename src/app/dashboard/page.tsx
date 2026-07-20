import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { BookOpen, Clock, Trophy, Target, ArrowRight, CheckCircle2, AlertCircle, AlertTriangle, FileText, Sparkles, CalendarDays, Rocket, Users } from "lucide-react";
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

  const userId = (session.user as any).id as string;
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
      where: { userId },
      select: {
        id: true,
        dueDate: true,
        status: true,
        worksheet: {
          select: {
            id: true,
            title: true,
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
  const daysUntilExam = revisionPlan ? Math.max(0, Math.ceil((new Date(revisionPlan.examDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : 0;

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
  const mistakeTopicsList = topMistakeTopics.map((t: any) => `${t.topicTag} (${t._sum.mistakeCount}×)`).join(", ");
  const contextData = `
Strong Topics: ${strongTopics.join(", ") || "None yet"}
Needs Revision: ${weakTopics.join(", ") || "None yet"}
Mistake Book: ${mistakeTotal} total, ${mistakeNeedsRevision} needs revision, ${mistakeRevised} revised
Most Repeated Mistakes: ${mistakeTopicsList || "None yet"}
Challenge Performance: ${challengeAgg._count} taken, ${challengeAgg._avg?.percentage ? Math.round(challengeAgg._avg.percentage) : 0}% average
  `.trim();
  return (
    <div className="container px-4 md:px-8 py-8 max-w-7xl mx-auto space-y-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Student Dashboard</h1>
          <p className="text-muted-foreground mt-1 text-lg">Welcome back, {session.user.name || "Student"}. Here is your learning progress.</p>
        </div>
        <div className="md:self-start pt-1 w-full md:w-auto flex flex-col md:flex-row gap-3">
          <Link 
            href="/dashboard/join"
            className={cn(
              buttonVariants({ size: "lg", variant: "outline" }), 
              "w-full md:w-auto px-6 py-6 shadow-sm hover:shadow-md transition-all text-base font-semibold"
            )}
          >
            <Users className="w-5 h-5 mr-2" /> Join a Class
          </Link>
          <Link 
            href="/dashboard/ask-teacher"
            className={cn(
              buttonVariants({ size: "lg" }), 
              "w-full md:w-auto px-6 py-6 shadow-md hover:shadow-lg transition-all text-base font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
            )}
          >
            Ask Teacher
          </Link>
        </div>
      </div>

      {/* 0. Revision Planner Widget */}
      <section>
        {revisionPlan ? (
          <Card className="bg-gradient-to-br from-primary/5 via-card to-card shadow-md border-primary/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-[0.04]">
              <CalendarDays className="w-32 h-32 text-primary" />
            </div>
            <CardContent className="p-6 relative z-10">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-5">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <CalendarDays className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold">My Revision Plan</h2>
                    <p className="text-sm text-muted-foreground">
                      {revisionPlan.qualification.toUpperCase()} · {daysUntilExam} days remaining
                    </p>
                  </div>
                </div>
                <Link 
                  href="/dashboard/revision-planner"
                  className={cn(buttonVariants({ size: "sm" }), "shadow-sm")}
                >
                  Open Full Planner <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </div>

              <div className="mb-4">
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-muted-foreground">Completion</span>
                  <span className="font-semibold">{planCompletionPct}%</span>
                </div>
                <Progress value={planCompletionPct} className="h-2" />
              </div>

              {revisionPlan.tasks.length > 0 ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Today&apos;s Tasks</p>
                  <div className="space-y-2">
                    {revisionPlan.tasks.map((task) => (
                      <div key={task.id} className="flex items-center gap-3 text-sm">
                        {task.status === "COMPLETED" ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30 shrink-0" />
                        )}
                        <span className={task.status === "COMPLETED" ? "line-through text-muted-foreground" : "font-medium"}>
                          {task.title}
                        </span>
                        {task.priority === "HIGH" && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-500/10 text-red-500">HIGH</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No tasks scheduled for today. Check your full planner for upcoming tasks.</p>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-gradient-to-br from-primary/5 via-card to-card shadow-md border-primary/20 border-dashed relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-[0.04]">
              <Rocket className="w-32 h-32 text-primary" />
            </div>
            <CardContent className="p-6 relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 text-primary" />
                  What should you study today?
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Set up your personal Revision Planner to get daily study recommendations based on your mistakes, challenges, and progress.
                </p>
              </div>
              <Link 
                href="/dashboard/revision-planner"
                className={cn(buttonVariants({ size: "lg" }), "shadow-md whitespace-nowrap")}
              >
                Set Up Planner
              </Link>
            </CardContent>
          </Card>
        )}
      </section>

      {/* 0.5 Worksheet Assignments Widget */}
      {worksheetAssignments.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" /> Assigned Worksheets
            </h2>
            <Link href="/dashboard/worksheets" className={cn(buttonVariants({ size: "sm", variant: "ghost" }), "text-primary")}>
              View All <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {worksheetAssignments.map(assignment => {
              const ws = assignment.worksheet;
              const isCompleted = assignment.status === "COMPLETED";
              const isOverdue = assignment.dueDate && new Date() > new Date(assignment.dueDate) && !isCompleted;
              const board = ws.subject.qualification.board.name;
              const qual = ws.subject.qualification.name;
              const attemptLink = `/resources/${board}/${qual}/${ws.subject.slug}/challenge/${ws.id}/attempt`;

              return (
                <Link key={assignment.id} href={isCompleted ? "#" : attemptLink} className="block group">
                  <Card className={`h-full transition-all hover:shadow-md ${isOverdue ? 'border-destructive/50' : 'hover:border-primary/40'}`}>
                    <CardContent className="p-5 flex flex-col h-full justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          {isCompleted ? (
                            <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-sm bg-emerald-500/10 text-emerald-600">
                              <CheckCircle2 className="w-3 h-3" /> Completed
                            </span>
                          ) : isOverdue ? (
                            <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-sm bg-destructive/10 text-destructive">
                              <AlertCircle className="w-3 h-3" /> Overdue
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-sm bg-primary/10 text-primary">
                              <FileText className="w-3 h-3" /> Pending
                            </span>
                          )}
                          {assignment.dueDate && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" /> {new Date(assignment.dueDate).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        <h3 className="font-bold text-base group-hover:text-primary transition-colors line-clamp-2">{ws.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1">{ws.subject.name}</p>
                      </div>
                      <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground border-t pt-3">
                        <span>{ws._count.questions} Questions</span>
                        {!isCompleted && <span className="text-primary font-medium group-hover:underline">Start →</span>}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* 1. Progress Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card shadow-sm border-border hover:border-primary/20 transition-colors">
          <CardHeader className="py-4 flex flex-row items-center justify-between space-y-0 pb-2">
             <CardTitle className="text-sm font-medium">Courses Enrolled</CardTitle>
             <Target className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
             <div className="text-2xl font-bold">{enrollments}</div>
          </CardContent>
        </Card>

        <Card className="bg-card shadow-sm border-border hover:border-primary/20 transition-colors">
          <CardHeader className="py-4 flex flex-row items-center justify-between space-y-0 pb-2">
             <CardTitle className="text-sm font-medium">Practice Attempts</CardTitle>
             <Trophy className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
             <div className="text-2xl font-bold">{challengeAgg._count}</div>
          </CardContent>
        </Card>

        <Card className="bg-card shadow-sm border-border hover:border-primary/20 transition-colors">
          <CardHeader className="py-4 flex flex-row items-center justify-between space-y-0 pb-2">
             <CardTitle className="text-sm font-medium">Average Accuracy</CardTitle>
             <Target className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
             <div className="text-2xl font-bold">{challengeAgg._avg?.percentage ? Math.round(challengeAgg._avg.percentage) : 0}%</div>
          </CardContent>
        </Card>

        <Card className="bg-card shadow-sm border-border hover:border-primary/20 transition-colors">
          <CardHeader className="py-4 flex flex-row items-center justify-between space-y-0 pb-2">
             <CardTitle className="text-sm font-medium">Topics Completed</CardTitle>
             <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
             <div className="text-2xl font-bold">{topicProgress.filter((topic) => topic.completed).length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <div className="lg:col-span-2 space-y-10">
          {/* 2. Subject Progress */}
          <section>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-primary" /> Subject Progress
            </h2>
            <Card className="bg-card shadow-sm border-border">
              <CardContent className="p-6 space-y-6">
                {subjectProgressList.length === 0 ? (
                  <div className="text-center text-muted-foreground py-4">No subject progress tracked yet. Complete practice challenges to see progress!</div>
                ) : subjectProgressList.map((sp, i) => {
                  const percentage = sp.total > 0 ? Math.round((sp.completed / sp.total) * 100) : 0;
                  return (
                    <div key={i} className="space-y-2">
                      <div className="flex justify-between text-sm font-medium">
                        <span>{sp.name}</span>
                        <span className="text-muted-foreground">{percentage}% ({sp.completed}/{sp.total})</span>
                      </div>
                      <Progress value={percentage} className="h-2" />
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          </section>

          {/* 5. Performance & Revision */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" /> Performance & Revision
              </h2>
              {mistakeTotal > 0 && (
                <Link href="/dashboard/mistakes" className={cn(buttonVariants({ size: "sm", variant: "ghost" }), "text-primary")}>
                  View Mistake Book <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              )}
            </div>

            {/* Mistake Book Summary */}
            {mistakeTotal > 0 && (
              <div className="grid grid-cols-3 gap-3 mb-4">
                <Card className="bg-card shadow-sm border-border">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold">{mistakeTotal}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Total Mistakes</p>
                  </CardContent>
                </Card>
                <Card className="bg-card shadow-sm border-amber-500/20">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{mistakeNeedsRevision}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Needs Revision</p>
                  </CardContent>
                </Card>
                <Card className="bg-card shadow-sm border-emerald-500/20">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{mistakeRevised}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Revised</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Most Repeated Mistakes + Challenge Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {topMistakeTopics.length > 0 && (
                <Card className="bg-card shadow-sm border-border">
                  <CardContent className="p-5">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-500" /> Most Repeated Mistakes
                    </h3>
                    <div className="space-y-2.5">
                      {topMistakeTopics.map((t: any, i: number) => (
                        <div key={t.topicTag} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-muted-foreground w-4">{i + 1}.</span>
                            <span className="text-sm font-medium">{t.topicTag}</span>
                          </div>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">
                            {t._sum.mistakeCount}×
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {challengeAgg._count > 0 && (
                <Card className="bg-card shadow-sm border-border">
                  <CardContent className="p-5">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-primary" /> Challenge Performance
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Challenges Taken</span>
                        <span className="font-bold">{challengeAgg._count}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Average Score</span>
                        <span className="font-bold">{challengeAgg._avg?.percentage ? Math.round(challengeAgg._avg.percentage) : 0}%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Best Score</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">{challengeAgg._max?.percentage ? Math.round(challengeAgg._max.percentage) : 0}%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Recent Challenges */}
            {recentChallenges.length > 0 && (
              <Card className="bg-card shadow-sm border-border overflow-hidden">
                <div className="divide-y divide-border">
                  {recentChallenges.map((ca: any) => (
                    <div key={ca.id} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                      <div>
                        <h4 className="font-semibold text-sm">{ca.challenge.title}</h4>
                        <p className="text-xs text-muted-foreground mt-0.5">{ca.challenge.subject.name} · {new Date(ca.completedAt).toLocaleDateString()}</p>
                      </div>
                      <Badge variant="outline" className={`${ca.percentage >= 75 ? 'border-emerald-500 text-emerald-500' : ca.percentage >= 50 ? 'border-amber-500 text-amber-500' : 'border-red-500 text-red-500'}`}>
                        {Math.round(ca.percentage)}%
                      </Badge>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Recommended Revision */}
            {topMistakeTopics.length > 0 && (
              <Card className="bg-primary/5 border-primary/20 shadow-sm mt-4">
                <CardContent className="p-5">
                  <h3 className="text-sm font-bold text-primary mb-3 flex items-center gap-2">
                    <Sparkles className="h-4 w-4" /> Recommended Revision
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {topMistakeTopics.slice(0, 3).map((t: any) => (
                      <Badge key={t.topicTag} variant="outline" className="py-1.5 px-3 text-sm border-primary/30 text-primary">
                        Review: {t.topicTag}
                      </Badge>
                    ))}
                  </div>
                  <Link href="/dashboard/mistakes" className="text-sm text-primary font-medium mt-3 inline-block hover:underline">
                    Open Mistake Book →
                  </Link>
                </CardContent>
              </Card>
            )}

            {/* Empty State */}
            {mistakeTotal === 0 && challengeAgg._count === 0 && (
              <Card className="bg-muted/20 border-dashed shadow-sm">
                <CardContent className="p-6 text-center text-muted-foreground">
                  Complete a Topic Challenge to see your performance insights here.
                </CardContent>
              </Card>
            )}
          </section>
        </div>

        {/* Right Col */}
        <div className="space-y-10 relative">
          
          <AiInsightCard contextData={contextData} />
        </div>
      </div>
    </div>
  );
}
