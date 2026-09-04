export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Users, BookOpen, FileText, Briefcase, Zap, Database, 
  PlusCircle, FilePlus, BookPlus, UploadCloud, ClipboardList,
  UserPlus, Activity, Target, Clock
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { LucideIcon } from "lucide-react";
import { listActiveWorkspaceScopes } from "@/lib/workspace-academic-scope";

type WorkspaceSessionUser = { id: string; name?: string | null };

type WorkspaceSubjectSummary = {
  id: string;
  name: string;
  code: string | null;
};

type TimelineEvent = {
  id: string;
  type: string;
  title: string;
  date: Date;
  icon: LucideIcon;
  color: string;
  bgColor: string;
};

// Helper function to format relative time
function getRelativeTime(date: Date) {
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  const daysDifference = Math.round((date.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysDifference === 0) {
    const hoursDiff = Math.round((date.getTime() - new Date().getTime()) / (1000 * 60 * 60));
    if (hoursDiff === 0) {
      const minDiff = Math.round((date.getTime() - new Date().getTime()) / (1000 * 60));
      return rtf.format(minDiff, 'minute');
    }
    return rtf.format(hoursDiff, 'hour');
  }
  return rtf.format(daysDifference, 'day');
}

export default async function WorkspaceDashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const user = session.user as typeof session.user & WorkspaceSessionUser;

  // 1. Fetch Workspace and Base Stats
  const workspace = await prisma.workspace.findUnique({ where: { ownerId: user.id } });

  if (!workspace) redirect("/dashboard");
  const scopes = await listActiveWorkspaceScopes(workspace.id);
  const subjectIds = scopes.map((scope) => scope.subjectId);
  const activeClasses = await prisma.class.findMany({
    where: { workspaceId: workspace.id, status: "ACTIVE", subjectId: { in: subjectIds } },
    include: {
      subject: true,
      _count: { select: { students: { where: { status: "ACTIVE" } } } },
    },
  });

  // Assigned scopes are authoritative; class counts below remain usage indicators.
  const mySubjects: WorkspaceSubjectSummary[] = scopes.map((scope) => scope.subject);

  // 3. Aggregate Stats
  const [totalStudents, worksheetsCount, questionBankSize, recentStudents, recentContent, practiceAttempts] = await Promise.all([
    prisma.classStudent.count({
      where: {
        class: { workspaceId: workspace.id, status: "ACTIVE", subjectId: { in: subjectIds } },
        status: "ACTIVE",
      },
    }),
    prisma.challenge.count({
      where: {
        workspaceId: workspace.id,
        subjectId: { in: subjectIds },
        type: { in: ["WORKSHEET", "PDF_WORKSHEET"] },
      },
    }),
    prisma.bankQuestion.count({
      where: { workspaceId: workspace.id, subjectId: { in: subjectIds } },
    }),
    prisma.classStudent.findMany({
      where: {
        status: "ACTIVE",
        class: { workspaceId: workspace.id, status: "ACTIVE", subjectId: { in: subjectIds } },
      },
      select: {
        id: true,
        enrolledAt: true,
        student: { select: { name: true } },
        class: { select: { name: true } }
      },
      orderBy: { enrolledAt: "desc" },
      take: 5
    }),
    prisma.challenge.findMany({
      where: {
        workspaceId: workspace.id,
        subjectId: { in: subjectIds },
        type: { in: ["WORKSHEET", "PDF_WORKSHEET", "QUICK_PRACTICE"] },
      },
      select: {
        id: true,
        type: true,
        title: true,
        createdAt: true
      },
      orderBy: { createdAt: "desc" },
      take: 5
    }),
    prisma.challengeAttempt.aggregate({
      where: {
        challenge: { workspaceId: workspace.id, type: "QUICK_PRACTICE", subjectId: { in: subjectIds } },
      },
      _count: true,
      _avg: { percentage: true },
    }),
  ]);

  // The timeline is based only on real active memberships and workspace-owned content.
  const timeline: TimelineEvent[] = [
    ...recentStudents.map(s => ({
      id: `student-${s.id}`,
      type: "STUDENT_JOINED",
      title: `${s.student.name || "A student"} joined ${s.class.name}`,
      date: s.enrolledAt,
      icon: UserPlus,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10"
    })),
    ...recentContent.map(c => ({
      id: `content-${c.id}`,
      type: "CONTENT_CREATED",
      title: `Created ${c.type.toLowerCase()}: ${c.title}`,
      date: c.createdAt,
      icon: c.type === "QUICK_PRACTICE" ? Zap : FileText,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10"
    }))
  ].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 6);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-10">
      
      {/* Personalized Welcome Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Welcome back, {user.name?.split(" ")[0] || "Teacher"}
          </h1>
          <p className="text-muted-foreground mt-1 text-lg">
            Here&apos;s what&apos;s happening in <span className="font-semibold text-foreground">{workspace.name}</span> today.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/workspace/classes">
            <Button variant="outline" className="shadow-sm">
              <BookPlus className="w-4 h-4 mr-2" /> Add Class
            </Button>
          </Link>
          <Link href="/workspace/content">
            <Button className="shadow-sm">
              <PlusCircle className="w-4 h-4 mr-2" /> Add class material
            </Button>
          </Link>
        </div>
      </div>

      {scopes.length === 0 ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-200">
          Your academic access has not been configured yet. Please contact the administrator.
        </div>
      ) : null}

      {/* 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Column */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Workspace Overview Stats */}
          <section>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-primary" /> At a glance
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="shadow-sm hover:border-primary/40 transition-colors">
                <CardContent className="p-5 flex flex-col justify-between h-full">
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-sm font-medium text-muted-foreground">Students</p>
                    <Users className="w-4 h-4 text-emerald-500" />
                  </div>
                  <p className="text-3xl font-bold">{totalStudents}</p>
                </CardContent>
              </Card>
              <Card className="shadow-sm hover:border-primary/40 transition-colors">
                <CardContent className="p-5 flex flex-col justify-between h-full">
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-sm font-medium text-muted-foreground">Active Classes</p>
                    <BookOpen className="w-4 h-4 text-primary" />
                  </div>
                  <p className="text-3xl font-bold">{activeClasses.length}</p>
                </CardContent>
              </Card>
              <Card className="shadow-sm hover:border-primary/40 transition-colors">
                <CardContent className="p-5 flex flex-col justify-between h-full">
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-sm font-medium text-muted-foreground">Worksheets</p>
                    <FileText className="w-4 h-4 text-blue-500" />
                  </div>
                  <p className="text-3xl font-bold">{worksheetsCount}</p>
                </CardContent>
              </Card>
              <Card className="shadow-sm hover:border-primary/40 transition-colors">
                <CardContent className="p-5 flex flex-col justify-between h-full">
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-sm font-medium text-muted-foreground">Your questions</p>
                    <Database className="w-4 h-4 text-amber-500" />
                  </div>
                  <p className="text-3xl font-bold">{questionBankSize}</p>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Quick Actions */}
          <section>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" /> Create for your class
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Link href="/workspace/worksheets">
                <Card className="group cursor-pointer hover:border-primary/50 transition-all hover:bg-muted/30">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                      <FilePlus className="w-5 h-5" />
                    </div>
                    <span className="font-medium text-sm">Create Worksheet</span>
                  </CardContent>
                </Card>
              </Link>
              <Link href="/workspace/quick-practice">
                <Card className="group cursor-pointer hover:border-primary/50 transition-all hover:bg-muted/30">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                      <Zap className="w-5 h-5" />
                    </div>
                    <span className="font-medium text-sm">Practice sets</span>
                  </CardContent>
                </Card>
              </Link>
              <Link href="/workspace/question-bank">
                <Card className="group cursor-pointer hover:border-primary/50 transition-all hover:bg-muted/30">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                      <Database className="w-5 h-5" />
                    </div>
                    <span className="font-medium text-sm">Add Questions</span>
                  </CardContent>
                </Card>
              </Link>
              <Link href="/workspace/classes">
                <Card className="group cursor-pointer hover:border-primary/50 transition-all hover:bg-muted/30">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                      <BookPlus className="w-5 h-5" />
                    </div>
                    <span className="font-medium text-sm">Create Class</span>
                  </CardContent>
                </Card>
              </Link>
              <Link href="/workspace/content">
                <Card className="group cursor-pointer hover:border-primary/50 transition-all hover:bg-muted/30">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 group-hover:bg-purple-500 group-hover:text-white transition-colors">
                      <ClipboardList className="w-5 h-5" />
                    </div>
                    <span className="font-medium text-sm">Add class notes</span>
                  </CardContent>
                </Card>
              </Link>
              <Link href="/workspace/content">
                <Card className="group cursor-pointer hover:border-primary/50 transition-all hover:bg-muted/30">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-zinc-500/10 text-zinc-600 group-hover:bg-zinc-500 group-hover:text-white transition-colors">
                      <UploadCloud className="w-5 h-5" />
                    </div>
                    <span className="font-medium text-sm">Upload class material</span>
                  </CardContent>
                </Card>
              </Link>
            </div>
          </section>

          {/* Unified Recent Activity */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" /> Recent Activity
              </h2>
            </div>
            <Card className="shadow-sm overflow-hidden border-border">
              {timeline.length > 0 ? (
                <div className="divide-y divide-border">
                  {timeline.map((event) => (
                    <div key={event.id} className="flex items-start gap-4 p-4 hover:bg-muted/20 transition-colors">
                      <div className={`mt-1 p-2 rounded-full ${event.bgColor}`}>
                        <event.icon className={`w-4 h-4 ${event.color}`} />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm text-foreground">{event.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Clock className="w-3 h-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">{getRelativeTime(event.date)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  <Activity className="w-8 h-8 mx-auto mb-3 opacity-20" />
                  <p>No recent activity in your workspace.</p>
                </div>
              )}
            </Card>
          </section>

        </div>

        {/* Sidebar Column */}
        <div className="space-y-8">
          
          {/* My Subjects */}
          <section>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" /> My Subjects
            </h2>
            <Card className="shadow-sm border-border">
              <CardContent className="p-0">
                {mySubjects.length > 0 ? (
                  <div className="divide-y divide-border">
                    {mySubjects.map(sub => (
                      <div key={sub.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                        <div>
                          <p className="font-medium text-sm">{sub.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{sub.code || "No code"}</p>
                        </div>
                        <Badge variant="secondary" className="font-mono text-xs">
                          {activeClasses.filter(c => c.subjectId === sub.id).length} Classes
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center text-muted-foreground text-sm">
                    <p>No assigned subjects yet.</p>
                    <p className="text-xs mt-1">Your assigned subjects will appear here.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          {/* Teaching activity */}
          <section>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" /> Teaching Activity
            </h2>
            <div className="space-y-4">
              <Card className="shadow-sm border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Activity className="w-4 h-4 text-primary" /> Practice set activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {practiceAttempts._count > 0 ? (
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      Students have completed <span className="font-semibold text-foreground">{practiceAttempts._count}</span> practice set attempt{practiceAttempts._count === 1 ? "" : "s"}, with an average score of <span className="font-semibold text-foreground">{Math.round(practiceAttempts._avg.percentage ?? 0)}%</span>.
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">No student activity yet. Results will appear after students complete assigned practice sets.</p>
                  )}
                  <Link href="/workspace/students" className="mt-3 inline-flex text-xs font-semibold text-primary hover:underline">Review students →</Link>
                </CardContent>
              </Card>

              <Card className="shadow-sm border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                    <Target className="w-4 h-4 text-primary" /> Students who may need help
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="p-4 border border-dashed rounded-lg text-center text-sm text-muted-foreground">
                    <p className="font-medium text-foreground">No intervention data yet.</p>
                    <p className="mt-1 text-xs">Review student performance after more assigned practice is completed.</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
