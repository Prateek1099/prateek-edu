export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  Users, BookOpen, FileText, Briefcase, Zap, Database, 
  PlusCircle, FilePlus, BookPlus, UploadCloud, ClipboardList,
  UserPlus, Activity, Target, Sparkles, Clock, AlertTriangle, Lightbulb
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
  const user = session.user as any;

  // 1. Fetch Workspace and Base Stats
  const workspace = await prisma.workspace.findUnique({
    where: { ownerId: user.id },
    include: {
      classes: {
        where: { status: "ACTIVE" },
        include: {
          subject: true,
          _count: { select: { students: { where: { status: "ACTIVE" } } } },
        },
      },
    },
  });

  if (!workspace) redirect("/dashboard");

  // 2. Compute "My Subjects" (Unique subjects taught in active classes)
  const activeSubjectsMap = new Map();
  workspace.classes.forEach(cls => {
    if (cls.subject) {
      if (!activeSubjectsMap.has(cls.subject.id)) {
        activeSubjectsMap.set(cls.subject.id, cls.subject);
      }
    }
  });
  const mySubjects = Array.from(activeSubjectsMap.values());
  const mySubjectIds = mySubjects.map(sub => sub.id);

  // 3. Aggregate Stats
  const [totalStudents, contentStats, recentStudents, recentContent] = await Promise.all([
    prisma.classStudent.count({
      where: {
        class: { workspaceId: workspace.id },
        status: "ACTIVE",
      },
    }),
    prisma.workspaceContent.groupBy({
      by: ["type"],
      where: { workspaceId: workspace.id },
      _count: { id: true }
    }),
    prisma.classStudent.findMany({
      where: { class: { workspaceId: workspace.id } },
      select: {
        id: true,
        enrolledAt: true,
        student: { select: { name: true } },
        class: { select: { name: true } }
      },
      orderBy: { enrolledAt: "desc" },
      take: 5
    }),
    prisma.workspaceContent.findMany({
      where: { workspaceId: workspace.id },
      select: {
        id: true,
        type: true,
        title: true,
        createdAt: true
      },
      orderBy: { createdAt: "desc" },
      take: 5
    })
  ]);

  const worksheetsCount = contentStats.find(s => s.type === "WORKSHEET")?._count.id || 0;
  const quickPracticeCount = contentStats.find(s => s.type === "CHALLENGE")?._count.id || 0;

  // Temporarily query global BankQuestion count filtered by active subjects taught by this teacher.
  // In the future, this will be filtered by Workspace ID if the Question Bank becomes tenant-scoped.
  const questionBankSize = mySubjectIds.length > 0 ? await prisma.bankQuestion.count({
    where: { subjectId: { in: mySubjectIds }, questionType: "MCQ" }
  }) : 0;

  // Merge and sort timeline
  const timeline: any[] = [
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
      icon: c.type === "WORKSHEET" ? FileText : Zap,
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
            Here's what's happening in <span className="font-semibold text-foreground">{workspace.name}</span> today.
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
              <PlusCircle className="w-4 h-4 mr-2" /> New Content
            </Button>
          </Link>
        </div>
      </div>

      {/* 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Column */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Workspace Overview Stats */}
          <section>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-primary" /> Workspace Overview
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
                  <p className="text-3xl font-bold">{workspace.classes.length}</p>
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
                    <p className="text-sm font-medium text-muted-foreground">Question Bank</p>
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
              <Zap className="w-5 h-5 text-primary" /> Quick Actions
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Link href="/workspace/content">
                <Card className="group cursor-pointer hover:border-primary/50 transition-all hover:bg-muted/30">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                      <FilePlus className="w-5 h-5" />
                    </div>
                    <span className="font-medium text-sm">Create Worksheet</span>
                  </CardContent>
                </Card>
              </Link>
              <Link href="/workspace/content">
                <Card className="group cursor-pointer hover:border-primary/50 transition-all hover:bg-muted/30">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                      <Zap className="w-5 h-5" />
                    </div>
                    <span className="font-medium text-sm">Quick Practice</span>
                  </CardContent>
                </Card>
              </Link>
              <Link href="/workspace/content">
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
                    <span className="font-medium text-sm">Add Notes</span>
                  </CardContent>
                </Card>
              </Link>
              <Link href="/workspace/content">
                <Card className="group cursor-pointer hover:border-primary/50 transition-all hover:bg-muted/30">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-zinc-500/10 text-zinc-600 group-hover:bg-zinc-500 group-hover:text-white transition-colors">
                      <UploadCloud className="w-5 h-5" />
                    </div>
                    <span className="font-medium text-sm">Upload Resources</span>
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
                  {timeline.map((event, i) => (
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
                          {workspace.classes.filter(c => c.subjectId === sub.id).length} Classes
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center text-muted-foreground text-sm">
                    <p>No active subjects.</p>
                    <p className="text-xs mt-1">Create a class to add subjects.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          {/* Teaching Intelligence (Placeholders) */}
          <section>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" /> Teaching Intelligence
            </h2>
            
            <div className="space-y-4">
              {/* AI Insight Mock */}
              <Card className="shadow-sm border-primary/20 bg-primary/5 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-[0.03]">
                  <Lightbulb className="w-24 h-24 text-primary" />
                </div>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold flex items-center gap-2 text-primary">
                    <Sparkles className="w-4 h-4" /> AI Insight
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Students in <span className="font-medium text-foreground">Computer Science 0478</span> are struggling with <span className="font-medium text-amber-500">Logic Gates</span>. Consider creating a targeted Quick Practice.
                  </p>
                  <Button variant="outline" size="sm" className="mt-3 w-full border-primary/20 text-primary hover:bg-primary/10">
                    Generate Practice
                  </Button>
                </CardContent>
              </Card>

              {/* Needs Intervention Mock */}
              <Card className="shadow-sm border-amber-500/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold flex items-center gap-2 text-amber-600 dark:text-amber-500">
                    <AlertTriangle className="w-4 h-4" /> Needs Intervention
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold">AS</div>
                      <span className="text-sm font-medium">Alex Smith</span>
                    </div>
                    <span className="text-xs font-semibold text-destructive">45% Avg</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold">JD</div>
                      <span className="text-sm font-medium">John Doe</span>
                    </div>
                    <span className="text-xs font-semibold text-amber-500">Missing HW</span>
                  </div>
                </CardContent>
              </Card>

              {/* Ask Teacher Requests Mock */}
              <Card className="shadow-sm border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                    <Activity className="w-4 h-4" /> Ask Teacher Requests
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="p-4 border border-dashed rounded-lg text-center text-sm text-muted-foreground">
                    <p>No pending questions from students.</p>
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
