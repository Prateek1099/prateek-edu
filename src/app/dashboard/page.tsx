import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { BookOpen, Bookmark, Clock, Trophy, Target, PlayCircle, FolderOpen, Flame, ArrowRight, CheckCircle2, AlertCircle, FileText } from "lucide-react";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { cn } from "@/lib/utils";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    redirect("/login");
  }

  const userId = (session.user as any).id;

  // 1. Fetch Overview Data
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [papersCompleted, papersInProgress, enrollments, recentPapers, topicProgress, recentActivityCount] = await Promise.all([
    prisma.userProgress.count({ where: { userId, status: "completed" } }),
    prisma.userProgress.count({ where: { userId, status: "in_progress" } }),
    prisma.enrollment.count({ where: { userId, paymentStatus: "completed" } }),
    prisma.userProgress.findMany({
      where: { userId },
      include: { paper: { include: { subject: { include: { qualification: true } } } } },
      orderBy: { lastViewed: "desc" },
      take: 6,
    }),
    prisma.userTopicProgress.findMany({
      where: { userId },
      include: { topic: { include: { subject: true } } },
      orderBy: { id: "desc" }
    }),
    prisma.userProgress.count({
      where: { userId, lastViewed: { gte: sevenDaysAgo } }
    })
  ]);

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

  return (
    <div className="container px-4 md:px-8 py-8 max-w-7xl mx-auto space-y-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Student Dashboard</h1>
          <p className="text-muted-foreground mt-1 text-lg">Welcome back, {session.user.name || "Student"}. Here is your learning progress.</p>
        </div>
      </div>

      {/* 1. Progress Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card shadow-sm border-border hover:border-primary/20 transition-colors">
          <CardHeader className="py-4 flex flex-row items-center justify-between space-y-0 pb-2">
             <CardTitle className="text-sm font-medium">Papers Completed</CardTitle>
             <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
             <div className="text-2xl font-bold">{papersCompleted}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-card shadow-sm border-border hover:border-primary/20 transition-colors">
          <CardHeader className="py-4 flex flex-row items-center justify-between space-y-0 pb-2">
             <CardTitle className="text-sm font-medium">In Progress</CardTitle>
             <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
             <div className="text-2xl font-bold">{papersInProgress}</div>
          </CardContent>
        </Card>

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
          {recentPapers.length > 0 && (
            <section>
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <PlayCircle className="w-5 h-5 text-primary" /> Continue Learning
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {recentPapers.slice(0, 2).map((rp: any) => (
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
                {recentPapers.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    No recent papers found. <Link href="/resources" className="text-primary hover:underline">Start practicing</Link>
                  </div>
                ) : recentPapers.map((rp: any) => (
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
                  <div className="text-center text-muted-foreground py-4">No subject progress tracked yet. Complete topical notes to see progress!</div>
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
        </div>

        {/* Right Col */}
        <div className="space-y-10">
          
          {/* 5. Strengths & Weaknesses */}
          <section>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" /> Insights
            </h2>
            <Card className="bg-card shadow-sm border-border">
              <CardContent className="p-5 space-y-6">
                <div>
                  <h4 className="text-sm font-semibold flex items-center gap-2 text-emerald-500 mb-3"><CheckCircle2 className="w-4 h-4" /> Strong Topics</h4>
                  <div className="flex flex-col gap-2">
                    {strongTopics.length > 0 ? strongTopics.map((topic, i) => (
                      <div key={i} className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-sm px-3 py-2 rounded-md font-medium">{topic}</div>
                    )) : <div className="text-xs text-muted-foreground italic">No completed topics yet.</div>}
                  </div>
                </div>
                
                <div className="h-px bg-border w-full"></div>

                <div>
                  <h4 className="text-sm font-semibold flex items-center gap-2 text-amber-500 mb-3"><AlertCircle className="w-4 h-4" /> Needs Revision</h4>
                  <div className="flex flex-col gap-2">
                    {weakTopics.length > 0 ? weakTopics.map((topic, i) => (
                      <div key={i} className="bg-amber-500/10 text-amber-600 dark:text-amber-400 text-sm px-3 py-2 rounded-md font-medium">{topic}</div>
                    )) : <div className="text-xs text-muted-foreground italic">No weak topics identified yet.</div>}
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* 6. Quick Actions */}
          <section>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Bookmark className="w-5 h-5 text-primary" /> Quick Actions
            </h2>
            <Card className="bg-card shadow-sm border-border">
              <CardContent className="p-4 space-y-3">
                <Link href="/resources" className="flex items-center p-3 rounded-lg border border-transparent hover:border-border hover:bg-muted/30 transition-all group">
                  <div className="bg-primary/10 p-2 rounded-md mr-4 group-hover:bg-primary/20 transition-colors">
                    <BookOpen className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm group-hover:text-primary transition-colors">Browse Resources</h4>
                    <p className="text-xs text-muted-foreground">Find notes and past papers</p>
                  </div>
                  <ArrowRight className="w-4 h-4 ml-auto text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </Link>
                
                <div className="h-px bg-border w-full"></div>
                
                <Link href="/dashboard/saved" className="flex items-center p-3 rounded-lg border border-transparent hover:border-border hover:bg-muted/30 transition-all group">
                  <div className="bg-primary/10 p-2 rounded-md mr-4 group-hover:bg-primary/20 transition-colors">
                    <Bookmark className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm group-hover:text-primary transition-colors">Saved Papers</h4>
                    <p className="text-xs text-muted-foreground">Access your bookmarked exams</p>
                  </div>
                  <ArrowRight className="w-4 h-4 ml-auto text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </Link>

                <div className="h-px bg-border w-full"></div>

                <Link href="/courses" className="flex items-center p-3 rounded-lg border border-transparent hover:border-border hover:bg-muted/30 transition-all group">
                  <div className="bg-primary/10 p-2 rounded-md mr-4 group-hover:bg-primary/20 transition-colors">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm group-hover:text-primary transition-colors">My Courses</h4>
                    <p className="text-xs text-muted-foreground">View enrolled premium courses</p>
                  </div>
                  <ArrowRight className="w-4 h-4 ml-auto text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </Link>
              </CardContent>
            </Card>
          </section>

        </div>
      </div>
    </div>
  );
}
