"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  Lightbulb,
  ListFilter,
  RotateCcw,
  Target,
  X,
  XCircle,
} from "lucide-react";
import { AskTeacherDialog } from "@/components/AskTeacherDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

type QuestionData = {
  id: string;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  explanation: string | null;
  topicTag: string | null;
};

type QuickPracticeResultsProps = {
  attempt: {
    score: number;
    totalQuestions: number;
    percentage: number;
    timeTaken: number | null;
    completedAt: string;
    answers: Record<string, string>;
  };
  challenge: {
    id: string;
    title: string;
    difficulty: string;
    type: string;
    topic: { topicName: string } | null;
    questions: QuestionData[];
  };
  backUrl: string;
  backLabel?: string;
  retryUrl: string;
  trackedMistakes?: Record<string, { count: number; status: string }>;
};

const OPTIONS = ["A", "B", "C", "D"] as const;

function formatTime(seconds: number | null) {
  if (!seconds) return "—";
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds.toString().padStart(2, "0")}s`;
}

function getOptionText(question: QuestionData, option: string) {
  const options: Record<string, string> = {
    A: question.optionA,
    B: question.optionB,
    C: question.optionC,
    D: question.optionD,
  };
  return options[option] || "";
}

function getResultMessage(percentage: number) {
  if (percentage >= 90) return "Excellent work — you’ve built strong understanding here.";
  if (percentage >= 75) return "Strong result. Review the details to lock it in.";
  if (percentage >= 50) return "Good progress. A focused review will help close the gaps.";
  return "This is a useful starting point. Review the mistakes, then try again.";
}

export default function QuickPracticeResults({
  attempt,
  challenge,
  backUrl,
  backLabel = "Back to subject",
  retryUrl,
  trackedMistakes = {},
}: QuickPracticeResultsProps) {
  const [reviewFilter, setReviewFilter] = useState<"all" | "mistakes">("all");
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());
  const incorrectCount = attempt.totalQuestions - attempt.score;
  const accuracy = Math.round(attempt.percentage);

  const questionResults = useMemo(
    () =>
      challenge.questions.map((question, index) => {
        const selectedAnswer = attempt.answers[question.id]?.toUpperCase();
        const correctAnswer = question.correctAnswer.toUpperCase();
        return {
          question,
          index,
          selectedAnswer,
          correctAnswer,
          isCorrect: selectedAnswer === correctAnswer,
        };
      }),
    [attempt.answers, challenge.questions]
  );

  const visibleQuestions =
    reviewFilter === "mistakes" ? questionResults.filter((result) => !result.isCorrect) : questionResults;

  const topicStats = useMemo(() => {
    const stats: Record<string, { correct: number; total: number }> = {};
    questionResults.forEach(({ question, isCorrect }) => {
      const topic = question.topicTag || "General";
      if (!stats[topic]) stats[topic] = { correct: 0, total: 0 };
      stats[topic].total += 1;
      if (isCorrect) stats[topic].correct += 1;
    });

    return Object.entries(stats)
      .map(([topic, values]) => ({
        topic,
        ...values,
        percentage: Math.round((values.correct / values.total) * 100),
      }))
      .sort((first, second) => first.percentage - second.percentage);
  }, [questionResults]);

  const toggleQuestion = (questionId: string) => {
    setExpandedQuestions((current) => {
      const next = new Set(current);
      if (next.has(questionId)) next.delete(questionId);
      else next.add(questionId);
      return next;
    });
  };

  const startMistakeReview = () => {
    setReviewFilter("mistakes");
    setExpandedQuestions(
      new Set(questionResults.filter((result) => !result.isCorrect).map((result) => result.question.id))
    );
    window.requestAnimationFrame(() => {
      document.getElementById("quick-practice-review")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  return (
    <main className="relative min-h-[calc(100vh-140px)] bg-background">
      {/* Ambient background glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 mx-auto h-72 max-w-4xl overflow-hidden blur-3xl opacity-20 bg-gradient-to-b from-indigo-500/25 via-purple-600/15 to-transparent"
      />

      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8 space-y-8">
        <section className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-lg">
          <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_16rem] lg:items-center lg:p-10">
            <div>
              <Badge variant="secondary" className="gap-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold px-2.5 py-1 rounded-lg">
                <CheckCircle2 className="size-3.5" />
                Practice completed
              </Badge>
              <h1 className="mt-4 text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-foreground">{challenge.title}</h1>
              <p className="mt-3 max-w-xl text-xs sm:text-sm md:text-base leading-relaxed text-muted-foreground">
                {getResultMessage(attempt.percentage)}
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                {incorrectCount > 0 && (
                  <Button size="lg" className="h-11 gap-2 rounded-xl text-xs sm:text-sm font-semibold shadow-md" onClick={startMistakeReview}>
                    <Target className="size-4" />
                    Review {incorrectCount} mistake{incorrectCount === 1 ? "" : "s"}
                  </Button>
                )}
                <Link href={retryUrl}>
                  <Button size="lg" variant={incorrectCount > 0 ? "outline" : "default"} className="h-11 gap-2 rounded-xl text-xs sm:text-sm font-semibold shadow-sm">
                    <RotateCcw className="size-4" />
                    Retry practice
                  </Button>
                </Link>
              </div>
            </div>

            <div className="rounded-2xl border border-border/60 bg-muted/30 p-6 text-center shadow-2xs">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Accuracy</p>
              <p className="mt-2 text-5xl sm:text-6xl font-extrabold tracking-tight tabular-nums text-foreground">
                {accuracy}<span className="text-2xl text-muted-foreground font-bold">%</span>
              </p>
              <p className="mt-2 text-xs sm:text-sm font-medium text-muted-foreground">
                {attempt.score} of {attempt.totalQuestions} correct
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 border-t border-border/60 bg-muted/20 sm:grid-cols-4">
            <div className="p-4 sm:p-5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <Check className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                Correct
              </div>
              <p className="mt-1 text-xl font-extrabold tabular-nums text-foreground">{attempt.score}</p>
            </div>
            <div className="border-l border-border/60 p-4 sm:p-5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <X className="size-3.5 text-destructive" />
                Incorrect
              </div>
              <p className="mt-1 text-xl font-extrabold tabular-nums text-foreground">{incorrectCount}</p>
            </div>
            <div className="border-t border-border/60 p-4 sm:border-l sm:border-t-0 sm:p-5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <Clock3 className="size-3.5 text-primary" />
                Time
              </div>
              <p className="mt-1 text-xl font-extrabold tabular-nums text-foreground">{formatTime(attempt.timeTaken)}</p>
            </div>
            <div className="border-l border-t border-border/60 p-4 sm:border-t-0 sm:p-5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <Target className="size-3.5 text-primary" />
                Difficulty
              </div>
              <p className="mt-1 text-xl font-extrabold capitalize text-foreground">{challenge.difficulty}</p>
            </div>
          </div>
        </section>

        {topicStats.length > 1 && (
          <section className="mt-10">
            <div className="mb-4">
              <p className="text-sm font-semibold text-primary">Topic breakdown</p>
              <h2 className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">Where to focus next</h2>
            </div>
            <div className="divide-y overflow-hidden rounded-2xl bg-muted/30">
              {topicStats.map((topic) => (
                <div key={topic.topic} className="grid gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_12rem_auto] sm:items-center sm:px-5">
                  <div>
                    <p className="font-medium">{topic.topic}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{topic.correct} of {topic.total} correct</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Progress
                      value={topic.percentage}
                      className={cn(
                        "flex-1",
                        topic.percentage >= 75
                          ? "[&_[data-slot=progress-indicator]]:bg-emerald-500"
                          : topic.percentage >= 50
                            ? "[&_[data-slot=progress-indicator]]:bg-amber-500"
                            : "[&_[data-slot=progress-indicator]]:bg-red-500"
                      )}
                    />
                    <span className="w-10 text-right text-sm font-semibold tabular-nums">{topic.percentage}%</span>
                  </div>
                  {topic.percentage < 75 && (
                    <AskTeacherDialog
                      buttonLabel="Ask teacher"
                      variant="ghost"
                      className="h-10 justify-self-start px-3 text-xs sm:justify-self-end"
                      context={{
                        source: "Topic Practice Results",
                        challengeName: challenge.title,
                        topic: topic.topic,
                        score: topic.percentage,
                      }}
                    />
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        <section id="quick-practice-review" className="mt-12 scroll-mt-24">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-primary">Answer review</p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight">Learn from every question</h2>
              <p className="mt-2 text-sm text-muted-foreground">Open a question to compare answers and read the explanation.</p>
            </div>
            <div className="flex rounded-xl bg-muted p-1">
              <Button
                size="sm"
                variant={reviewFilter === "all" ? "secondary" : "ghost"}
                className="h-9 px-3"
                onClick={() => setReviewFilter("all")}
              >
                All {attempt.totalQuestions}
              </Button>
              <Button
                size="sm"
                variant={reviewFilter === "mistakes" ? "secondary" : "ghost"}
                className="h-9 px-3"
                onClick={() => setReviewFilter("mistakes")}
                disabled={incorrectCount === 0}
              >
                <ListFilter className="size-3.5" />
                Mistakes {incorrectCount}
              </Button>
            </div>
          </div>

          <div className="mt-6 overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10">
            {visibleQuestions.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <CheckCircle2 className="mx-auto size-10 text-emerald-600 dark:text-emerald-400" />
                <h3 className="mt-4 font-semibold">No mistakes to review</h3>
                <p className="mt-1 text-sm text-muted-foreground">You answered every question correctly.</p>
              </div>
            ) : (
              visibleQuestions.map(({ question, index, selectedAnswer, correctAnswer, isCorrect }, visibleIndex) => {
                const isExpanded = expandedQuestions.has(question.id);
                const wasUnanswered = !selectedAnswer;

                return (
                  <article key={question.id} className={cn(visibleIndex > 0 && "border-t")}>
                    <button
                      type="button"
                      onClick={() => toggleQuestion(question.id)}
                      aria-expanded={isExpanded}
                      className="flex min-h-18 w-full items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-muted/35 sm:px-5"
                    >
                      <span
                        className={cn(
                          "flex size-9 shrink-0 items-center justify-center rounded-xl",
                          isCorrect
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                            : "bg-red-500/10 text-red-700 dark:text-red-300"
                        )}
                      >
                        {isCorrect ? <CheckCircle2 className="size-5" /> : <XCircle className="size-5" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="text-xs font-medium text-muted-foreground">Question {index + 1}</span>
                        <span className="mt-0.5 block truncate text-sm font-medium sm:text-base">{question.questionText}</span>
                      </span>
                      {question.topicTag && (
                        <Badge variant="secondary" className="hidden shrink-0 sm:inline-flex">{question.topicTag}</Badge>
                      )}
                      {isExpanded ? (
                        <ChevronUp className="size-4 shrink-0 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                      )}
                    </button>

                    {isExpanded && (
                      <div className="border-t bg-muted/15 px-4 py-5 sm:px-6 sm:py-6">
                        <p className="text-base font-semibold leading-7 sm:text-lg">{question.questionText}</p>
                        <div className="mt-5 space-y-2.5">
                          {OPTIONS.map((option) => {
                            const isCorrectAnswer = correctAnswer === option;
                            const isSelectedAnswer = selectedAnswer === option;
                            return (
                              <div
                                key={option}
                                className={cn(
                                  "flex min-h-13 items-center gap-3 rounded-xl px-3 py-2.5 text-sm ring-1 ring-foreground/10",
                                  isCorrectAnswer && "bg-emerald-500/10 ring-emerald-500/35",
                                  isSelectedAnswer && !isCorrectAnswer && "bg-red-500/10 ring-red-500/35",
                                  !isCorrectAnswer && !isSelectedAnswer && "bg-background/70"
                                )}
                              >
                                <span
                                  className={cn(
                                    "flex size-8 shrink-0 items-center justify-center rounded-lg font-semibold",
                                    isCorrectAnswer && "bg-emerald-600 text-white dark:bg-emerald-500",
                                    isSelectedAnswer && !isCorrectAnswer && "bg-red-600 text-white dark:bg-red-500",
                                    !isCorrectAnswer && !isSelectedAnswer && "bg-muted text-muted-foreground"
                                  )}
                                >
                                  {option}
                                </span>
                                <span className="min-w-0 flex-1 leading-6">{getOptionText(question, option)}</span>
                                {isCorrectAnswer && (
                                  <span className="hidden text-xs font-semibold text-emerald-700 dark:text-emerald-300 sm:inline">Correct answer</span>
                                )}
                                {isSelectedAnswer && !isCorrectAnswer && (
                                  <span className="hidden text-xs font-semibold text-red-700 dark:text-red-300 sm:inline">Your answer</span>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {wasUnanswered && (
                          <p className="mt-3 text-sm font-medium text-red-700 dark:text-red-300">You did not answer this question.</p>
                        )}

                        {question.explanation ? (
                          <div className="mt-5 rounded-2xl bg-primary/8 p-4 sm:p-5">
                            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                              <Lightbulb className="size-4" />
                              Explanation
                            </div>
                            <p className="mt-2 text-sm leading-7 text-foreground/85 sm:text-base">{question.explanation}</p>
                          </div>
                        ) : (
                          <p className="mt-5 text-sm text-muted-foreground">No explanation is available for this question yet.</p>
                        )}
                      </div>
                    )}
                  </article>
                );
              })
            )}
          </div>
        </section>

        {incorrectCount > 0 && Object.keys(trackedMistakes).length > 0 && (
          <section className="mt-8 flex flex-col gap-4 rounded-2xl bg-amber-500/10 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-3">
              <BookOpen className="mt-0.5 size-5 shrink-0 text-amber-700 dark:text-amber-300" />
              <div>
                <h2 className="font-semibold">Mistakes saved automatically</h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  {Object.keys(trackedMistakes).length} answer{Object.keys(trackedMistakes).length === 1 ? " was" : "s were"} added to your Mistake Book.
                </p>
              </div>
            </div>
            <Link href="/dashboard/mistakes">
              <Button variant="outline" className="h-11 w-full bg-background/70 sm:w-auto">
                Open Mistake Book
              </Button>
            </Link>
          </section>
        )}

        <div className="mt-10 flex flex-col-reverse gap-3 border-t pt-6 sm:flex-row sm:items-center sm:justify-between">
          <Link href={backUrl}>
            <Button variant="ghost" size="lg" className="h-11 w-full sm:w-auto">
              <ArrowLeft className="size-4" />
              {backLabel}
            </Button>
          </Link>
          <Link href={retryUrl}>
            <Button size="lg" className="h-11 w-full sm:w-auto">
              <RotateCcw className="size-4" />
              Retry practice
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
