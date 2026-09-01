import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, BookOpen, AlertTriangle, CheckCircle2 } from "lucide-react";
import MistakeBookClient from "./MistakeBookClient";
import { readOptionSnapshot } from "@/lib/assignment-attempt-answer-snapshot-rules";

export default async function MistakeBookPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const userId = (session.user as { id?: string }).id;
  if (!userId) {
    console.error("MistakeBook error: session missing userId");
    redirect("/login");
  }


  const [topMistakes, mistakes, wrongSnapshots] = await Promise.all([
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
    prisma.assignmentAttemptAnswerSnapshot.findMany({
      where: { studentId: userId, isCorrect: false },
      select: {
        id: true,
        questionId: true,
        questionText: true,
        options: true,
        selectedOptionKey: true,
        selectedOptionText: true,
        correctOptionKey: true,
        correctOptionText: true,
        explanation: true,
        topicLabel: true,
        difficulty: true,
        createdAt: true,
        attempt: {
          select: {
            challenge: {
              select: {
                id: true,
                title: true,
                subject: {
                  select: {
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
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const latestSnapshotByQuestion = new Map<string, (typeof wrongSnapshots)[number]>();
  const snapshotCountByQuestion = new Map<string, number>();
  for (const snapshot of wrongSnapshots) {
    snapshotCountByQuestion.set(
      snapshot.questionId,
      (snapshotCountByQuestion.get(snapshot.questionId) ?? 0) + 1,
    );
    if (!latestSnapshotByQuestion.has(snapshot.questionId)) {
      latestSnapshotByQuestion.set(snapshot.questionId, snapshot);
    }
  }

  const seenQuestionIds = new Set<string>();
  const mistakeItems = mistakes.map((mistake) => {
    seenQuestionIds.add(mistake.questionId);
    const snapshot = latestSnapshotByQuestion.get(mistake.questionId);
    const snapshotOptions = snapshot ? readOptionSnapshot(snapshot.options) : null;
    const subject = mistake.challenge.subject;
    const retryUrl = `/resources/${subject.qualification.board.name}/${subject.qualification.name}/${subject.slug}/challenge/${mistake.challengeId}/attempt`;

    return {
      id: mistake.id,
      canToggleStatus: true,
      snapshotCaptured: Boolean(snapshot && snapshotOptions),
      topicTag: snapshot?.topicLabel ?? mistake.topicTag,
      difficulty: snapshot?.difficulty ?? null,
      studentAnswer: snapshot?.selectedOptionKey ?? mistake.studentAnswer,
      studentAnswerText: snapshot?.selectedOptionText ?? null,
      correctAnswer: snapshot?.correctOptionKey ?? mistake.correctAnswer,
      correctAnswerText: snapshot?.correctOptionText ?? null,
      mistakeCount: mistake.mistakeCount,
      status: mistake.status,
      updatedAt: (snapshot?.createdAt ?? mistake.updatedAt).toISOString(),
      questionText: snapshot?.questionText ?? mistake.question.questionText,
      optionA: snapshotOptions?.A ?? mistake.question.optionA,
      optionB: snapshotOptions?.B ?? mistake.question.optionB,
      optionC: snapshotOptions?.C ?? mistake.question.optionC,
      optionD: snapshotOptions?.D ?? mistake.question.optionD,
      explanation: snapshot?.explanation ?? mistake.question.explanation,
      challengeTitle: mistake.challenge.title,
      challengeId: mistake.challengeId,
      retryUrl,
    };
  });

  for (const [questionId, snapshot] of latestSnapshotByQuestion) {
    if (seenQuestionIds.has(questionId)) continue;
    const options = readOptionSnapshot(snapshot.options);
    if (!options) continue;
    const challenge = snapshot.attempt.challenge;
    const subject = challenge.subject;
    mistakeItems.push({
      id: `snapshot-${snapshot.id}`,
      canToggleStatus: false,
      snapshotCaptured: true,
      topicTag: snapshot.topicLabel,
      difficulty: snapshot.difficulty,
      studentAnswer: snapshot.selectedOptionKey,
      studentAnswerText: snapshot.selectedOptionText,
      correctAnswer: snapshot.correctOptionKey,
      correctAnswerText: snapshot.correctOptionText,
      mistakeCount: snapshotCountByQuestion.get(questionId) ?? 1,
      status: "needs_revision",
      updatedAt: snapshot.createdAt.toISOString(),
      questionText: snapshot.questionText,
      optionA: options.A,
      optionB: options.B,
      optionC: options.C,
      optionD: options.D,
      explanation: snapshot.explanation,
      challengeTitle: challenge.title,
      challengeId: challenge.id,
      retryUrl: `/resources/${subject.qualification.board.name}/${subject.qualification.name}/${subject.slug}/challenge/${challenge.id}/attempt`,
    });
  }

  const total = mistakeItems.length;
  const needsRevision = mistakeItems.filter((mistake) => mistake.status === "needs_revision").length;
  const revised = mistakeItems.filter((mistake) => mistake.status === "revised").length;

  return (
    <div className="relative container px-4 md:px-8 py-8 max-w-5xl mx-auto space-y-8 min-h-[calc(100vh-140px)]">
      {/* Ambient background glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 mx-auto h-72 max-w-4xl overflow-hidden blur-3xl opacity-20 bg-gradient-to-b from-indigo-500/25 via-purple-600/15 to-transparent"
      />

      <div>
        <Link href="/dashboard" className="inline-flex items-center justify-center rounded-xl text-sm font-semibold transition-colors hover:bg-accent hover:text-accent-foreground h-9 px-3 -ml-3 text-muted-foreground gap-1.5">
          <ArrowLeft className="size-4" />
          <span>Back to Dashboard</span>
        </Link>
      </div>

      <div className="flex items-start gap-3.5">
        <div className="size-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0 shadow-sm mt-0.5">
          <BookOpen className="size-6" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">My Mistake Book</h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Review questions you missed, reinforce core concepts, and turn weak spots into strengths.
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
        <Card className="rounded-2xl border border-border/80 bg-card shadow-sm">
          <CardContent className="p-5 sm:p-6 text-center">
            <p className="text-3xl sm:text-4xl font-extrabold tracking-tight">{total}</p>
            <p className="text-xs sm:text-sm font-semibold text-muted-foreground mt-1 uppercase tracking-wider">Total Mistakes</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border border-amber-500/30 bg-amber-500/5 shadow-sm">
          <CardContent className="p-5 sm:p-6 text-center">
            <div className="flex items-center justify-center gap-2">
              <AlertTriangle className="size-6 text-amber-500" />
              <p className="text-3xl sm:text-4xl font-extrabold tracking-tight text-amber-600 dark:text-amber-400">{needsRevision}</p>
            </div>
            <p className="text-xs sm:text-sm font-semibold text-amber-700/80 dark:text-amber-300/80 mt-1 uppercase tracking-wider">Needs Revision</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 shadow-sm">
          <CardContent className="p-5 sm:p-6 text-center">
            <div className="flex items-center justify-center gap-2">
              <CheckCircle2 className="size-6 text-emerald-500" />
              <p className="text-3xl sm:text-4xl font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400">{revised}</p>
            </div>
            <p className="text-xs sm:text-sm font-semibold text-emerald-700/80 dark:text-emerald-300/80 mt-1 uppercase tracking-wider">Revised</p>
          </CardContent>
        </Card>
      </div>

      {/* Most Repeated */}
      {topMistakes.length > 0 && (
        <Card className="rounded-2xl border border-border/80 bg-card shadow-sm">
          <CardContent className="p-5 sm:p-6">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">
              Most Repeated Topics to Revise
            </h2>
            <div className="space-y-2.5">
              {topMistakes.map((t, i) => (
                <div key={t.topicTag} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/60">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}.</span>
                    <span className="text-xs sm:text-sm font-semibold">{t.topicTag}</span>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive">
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
        mistakes={mistakeItems}
      />
    </div>
  );
}
