import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Bookmark, Clock, Trophy, Target } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    redirect("/login");
  }

  const userId = (session.user as any).id;

  // Fetch real data from Prisma
  const [enrollments, progressRecords, savedCount] = await Promise.all([
    prisma.enrollment.findMany({
      where: { userId, paymentStatus: "completed" },
      include: { course: true },
    }),
    prisma.userProgress.findMany({
      where: { userId },
      include: { paper: true },
      orderBy: { lastViewed: "desc" },
      take: 5,
    }),
    prisma.userProgress.count({
      where: { userId },
    })
  ]);

  const recentPapers = progressRecords.map((record: any) => ({
    id: record.paper.id,
    title: `Paper ${record.paper.paperNumber} ${record.paper.variant ? `v${record.paper.variant}` : ''}`,
    subject: record.paper.subject,
    year: record.paper.year,
    completed: record.completed,
    viewedAt: new Date(record.lastViewed).toLocaleDateString(),
  }));

  const progressData = enrollments.map((e: any) => ({
    subject: e.course.subject,
    title: e.course.title,
    level: e.course.level,
    completion: 0, // Calculate this dynamically later based on actual course content
    color: "bg-blue-500"
  }));

  return (
    <div className="container px-4 md:px-8 py-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Student Dashboard</h1>
          <p className="text-muted-foreground mt-1 text-lg">Welcome back, {session.user.name || "Student"}. Track your learning progress and pick up where you left off.</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card">
          <CardHeader className="py-4 flex flex-row items-center justify-between space-y-0 pb-2">
             <CardTitle className="text-sm font-medium">Papers Practiced</CardTitle>
             <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
             <div className="text-2xl font-bold text-primary">{savedCount}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-card">
          <CardHeader className="py-4 flex flex-row items-center justify-between space-y-0 pb-2">
             <CardTitle className="text-sm font-medium">Courses Enrolled</CardTitle>
             <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
             <div className="text-2xl font-bold text-primary">{enrollments.length}</div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="py-4 flex flex-row items-center justify-between space-y-0 pb-2">
             <CardTitle className="text-sm font-medium">Current Goal</CardTitle>
             <Trophy className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
             <div className="text-2xl font-bold">A* Target</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Col */}
        <div className="lg:col-span-2 space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Course Enrollments</CardTitle>
              <CardDescription>Courses you are currently enrolled in.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {progressData.length === 0 ? (
                <div className="text-sm text-muted-foreground py-4 text-center">
                  You are not enrolled in any courses yet. <Link href="/courses" className="text-primary hover:underline">Browse Courses</Link>
                </div>
              ) : progressData.map((p: any, i: number) => (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between text-sm font-medium">
                    <span>{p.title} ({p.subject})</span>
                    <Badge variant="outline">{p.level}</Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Tabs defaultValue="recent" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="recent">Recently Practiced Papers</TabsTrigger>
            </TabsList>
            <TabsContent value="recent" className="space-y-4">
              {recentPapers.length === 0 ? (
                <div className="text-sm text-muted-foreground py-4 text-center border rounded-md">
                  No recent papers found. <Link href="/papers" className="text-primary hover:underline">Start practicing</Link>
                </div>
              ) : recentPapers.map((rp: any, i: number) => (
                <div key={i} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg bg-card hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-4 mb-3 sm:mb-0">
                    <div className="bg-primary/10 p-2 rounded-full hidden sm:block">
                      <Clock className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground">{rp.title}</h4>
                      <p className="text-sm text-muted-foreground">{rp.subject} • {rp.year}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 w-full sm:w-auto mt-2 sm:mt-0">
                     <span className="text-xs text-muted-foreground mr-2">{rp.viewedAt}</span>
                     {rp.completed && <Badge variant="default" className="bg-emerald-500">Completed</Badge>}
                     <Link href={`/papers/viewer?id=${rp.id}`}>
                       <Button size="sm" variant="secondary" className="w-full sm:w-auto">Resume</Button>
                     </Link>
                  </div>
                </div>
              ))}
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Col */}
        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bookmark className="h-5 w-5 text-primary" /> Quick Links
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Link href="/papers" className="block p-3 border rounded-md hover:bg-muted/10 transition-colors">
                <h4 className="font-bold my-1">Past Papers Library</h4>
                <p className="text-xs text-muted-foreground">Browse all available past papers</p>
              </Link>
              <Link href="/courses" className="block p-3 border rounded-md hover:bg-muted/10 transition-colors">
                <h4 className="font-bold my-1">Premium Courses</h4>
                <p className="text-xs text-muted-foreground">Get expert guidance and materials</p>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
