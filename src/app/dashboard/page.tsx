import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { BookOpen, Bookmark, Clock, Trophy, Target, PlayCircle, FolderOpen, Flame, ArrowRight, CheckCircle2, AlertCircle, AlertTriangle, FileText, Sparkles, CalendarDays, Rocket } from "lucide-react";
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

  const userId = (session.user as any).id;

  // 1. Fetch Overview Data
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const [papersCompleted, papersInProgress, enrollments, recentPapers, topicProgress, recentActivityCount, recentChallenges, challengeAgg, mistakeTotal, mistakeNeedsRevision, mistakeRevised, topMistakeTopics, revisionPlan, worksheetAssignments] = await Promise.all([
    prisma.userProgress.count({ where: { userId, status: "completed" } }),
    prisma.userProgress.count({ where: { userId, status: "in_progress" } }),
    prisma.enrollment.count({ where: { userId, paymentStatus: "completed" } }),
    prisma.userProgress.findMany({
      where: { userId },
      include: { paper: { include: { subject: { include: { qualification: true } } } } },
      orderBy: { lastViewed: "desc" },
    }),
    prisma.userTopicProgress.findMany({
      where: { userId },
      include: { topic: { include: { subject: true } } },
      orderBy: { id: "desc" }
    }),
    prisma.userProgress.count({
      where: { userId, lastViewed: { gte: sevenDaysAgo } }
    }),
    prisma.challengeAttempt.findMany({
      where: { userId },
      include: { challenge: { include: { subject: true } } },
      orderBy: { completedAt: "desc" },
      take: 5,
    }),
    prisma.challengeAttempt.aggregate({
      where: { userId },
      _avg: { percentage: true },
      _max: { percentage: true },
      _count: true,
    }),
    prisma.mistakeEntry.count({ where: { userId } }),
    prisma.mistakeEntry.count({ where: { userId, status: "needs_revision" } }),
    prisma.mistakeEntry.count({ where: { userId, status: "revised" } }),
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
          where: { dueDate: { gte: todayStart, lte: todayEnd } },
          orderBy: { createdAt: "asc" },
          take: 5,
        },
        _count: {
          select: {
            tasks: { where: { status: { not: "PENDING" } } },
          },
        },
      },
    }),
    prisma.worksheetAssignment.findMany({
      where: { userId },
      include: {
        worksheet: {
          include: {
            subject: { include: { qualification: { include: { board: true } } } },
            _count: { select: { questions: true } }
          }
        }
      },
      orderBy: { assignedAt: "desc" },
      take: 3
    })
  ]);

  // Revision plan stats
  const planTotalTasks = revisionPlan ? await prisma.revisionTask.count({ where: { revisionPlanId: revisionPlan.id } }) : 0;
  const planCompletedTasks = revisionPlan?._count?.tasks || 0;
  const planCompletionPct = planTotalTasks > 0 ? Math.round((planCompletedTasks / planTotalTasks) * 100) : 0;
  const daysUntilExam = revisionPlan ? Math.max(0, Math.ceil((new Date(revisionPlan.examDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : 0;

  const allPapers = recentPapers; // Renamed for clarity since it fetches all now
  const recentPapersSliced = allPapers.slice(0, 6);
  const completedList = allPapers.filter((p: any) => p.status === 'completed');
  const inProgressList = allPapers.filter((p: any) => p.status === 'in_progress');

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
Completed Papers: ${papersCompleted}
Papers In Progress: ${papersInProgress}
Recent Papers Viewed (Last 7 days): ${recentActivityCount}
Strong Topics: ${strongTopics.join(", ") || "None yet"}
Needs Revision: ${weakTopics.join(", ") || "None yet"}
Mistake Book: ${mistakeTotal} total, ${mistakeNeedsRevision} needs revision, ${mistakeRevised} revised
Most Repeated Mistakes: ${mistakeTopicsList || "None yet"}
Challenge Performance: ${challengeAgg._count} taken, ${challengeAgg._avg?.percentage ? Math.round(challengeAgg._avg.percentage) : 0}% average
  `.trim();
  const recentTopicsList = Array.from(new Set(topicProgress.map(tp => tp.topic.topicName))).slice(0, 6);
  
  // 5. Smart Recommendation (Rule-based)
  const recommendedPaper = allPapers.find((p: any) => p.status !== 'completed') || allPapers[0];

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
        
        <Dialog>
          <DialogTrigger render={
            <button type="button" className="text-left w-full focus:outline-none rounded-xl">
              <Card className="bg-card shadow-sm border-border hover:border-primary/40 transition-colors cursor-pointer group">
                <CardHeader className="py-4 flex flex-row items-center justify-between space-y-0 pb-2">
                   <CardTitle className="text-sm font-medium group-hover:text-primary transition-colors">Papers Completed</CardTitle>
                   <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                </CardHeader>
                <CardContent>
                   <div className="text-2xl font-bold">{papersCompleted}</div>
                </CardContent>
              </Card>
            </button>
          } />
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Completed Papers</DialogTitle>
              <DialogDescription>A complete list of papers you have successfully finished.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 mt-2">
               {completedList.length === 0 ? (
                 <p className="text-sm text-muted-foreground">No completed papers yet.</p>
               ) : (
                 completedList.map((rp: any) => (
                    <div key={rp.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors">
                      <div>
                        <h4 className="font-semibold text-sm">Paper {rp.paper.paperNumber} {rp.paper.variant ? `V${rp.paper.variant}` : ''} • {rp.paper.year} {rp.paper.season}</h4>
                        <p className="text-xs text-muted-foreground mt-0.5">{rp.paper.subject.name} ({rp.paper.subject.code})</p>
                      </div>
                      <Link 
                        href={`/papers/viewer?qp=${encodeURIComponent(rp.paper.questionPdfUrl || '')}&ms=${encodeURIComponent(rp.paper.msPdfUrl || '')}&id=${rp.paper.id}`}
                        className={cn(buttonVariants({ size: "sm", variant: "secondary" }), "mt-3 sm:mt-0")}
                      >
                        Review
                      </Link>
                    </div>
                 ))
               )}
            </div>
          </DialogContent>
        </Dialog>
        
        <Dialog>
          <DialogTrigger render={
            <button type="button" className="text-left w-full focus:outline-none rounded-xl">
              <Card className="bg-card shadow-sm border-border hover:border-primary/40 transition-colors cursor-pointer group">
                <CardHeader className="py-4 flex flex-row items-center justify-between space-y-0 pb-2">
                   <CardTitle className="text-sm font-medium group-hover:text-primary transition-colors">In Progress</CardTitle>
                   <Clock className="h-4 w-4 text-amber-500" />
                </CardHeader>
                <CardContent>
                   <div className="text-2xl font-bold">{papersInProgress}</div>
                </CardContent>
              </Card>
            </button>
          } />
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>In Progress</DialogTitle>
              <DialogDescription>Papers you've started but haven't marked as completed yet.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 mt-2">
               {inProgressList.length === 0 ? (
                 <p className="text-sm text-muted-foreground">No papers in progress.</p>
               ) : (
                 inProgressList.map((rp: any) => (
                    <div key={rp.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors">
                      <div>
                        <h4 className="font-semibold text-sm">Paper {rp.paper.paperNumber} {rp.paper.variant ? `V${rp.paper.variant}` : ''} • {rp.paper.year} {rp.paper.season}</h4>
                        <p className="text-xs text-muted-foreground mt-0.5">{rp.paper.subject.name} ({rp.paper.subject.code})</p>
                      </div>
                      <Link 
                        href={`/papers/viewer?qp=${encodeURIComponent(rp.paper.questionPdfUrl || '')}&ms=${encodeURIComponent(rp.paper.msPdfUrl || '')}&id=${rp.paper.id}`}
                        className={cn(buttonVariants({ size: "sm", variant: "default" }), "mt-3 sm:mt-0")}
                      >
                        Resume
                      </Link>
                    </div>
                 ))
               )}
            </div>
          </DialogContent>
        </Dialog>

        <Card className="bg-card shadow-sm border-border hover:border-primary/20 transition-colors">
          <CardHeader className="py-4 flex flex-row items-center justify-between space-y-0 pb-2">
             <CardTitle className="text-sm font-medium">Active Streak</CardTitle>
             <Flame className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
             <div className="text-2xl font-bold">{recentActivityCount} <span className="text-sm font-normal text-muted-foreground">recent actions</span></div>
          </CardContent>
        </Card>

        <Card className="bg-card shadow-sm border-border hover:border-primary/20 transition-colors">
          <CardHeader className="py-4 flex flex-row items-center justify-between space-y-0 pb-2">
             <CardTitle className="text-sm font-medium">Courses Enrolled</CardTitle>
             <Target className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
             <div className="text-2xl font-bold">{enrollments}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <div className="lg:col-span-2 space-y-10">
          {/* 2. Continue Learning Section */}
          {recentPapersSliced.length > 0 && (
            <section>
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <PlayCircle className="w-5 h-5 text-primary" /> Continue Learning
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {recentPapersSliced.slice(0, 2).map((rp: any) => (
                  <Link key={rp.id} href={`/papers/viewer?qp=${encodeURIComponent(rp.paper.questionPdfUrl || '')}&ms=${encodeURIComponent(rp.paper.msPdfUrl || '')}&id=${rp.paper.id}`} className="block h-full">
                    <Card className="hover:border-primary/50 transition-colors shadow-sm bg-card group cursor-pointer h-full">
                      <CardHeader className="pb-2">
                        <CardDescription className="text-xs font-semibold text-primary/80 uppercase tracking-wider">{rp.paper.subject.code || rp.paper.subject.name}</CardDescription>
                        <CardTitle className="text-lg group-hover:text-primary transition-colors">{rp.paper.year} • {rp.paper.season}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex justify-between items-center text-sm text-muted-foreground">
                          <span>Paper {rp.paper.paperNumber} {rp.paper.variant ? `V${rp.paper.variant}` : ''}</span>
                          <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${rp.status === 'completed' ? 'text-emerald-600 bg-emerald-500/10 dark:text-emerald-500' : 'text-yellow-600 bg-yellow-500/10 dark:text-yellow-500'}`}>
                            {rp.status === 'completed' ? <CheckCircle2 className="w-3 h-3"/> : <Clock className="w-3 h-3"/>} 
                            {rp.status === 'completed' ? 'Completed' : 'In Progress'}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* 3. Paper Tracker */}
          <section>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-primary" /> Recent Paper Activity
            </h2>
            <Card className="bg-card shadow-sm border-border overflow-hidden">
              <div className="divide-y divide-border">
                {recentPapersSliced.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    No recent papers found. <Link href="/resources" className="text-primary hover:underline">Start practicing</Link>
                  </div>
                ) : recentPapersSliced.map((rp: any) => (
                  <div key={rp.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-4 mb-3 sm:mb-0">
                      <div>
                        <h4 className="font-semibold text-foreground">Paper {rp.paper.paperNumber} {rp.paper.variant ? `V${rp.paper.variant}` : ''} • {rp.paper.year} {rp.paper.season}</h4>
                        <p className="text-sm text-muted-foreground">{rp.paper.subject.name} ({rp.paper.subject.code})</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 w-full sm:w-auto mt-2 sm:mt-0">
                       <span className="text-xs text-muted-foreground hidden md:block">Last viewed: {new Date(rp.lastViewed).toLocaleDateString()}</span>
                       <Badge variant="outline" className={`${rp.status === 'completed' ? 'border-emerald-500 text-emerald-500' : 'border-amber-500 text-amber-500'}`}>
                         {rp.status === 'completed' ? 'Completed' : 'In Progress'}
                       </Badge>
                       <Link 
                         href={`/papers/viewer?qp=${encodeURIComponent(rp.paper.questionPdfUrl || '')}&ms=${encodeURIComponent(rp.paper.msPdfUrl || '')}&id=${rp.paper.id}`}
                         className={cn(buttonVariants({ size: "sm", variant: "ghost" }), "w-full sm:w-auto hover:bg-primary/10 hover:text-primary")}
                       >
                         Resume
                       </Link>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </section>

          {/* 4. Subject Progress */}
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

          {/* Smart Recommendation */}
          {recommendedPaper && (
            <section>
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" /> Recommended Next Step
              </h2>
              <Card className="bg-primary/5 border-primary/20 shadow-sm hover:border-primary/40 transition-colors">
                <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="font-semibold text-foreground">
                      Practice Paper {recommendedPaper.paper.paperNumber} {recommendedPaper.paper.variant ? `V${recommendedPaper.paper.variant}` : ''} • {recommendedPaper.paper.year}
                    </h4>
                    <p className="text-sm text-muted-foreground mt-1">Based on your recent activity.</p>
                  </div>
                  <Link 
                    href={`/papers/viewer?qp=${encodeURIComponent(recommendedPaper.paper.questionPdfUrl || '')}&ms=${encodeURIComponent(recommendedPaper.paper.msPdfUrl || '')}&id=${recommendedPaper.paper.id}`}
                    className={buttonVariants({ size: "sm" })}
                  >
                    Start Paper
                  </Link>
                </CardContent>
              </Card>
            </section>
          )}

        </div>
      </div>
    </div>
  );
}
