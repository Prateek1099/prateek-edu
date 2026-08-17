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
    <main className="relative min-h-[calc(100vh-140px)] bg-background">
      {/* Ambient background glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 mx-auto h-72 max-w-4xl overflow-hidden blur-3xl opacity-20 bg-gradient-to-b from-indigo-500/25 via-purple-600/15 to-transparent"
      />

      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <Link
          href={backUrl}
          className="inline-flex items-center justify-center rounded-xl text-sm font-semibold transition-colors hover:bg-accent hover:text-accent-foreground h-9 px-3 -ml-3 text-muted-foreground gap-1.5"
        >
          <ArrowLeft className="size-4" />
          <span>Back to subject</span>
        </Link>

        <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start lg:gap-12">
          <section className="min-w-0 space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="gap-1.5 bg-primary/10 border border-primary/20 text-primary text-xs font-semibold px-2.5 py-1 rounded-lg">
                <BookOpen className="size-3.5" />
                {subjectName}
              </Badge>
              <Badge className={cn("border-0 px-2.5 py-1 capitalize text-xs font-semibold rounded-lg", difficultyStyles[difficulty] || difficultyStyles.medium)}>
                {difficulty}
              </Badge>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-primary">Topic Practice</p>
              <h1 className="mt-2 max-w-3xl text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl text-foreground">
                {title}
              </h1>
              <p className="mt-4 max-w-2xl text-xs sm:text-sm md:text-base leading-relaxed text-muted-foreground">
                A focused session to check your understanding
                {topicName ? ` of ${topicName}` : ""}. Work at your own pace and review explanations when you finish.
              </p>
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-3 text-xs sm:text-sm font-medium pt-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Target className="size-4 text-primary" />
                <span><strong className="font-bold text-foreground">{questionCount}</strong> questions</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock3 className="size-4 text-primary" />
                <span>About <strong className="font-bold text-foreground">{estimatedTime} minutes</strong></span>
              </div>
              {topicName && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <BookOpen className="size-4 text-primary" />
                  <span>{topicName}</span>
                </div>
              )}
            </div>

            <div className="max-w-xl rounded-2xl border border-border/80 bg-muted/20 p-5 sm:p-6">
              <h2 className="text-sm font-bold tracking-tight text-foreground">Before you start</h2>
              <ul className="mt-3 space-y-2.5 text-xs sm:text-sm leading-relaxed text-muted-foreground">
                <li className="flex gap-2.5">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>Choose one answer for each multiple-choice question.</span>
                </li>
                <li className="flex gap-2.5">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>Move between questions freely before submitting your final attempt.</span>
                </li>
                <li className="flex gap-2.5">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>Detailed explanations and mistake analysis appear instantly after submission.</span>
                </li>
              </ul>
            </div>
          </section>

          <aside className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-lg lg:sticky lg:top-24">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Practice Overview</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-border/60 bg-muted/30 p-3.5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Questions</p>
                <p className="mt-1 text-2xl font-extrabold tabular-nums text-foreground">{questionCount}</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-muted/30 p-3.5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Est. Time</p>
                <p className="mt-1 text-2xl font-extrabold tabular-nums text-foreground">{estimatedTime}<span className="ml-1 text-xs font-semibold text-muted-foreground">min</span></p>
              </div>
            </div>

            <Link href={attemptUrl} className="mt-5 block">
              <Button size="lg" className="h-11 w-full gap-2 rounded-xl text-sm font-semibold shadow-md">
                {attempts.length > 0 ? "Retry practice" : "Start practice"}
                {attempts.length > 0 ? <RotateCcw className="size-4" /> : <ArrowRight className="size-4" />}
              </Button>
            </Link>

            {latestAttempt && (
              <Link
                href={`${resultBaseUrl}/${latestAttempt.id}`}
                className="mt-4 block rounded-xl border border-border/60 bg-muted/20 p-4 transition-colors hover:bg-muted/40"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Latest result</p>
                    <p className="mt-0.5 text-sm font-bold text-foreground">
                      {latestAttempt.score}/{latestAttempt.totalQuestions} correct
                    </p>
                  </div>
                  <span className="text-2xl font-extrabold tabular-nums text-primary">
                    {Math.round(latestAttempt.percentage)}%
                  </span>
                </div>
                <div className="mt-2.5 flex items-center justify-between text-xs text-muted-foreground font-medium">
                  <span>{latestAttempt.completedAt.toLocaleDateString()}</span>
                  <span>{formatTime(latestAttempt.timeTaken)}</span>
                </div>
              </Link>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}
