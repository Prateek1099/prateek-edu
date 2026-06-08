import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, BookOpen, AlertTriangle, CheckCircle2 } from "lucide-react";
import MistakeBookClient from "./MistakeBookClient";

export default async function MistakeBookPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const userId = (session.user as any).id;

  const [total, needsRevision, revised, topMistakes, mistakes] = await Promise.all([
    prisma.mistakeEntry.count({ where: { userId } }),
    prisma.mistakeEntry.count({ where: { userId, status: "needs_revision" } }),
    prisma.mistakeEntry.count({ where: { userId, status: "revised" } }),
    prisma.mistakeEntry.groupBy({
      by: ["topicTag"],
      where: { userId, topicTag: { not: null } },
      _sum: { mistakeCount: true },
      orderBy: { _sum: { mistakeCount: "desc" } },
      take: 10,
    }),
    prisma.mistakeEntry.findMany({
      where: { userId },
      include: {
        question: {
          select: {
            questionText: true,
            optionA: true,
            optionB: true,
            optionC: true,
            optionD: true,
            explanation: true,
          },
        },
        challenge: {
          select: {
            id: true,
            title: true,
            subject: {
              select: {
                name: true,
                slug: true,
                qualification: {
                  select: {
                    name: true,
                    board: { select: { name: true } },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: [{ mistakeCount: "desc" }, { updatedAt: "desc" }],
    }),
  ]);

  // Build challenge retry links
  const challengeLinks: Record<string, string> = {};
  mistakes.forEach((m) => {
    if (!challengeLinks[m.challengeId]) {
      const s = m.challenge.subject;
      challengeLinks[m.challengeId] = `/resources/${s.qualification.board.name}/${s.qualification.name}/${s.slug}/challenge/${m.challengeId}/attempt`;
    }
  });

  return (
    <div className="container px-4 md:px-8 py-8 max-w-5xl mx-auto space-y-8">
      <Link href="/dashboard">
        <Button variant="ghost" size="sm" className="-ml-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
        </Button>
      </Link>

      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <BookOpen className="h-8 w-8 text-primary" /> My Mistake Book
        </h1>
        <p className="text-muted-foreground mt-1">
          Track, review, and close your knowledge gaps.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="shadow-sm">
          <CardContent className="p-5 text-center">
            <p className="text-3xl font-bold">{total}</p>
            <p className="text-sm text-muted-foreground mt-1">Total Mistakes</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-amber-500/30">
          <CardContent className="p-5 text-center">
            <div className="flex items-center justify-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">{needsRevision}</p>
            </div>
            <p className="text-sm text-muted-foreground mt-1">Needs Revision</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-emerald-500/30">
          <CardContent className="p-5 text-center">
            <div className="flex items-center justify-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{revised}</p>
            </div>
            <p className="text-sm text-muted-foreground mt-1">Revised</p>
          </CardContent>
        </Card>
      </div>

      {/* Most Repeated */}
      {topMistakes.length > 0 && (
        <Card className="shadow-sm">
          <CardContent className="p-5">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">
              Most Repeated Mistakes
            </h2>
            <div className="space-y-3">
              {topMistakes.map((t, i) => (
                <div key={t.topicTag} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}.</span>
                    <span className="font-medium">{t.topicTag}</span>
                  </div>
                  <span className="text-sm font-semibold px-2.5 py-0.5 rounded-full bg-destructive/10 text-destructive">
                    {t._sum.mistakeCount} mistake{(t._sum.mistakeCount || 0) !== 1 ? "s" : ""}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mistake List */}
      <MistakeBookClient
        mistakes={mistakes.map((m) => ({
          id: m.id,
          topicTag: m.topicTag,
          studentAnswer: m.studentAnswer,
          correctAnswer: m.correctAnswer,
          mistakeCount: m.mistakeCount,
          status: m.status,
          updatedAt: m.updatedAt.toISOString(),
          questionText: m.question.questionText,
          optionA: m.question.optionA,
          optionB: m.question.optionB,
          optionC: m.question.optionC,
          optionD: m.question.optionD,
          explanation: m.question.explanation,
          challengeTitle: m.challenge.title,
          challengeId: m.challengeId,
          retryUrl: challengeLinks[m.challengeId] || "#",
        }))}
      />
    </div>
  );
}
