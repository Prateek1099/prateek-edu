export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Target, AlertTriangle, Activity, BookOpen } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function StudentProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: studentId } = await params;
  
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const user = session.user as typeof session.user & { id?: string };
  if (!user.id) redirect("/login");

  const workspace = await prisma.workspace.findUnique({
    where: { ownerId: user.id },
  });

  if (!workspace) redirect("/dashboard");

  // Verify the student is enrolled in a class owned by this teacher
  const isEnrolled = await prisma.classStudent.findFirst({
    where: {
      studentId: studentId,
      class: { workspaceId: workspace.id, status: "ACTIVE" },
      status: "ACTIVE"
    }
  });

  if (!isEnrolled) notFound();

  // Fetch full student profile with workspace-scoped data
  const student = await prisma.user.findUnique({
    where: { id: studentId },
    include: {
      classEnrollments: {
        where: { class: { workspaceId: workspace.id, status: "ACTIVE" }, status: "ACTIVE" },
        include: { class: { include: { subject: true } } }
      },
      challengeAttempts: {
        where: { challenge: { workspaceId: workspace.id } },
        include: { challenge: { select: { title: true, difficulty: true, subjectId: true } } },
        orderBy: { completedAt: "desc" },
        take: 10
      },
      mistakeEntries: {
        where: { challenge: { workspaceId: workspace.id } },
        include: { question: { select: { questionText: true } } },
        orderBy: { updatedAt: "desc" },
        take: 10
      }
    }
  });

  if (!student) notFound();

  const avgScore = student.challengeAttempts.length > 0 
    ? Math.round(student.challengeAttempts.reduce((acc, curr) => acc + curr.percentage, 0) / student.challengeAttempts.length)
    : null;

  // Calculate weakest topic
  const topicCounts: Record<string, number> = {};
  student.mistakeEntries.forEach(m => {
    if (m.topicTag) {
      topicCounts[m.topicTag] = (topicCounts[m.topicTag] || 0) + m.mistakeCount;
    }
  });
  const weakTopics = Object.entries(topicCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 1)
    .map(([topic]) => topic);

  const weakestTopic = weakTopics.length > 0 ? weakTopics[0] : null;

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-10">
      <div>
        <Link href="/workspace/students">
          <Button variant="ghost" size="sm" className="-ml-2 mb-4 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4 mr-2" /> Back to Students
          </Button>
        </Link>
        <div className="flex items-center gap-6">
          <Avatar className="h-20 w-20 border-2 border-primary/20">
            <AvatarImage src={student.image || ""} />
            <AvatarFallback className="text-2xl bg-primary/10 text-primary">{student.name?.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              {student.name}
            </h1>
            <p className="text-muted-foreground mt-1">
              {student.email}
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              {student.classEnrollments.map(enr => (
                <Badge key={enr.id} variant="secondary">
                  {enr.class.name}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        
        {/* Left Column: Stats & Recommendations */}
        <div className="space-y-6 md:col-span-1">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Target className="size-4 text-primary" /> Average Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${avgScore && avgScore >= 80 ? 'text-emerald-500' : avgScore && avgScore >= 60 ? 'text-amber-500' : avgScore ? 'text-destructive' : 'text-foreground'}`}>
                {avgScore !== null ? `${avgScore}%` : "—"}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-amber-600 dark:text-amber-500">
                <AlertTriangle className="size-4" /> Recommended Intervention
              </CardTitle>
            </CardHeader>
            <CardContent>
              {weakestTopic ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    Student shows frequent mistakes in <strong>{weakestTopic}</strong>. Recommend assigning a targeted Quick Practice to close the gap.
                  </p>
                  <Button size="sm" className="w-full mt-4">Assign Practice</Button>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No intervention needed currently. Keep up the good work!
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Deep Dive */}
        <div className="md:col-span-3 space-y-6">
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="size-5 text-primary" /> Recent Performance
              </CardTitle>
              <CardDescription>Recent challenge attempts across all subjects</CardDescription>
            </CardHeader>
            <CardContent>
              {student.challengeAttempts.length === 0 ? (
                <div className="text-center p-6 text-muted-foreground border border-dashed rounded-lg bg-muted/10">
                  No challenge attempts recorded yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {student.challengeAttempts.map((attempt) => (
                    <div key={attempt.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                      <div>
                        <p className="font-medium text-sm">{attempt.challenge.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {new Date(attempt.completedAt).toLocaleDateString()} • {attempt.totalQuestions} questions
                        </p>
                      </div>
                      <div className={`font-bold ${attempt.percentage >= 80 ? 'text-emerald-500' : attempt.percentage >= 60 ? 'text-amber-500' : 'text-destructive'}`}>
                        {attempt.percentage}%
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="size-5 text-primary" /> Mistake Book
              </CardTitle>
              <CardDescription>Questions the student has answered incorrectly multiple times</CardDescription>
            </CardHeader>
            <CardContent>
              {student.mistakeEntries.length === 0 ? (
                <div className="text-center p-6 text-muted-foreground border border-dashed rounded-lg bg-muted/10">
                  No mistakes recorded.
                </div>
              ) : (
                <div className="space-y-4">
                  {student.mistakeEntries.map((mistake) => (
                    <div key={mistake.id} className="p-3 rounded-lg border border-destructive/20 bg-destructive/5">
                      <div className="flex items-start justify-between">
                        <div className="pr-4">
                          <p className="text-sm font-medium line-clamp-2 text-foreground/90">{mistake.question.questionText}</p>
                          <div className="flex gap-2 mt-2">
                            {mistake.topicTag && (
                              <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-500/30 bg-amber-500/5">
                                {mistake.topicTag}
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-[10px] text-destructive border-destructive/30 bg-destructive/10">
                              Failed {mistake.mistakeCount}x
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
