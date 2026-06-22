import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  Trophy,
  BookOpen,
  AlertTriangle,
  MessageSquare,
  User,
  CalendarDays,
} from "lucide-react";

export default async function StudentPerformancePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "admin") {
    redirect("/dashboard");
  }

  const { id: studentId } = await params;

  const student = await prisma.user.findUnique({
    where: { id: studentId },
    select: { id: true, name: true, email: true, createdAt: true },
  });

  if (!student) notFound();

  // Fetch all student data in parallel
  const [
    challengeAttempts,
    challengeAgg,
    mistakeTotal,
    mistakeNeedsRevision,
    mistakeRevised,
    topMistakeTopics,
    reflections,
    recentMistakes,
    revisionPlan,
  ] = await Promise.all([
    prisma.challengeAttempt.findMany({
      where: { userId: studentId },
      include: { challenge: { include: { subject: true } } },
      orderBy: { completedAt: "desc" },
      take: 10,
    }),
    prisma.challengeAttempt.aggregate({
      where: { userId: studentId },
      _avg: { percentage: true },
      _max: { percentage: true },
      _count: true,
    }),
    prisma.mistakeEntry.count({ where: { userId: studentId } }),
    prisma.mistakeEntry.count({ where: { userId: studentId, status: "needs_revision" } }),
    prisma.mistakeEntry.count({ where: { userId: studentId, status: "revised" } }),
    prisma.mistakeEntry.groupBy({
      by: ["topicTag"],
      where: { userId: studentId, topicTag: { not: null } },
      _sum: { mistakeCount: true },
      orderBy: { _sum: { mistakeCount: "desc" } },
      take: 10,
    }),
    prisma.studentReflection.findMany({
      where: { userId: studentId },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.mistakeEntry.findMany({
      where: { userId: studentId, status: "needs_revision" },
      select: { topicTag: true, mistakeCount: true },
      orderBy: { mistakeCount: "desc" },
      take: 20,
    }),
    prisma.revisionPlan.findUnique({
      where: { userId: studentId },
      include: { tasks: { select: { status: true, dueDate: true, type: true } } },
    }),
  ]);

  // Cross-reference Ask Teacher requests with mistake data
  const mistakeTagSet = new Map<string, number>();
  recentMistakes.forEach((m) => {
    if (m.topicTag) mistakeTagSet.set(m.topicTag.toLowerCase(), m.mistakeCount);
  });

  const revisedPercent = mistakeTotal > 0 ? Math.round((mistakeRevised / mistakeTotal) * 100) : 0;

  return (
    <div className="space-y-8 max-w-5xl">
      <Link href="/admin/users">
        <Button variant="ghost" size="sm" className="-ml-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Users
        </Button>
      </Link>

      {/* Student Header */}
      <div className="flex items-center gap-4">
        <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
          <User className="h-7 w-7 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{student.name || "Student"}</h1>
          <p className="text-muted-foreground">{student.email}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/admin/worksheets/create?topic=${encodeURIComponent(topMistakeTopics[0]?.topicTag || "all")}`}>
            <Button variant="outline">Generate Personalized Worksheet</Button>
          </Link>
          <div className="text-sm px-3 py-1 bg-muted rounded-full">
            {student.isPremium ? "Premium User" : "Free User"}
          </div>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="shadow-sm">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{challengeAgg._count}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Challenges Taken</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{challengeAgg._avg?.percentage ? Math.round(challengeAgg._avg.percentage) : 0}%</p>
            <p className="text-xs text-muted-foreground mt-0.5">Average Score</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-amber-500/20">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{mistakeNeedsRevision}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Pending Revision</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-emerald-500/20">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{mistakeRevised}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Revised</p>
          </CardContent>
        </Card>
      </div>

      {/* Revision Planner Progress */}
      {revisionPlan && (
        <Card className="shadow-sm">
          <CardContent className="p-5">
            <div className="flex justify-between text-sm mb-2">
              <span className="font-medium flex items-center gap-2"><CalendarDays className="w-4 h-4 text-primary" /> Revision Planner</span>
              <span className="text-muted-foreground">
                {revisionPlan.tasks.filter(t => t.status === "COMPLETED").length} / {revisionPlan.tasks.length} tasks completed ({revisionPlan.tasks.length > 0 ? Math.round((revisionPlan.tasks.filter(t => t.status === "COMPLETED").length / revisionPlan.tasks.length) * 100) : 0}%)
              </span>
            </div>
            <Progress value={revisionPlan.tasks.length > 0 ? (revisionPlan.tasks.filter(t => t.status === "COMPLETED").length / revisionPlan.tasks.length) * 100 : 0} className="h-2 mb-2" />
            <p className="text-xs text-muted-foreground text-right">
              Exam: {new Date(revisionPlan.examDate).toLocaleDateString()}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Mistake Revision Progress */}
      {mistakeTotal > 0 && (
        <Card className="shadow-sm">
          <CardContent className="p-5">
            <div className="flex justify-between text-sm mb-2">
              <span className="font-medium">Revision Progress</span>
              <span className="text-muted-foreground">{mistakeRevised}/{mistakeTotal} revised ({revisedPercent}%)</span>
            </div>
            <Progress value={revisedPercent} className="h-2" />
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Most Repeated Mistakes */}
        <section>
          <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" /> Most Repeated Mistakes
          </h2>
          <Card className="shadow-sm">
            <CardContent className="p-0 divide-y divide-border">
              {topMistakeTopics.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground text-sm">No mistake data yet.</div>
              ) : (
                topMistakeTopics.map((t: any, i: number) => (
                  <div key={t.topicTag} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}.</span>
                      <span className="font-medium text-sm">{t.topicTag}</span>
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                      (t._sum.mistakeCount || 0) >= 4
                        ? "bg-red-500/10 text-red-500"
                        : "bg-amber-500/10 text-amber-500"
                    }`}>
                      {t._sum.mistakeCount}× wrong
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </section>

        {/* Recent Challenges */}
        <section>
          <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" /> Recent Challenges
          </h2>
          <Card className="shadow-sm">
            <CardContent className="p-0 divide-y divide-border">
              {challengeAttempts.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground text-sm">No challenge attempts yet.</div>
              ) : (
                challengeAttempts.map((ca: any) => (
                  <div key={ca.id} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                    <div>
                      <p className="font-medium text-sm">{ca.challenge.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{ca.challenge.subject.name} · {new Date(ca.completedAt).toLocaleDateString()}</p>
                    </div>
                    <Badge
                      variant="outline"
                      className={`${
                        ca.percentage >= 75
                          ? "border-emerald-500 text-emerald-500"
                          : ca.percentage >= 50
                          ? "border-amber-500 text-amber-500"
                          : "border-red-500 text-red-500"
                      }`}
                    >
                      {ca.score}/{ca.totalQuestions} ({Math.round(ca.percentage)}%)
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </section>
      </div>

      {/* Ask Teacher Requests — cross-referenced with mistakes */}
      {reflections.length > 0 && (
        <section>
          <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" /> Ask Teacher Requests
          </h2>
          <div className="space-y-3">
            {reflections.map((ref) => {
              // Check if any of their challenging topics match their mistake data
              const matchedTopics = ref.challengingTopics.filter((ct) => {
                const topicPart = ct.includes(":") ? ct.split(":").pop()?.trim().toLowerCase() : ct.toLowerCase();
                return Array.from(mistakeTagSet.keys()).some(
                  (tag) => topicPart && tag.includes(topicPart)
                );
              });
              const hasOverlap = matchedTopics.length > 0;

              return (
                <Card
                  key={ref.id}
                  className={`shadow-sm transition-colors ${
                    hasOverlap ? "border-amber-500/40 bg-amber-500/5" : ""
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-muted-foreground">
                        {new Date(ref.createdAt).toLocaleDateString()}
                      </span>
                      {hasOverlap && (
                        <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-xs">
                          <AlertTriangle className="h-3 w-3 mr-1" /> Matches Mistake Data
                        </Badge>
                      )}
                    </div>
                    {ref.challengingTopics.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {ref.challengingTopics.map((t, i) => {
                          const topicPart = t.includes(":") ? t.split(":").pop()?.trim().toLowerCase() : t.toLowerCase();
                          const isMistakeTopic = Array.from(mistakeTagSet.keys()).some(
                            (tag) => topicPart && tag.includes(topicPart)
                          );
                          return (
                            <span
                              key={i}
                              className={`text-xs font-medium px-2 py-0.5 rounded-md ${
                                isMistakeTopic
                                  ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 ring-1 ring-amber-500/30"
                                  : "bg-muted text-foreground"
                              }`}
                            >
                              {t}
                              {isMistakeTopic && ` (${mistakeTagSet.get(topicPart!) || "?"}× wrong)`}
                            </span>
                          );
                        })}
                      </div>
                    )}
                    {ref.message && (
                      <p className="text-sm text-foreground/90 bg-muted/30 p-3 rounded-md italic border-l-2 border-primary/50">
                        &quot;{ref.message}&quot;
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
