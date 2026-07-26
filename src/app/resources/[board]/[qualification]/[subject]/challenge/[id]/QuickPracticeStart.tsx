import Link from "next/link";
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, Clock3, RotateCcw, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AttemptSummary = {
  id: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  timeTaken: number | null;
  completedAt: Date;
};

type QuickPracticeStartProps = {
  title: string;
  subjectName: string;
  topicName: string | null;
  difficulty: string;
  questionCount: number;
  estimatedTime: number;
  backUrl: string;
  attemptUrl: string;
  resultBaseUrl: string;
  attempts: AttemptSummary[];
};

const difficultyStyles: Record<string, string> = {
  easy: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  medium: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  hard: "bg-red-500/10 text-red-700 dark:text-red-300",
  mixed: "bg-primary/10 text-primary",
};

function formatTime(seconds: number | null) {
  if (!seconds) return "—";
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds.toString().padStart(2, "0")}s`;
}

export default function QuickPracticeStart({
  title,
  subjectName,
  topicName,
  difficulty,
  questionCount,
  estimatedTime,
  backUrl,
  attemptUrl,
  resultBaseUrl,
  attempts,
}: QuickPracticeStartProps) {
  const latestAttempt = attempts[0];

  return (
    <main className="min-h-[calc(100vh-140px)] bg-background">
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <Link
          href={backUrl}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to subject
        </Link>

        <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start lg:gap-14">
          <section className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="gap-1.5 px-2.5 py-1">
                <BookOpen className="size-3.5" />
                {subjectName}
              </Badge>
              <Badge className={cn("border-0 px-2.5 py-1 capitalize", difficultyStyles[difficulty] || difficultyStyles.medium)}>
                {difficulty}
              </Badge>
            </div>

            <p className="mt-8 text-sm font-semibold uppercase tracking-[0.18em] text-primary">Topic Practice</p>
            <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
              {title}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
              A short, focused session to check your understanding
              {topicName ? ` of ${topicName}` : ""}. Work at your own pace and review every answer when you finish.
            </p>

            <div className="mt-8 flex flex-wrap gap-x-7 gap-y-4 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Target className="size-5 text-primary" />
                <span><strong className="font-semibold text-foreground">{questionCount}</strong> questions</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock3 className="size-5 text-primary" />
                <span>About <strong className="font-semibold text-foreground">{estimatedTime} minutes</strong></span>
              </div>
              {topicName && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <BookOpen className="size-5 text-primary" />
                  <span>{topicName}</span>
                </div>
              )}
            </div>

          </section>

          <aside className="rounded-2xl bg-card p-5 ring-1 ring-foreground/10 sm:p-6 lg:sticky lg:top-24 lg:row-span-2">
            <p className="text-sm font-medium text-muted-foreground">Ready when you are</p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">Questions</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">{questionCount}</p>
              </div>
              <div className="rounded-xl bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">Est. time</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">{estimatedTime}<span className="ml-1 text-sm font-medium text-muted-foreground">min</span></p>
              </div>
            </div>

            <Link href={attemptUrl} className="mt-5 block">
              <Button size="lg" className="h-12 w-full gap-2 text-base">
                {attempts.length > 0 ? "Retry practice" : "Start practice"}
                {attempts.length > 0 ? <RotateCcw className="size-4" /> : <ArrowRight className="size-4" />}
              </Button>
            </Link>

            {latestAttempt && (
              <Link
                href={`${resultBaseUrl}/${latestAttempt.id}`}
                className="mt-5 block rounded-xl bg-muted/35 p-4 transition-colors hover:bg-muted/60"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Latest result</p>
                    <p className="mt-1 font-semibold">
                      {latestAttempt.score}/{latestAttempt.totalQuestions} correct
                    </p>
                  </div>
                  <span className="text-2xl font-semibold tabular-nums text-primary">
                    {Math.round(latestAttempt.percentage)}%
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{latestAttempt.completedAt.toLocaleDateString()}</span>
                  <span>{formatTime(latestAttempt.timeTaken)}</span>
                </div>
              </Link>
            )}
          </aside>

          <div className="max-w-xl rounded-2xl bg-muted/45 p-5">
            <h2 className="font-semibold">Before you start</h2>
            <ul className="mt-3 space-y-2.5 text-sm leading-6 text-muted-foreground">
              <li className="flex gap-2.5">
                <CheckCircle2 className="mt-1 size-4 shrink-0 text-primary" />
                Choose one answer for each question.
              </li>
              <li className="flex gap-2.5">
                <CheckCircle2 className="mt-1 size-4 shrink-0 text-primary" />
                Move between questions freely before submitting.
              </li>
              <li className="flex gap-2.5">
                <CheckCircle2 className="mt-1 size-4 shrink-0 text-primary" />
                Your score, explanations, and mistakes appear after submission.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}
