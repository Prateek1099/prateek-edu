import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Trophy, Clock, Zap, BarChart3, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import QuickPracticeStart from "./QuickPracticeStart";

const difficultyColor: Record<string, string> = {
  easy: "border-emerald-500/50 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10",
  medium: "border-amber-500/50 text-amber-600 dark:text-amber-400 bg-amber-500/10",
  hard: "border-red-500/50 text-red-600 dark:text-red-400 bg-red-500/10",
  mixed: "border-primary/50 text-primary bg-primary/10",
};

export default async function ChallengeDetailPage({
  params,
}: {
  params: Promise<{ board: string; qualification: string; subject: string; id: string }>;
}) {
  const { board, qualification, subject, id } = await params;

  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const sessionUser = session.user as typeof session.user & { id?: string; workspaceId?: string | null };
  const userId = sessionUser.id;
  if (!userId) redirect("/login");

  const [challenge, attempts] = await Promise.all([
    prisma.challenge.findUnique({
      where: { id },
      include: {
        subject: true,
        topic: true,
        _count: { select: { questions: true } },
      },
    }),
    prisma.challengeAttempt.findMany({
      where: { userId, challengeId: id },
      orderBy: { completedAt: "desc" },
      take: 10,
    }),
  ]);

  if (!challenge || !challenge.isPublished) notFound();

  // Strict Authorization Guard for Workspace Challenges
  if (challenge.workspaceId) {
    const isOwner = sessionUser.workspaceId === challenge.workspaceId;

    if (!isOwner) {
      const assignment = await prisma.worksheetAssignment.findUnique({
        where: {
          userId_worksheetId: {
            userId,
            worksheetId: id
          }
        }
      });
      if (!assignment) notFound();
    }
  }

  if (challenge.type === "WORKSHEET" || challenge.type === "PDF_WORKSHEET") {
    redirect(`/resources/${board}/${qualification}/${subject}/worksheet/${id}`);
  }

  if (challenge.type === "QUICK_PRACTICE") {
    const challengeBaseUrl = `/resources/${board}/${qualification}/${subject}/challenge/${id}`;

    return (
      <QuickPracticeStart
        title={challenge.title}
        subjectName={challenge.subject.name}
        topicName={challenge.topic?.topicName || null}
        difficulty={challenge.difficulty}
        questionCount={challenge._count.questions}
        estimatedTime={challenge.estimatedTime}
        backUrl={`/resources/${board}/${qualification}/${subject}`}
        attemptUrl={`${challengeBaseUrl}/attempt`}
        resultBaseUrl={`${challengeBaseUrl}/results`}
        attempts={attempts}
      />
    );
  }

  const formatTime = (seconds: number | null) => {
    if (!seconds) return "—";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s.toString().padStart(2, "0")}s`;
  };

  return (
    <div className="relative container px-4 md:px-8 py-8 md:py-12 max-w-4xl mx-auto min-h-[calc(100vh-140px)] space-y-8">
      {/* Ambient background glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 mx-auto h-72 max-w-4xl overflow-hidden blur-3xl opacity-20 bg-gradient-to-b from-indigo-500/25 via-purple-600/15 to-transparent"
      />

      <div>
        <Link href={`/resources/${board}/${qualification}/${subject}`} className="inline-flex items-center justify-center rounded-xl text-sm font-semibold transition-colors hover:bg-accent hover:text-accent-foreground h-9 px-3 -ml-3 text-muted-foreground gap-1.5">
          <ArrowLeft className="size-4" />
          <span>Back to Resources</span>
        </Link>
      </div>

      {/* Hero Card */}
      <Card className="rounded-2xl border border-border/80 bg-card shadow-lg overflow-hidden relative">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary via-purple-500 to-indigo-500" />
        <CardContent className="p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-start gap-5">
            <div className="size-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 shadow-sm">
              <Trophy className="size-7" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">{challenge.title}</h1>
                  {challenge.topic && (
                    <p className="text-xs sm:text-sm font-medium text-muted-foreground mt-1">{challenge.topic.topicName}</p>
                  )}
                </div>
                <Badge
                  variant="outline"
                  className={cn("capitalize text-xs font-semibold px-3 py-1 rounded-lg", difficultyColor[challenge.difficulty] || difficultyColor.medium)}
                >
                  {challenge.difficulty}
                </Badge>
              </div>

              {/* Stats */}
              <div className="flex flex-wrap items-center gap-6 mt-6 text-xs sm:text-sm text-muted-foreground font-medium">
                <div className="flex items-center gap-2">
                  <Zap className="size-4 text-primary" />
                  <span><strong className="text-foreground font-semibold">{challenge._count.questions}</strong> Questions</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="size-4 text-primary" />
                  <span>Estimated <strong className="text-foreground font-semibold">{challenge.estimatedTime}</strong> min</span>
                </div>
                {attempts.length > 0 && (
                  <div className="flex items-center gap-2">
                    <BarChart3 className="size-4 text-primary" />
                    <span><strong className="text-foreground font-semibold">{attempts.length}</strong> Attempt{attempts.length !== 1 ? "s" : ""}</span>
                  </div>
                )}
              </div>

              <Link href={`/resources/${board}/${qualification}/${subject}/challenge/${id}/attempt`} className="inline-block mt-8">
                <Button size="lg" className="h-11 px-8 rounded-xl font-semibold text-sm sm:text-base shadow-md">
                  {attempts.length > 0 ? "Retry Challenge" : "Start Challenge"}
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Past Attempts */}
      {attempts.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg sm:text-xl font-bold tracking-tight flex items-center gap-2">
            <BarChart3 className="size-5 text-primary" /> Your Attempts
          </h2>
          <Card className="rounded-2xl border border-border/80 bg-card shadow-sm overflow-hidden">
            <div className="divide-y divide-border/60">
              {attempts.map((a) => (
                <Link
                  key={a.id}
                  href={`/resources/${board}/${qualification}/${subject}/challenge/${id}/results/${a.id}`}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 sm:p-5 hover:bg-muted/30 transition-colors gap-3.5"
                >
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "size-11 rounded-xl flex items-center justify-center text-sm font-bold border",
                      a.percentage >= 75
                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                        : a.percentage >= 50
                        ? "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400"
                        : "bg-destructive/10 border-destructive/20 text-destructive"
                    )}>
                      {Math.round(a.percentage)}%
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-foreground">
                        {a.score}/{a.totalQuestions} correct
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5 font-medium">
                        <Calendar className="size-3.5" />
                        {new Date(a.completedAt).toLocaleDateString()}
                        {a.timeTaken != null && (
                          <>
                            <span className="mx-1">·</span>
                            <Clock className="size-3.5" />
                            {formatTime(a.timeTaken)}
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs font-semibold px-2.5 py-1 rounded-lg">View Results →</Badge>
                </Link>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
