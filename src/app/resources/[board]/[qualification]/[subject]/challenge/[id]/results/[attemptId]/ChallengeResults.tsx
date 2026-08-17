"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  Trophy,
  CheckCircle2,
  XCircle,
  Clock,
  BarChart3,
  RotateCcw,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  AlertTriangle,
  BookOpen,
} from "lucide-react";
import { AskTeacherDialog } from "@/components/AskTeacherDialog";
import QuickPracticeResults from "./QuickPracticeResults";

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

type Props = {
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
  retryUrl: string;
  trackedMistakes?: Record<string, { count: number; status: string }>;
};

const OPTIONS = ["A", "B", "C", "D"] as const;

function formatTime(seconds: number | null): string {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

function getPerformanceMessage(pct: number) {
  if (pct >= 90) return { text: "Excellent! Outstanding mastery of this topic.", color: "text-emerald-600 dark:text-emerald-400" };
  if (pct >= 75) return { text: "Great work! Strong understanding demonstrated.", color: "text-primary" };
  if (pct >= 50) return { text: "Good effort! Some areas need more revision.", color: "text-amber-600 dark:text-amber-400" };
  return { text: "Keep practicing! Focus on the topics below.", color: "text-red-500" };
}

function getOptionText(q: QuestionData, opt: string): string {
  const map: Record<string, string> = { A: q.optionA, B: q.optionB, C: q.optionC, D: q.optionD };
  return map[opt] || "";
}

export default function ChallengeResults(props: Props) {
  if (props.challenge.type === "QUICK_PRACTICE") {
    return <QuickPracticeResults {...props} />;
  }

  return <LegacyChallengeResults {...props} />;
}

function LegacyChallengeResults({ attempt, challenge, backUrl, retryUrl, trackedMistakes = {} }: Props) {
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());
  const perf = getPerformanceMessage(attempt.percentage);
  const incorrect = attempt.totalQuestions - attempt.score;

  // Topic performance
  const topicStats = useMemo(() => {
    const stats: Record<string, { correct: number; total: number }> = {};
    challenge.questions.forEach((q) => {
      const tag = q.topicTag || "General";
      if (!stats[tag]) stats[tag] = { correct: 0, total: 0 };
      stats[tag].total++;
      const userAnswer = attempt.answers[q.id];
      if (userAnswer?.toUpperCase() === q.correctAnswer.toUpperCase()) {
        stats[tag].correct++;
      }
    });
    return Object.entries(stats)
      .map(([topic, s]) => ({ topic, ...s, percentage: Math.round((s.correct / s.total) * 100) }))
      .sort((a, b) => a.percentage - b.percentage);
  }, [challenge.questions, attempt.answers]);

  const weakTopics = topicStats.filter((t) => t.percentage < 70);

  const toggleQuestion = (id: string) => {
    setExpandedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => {
    setExpandedQuestions(new Set(challenge.questions.map((q) => q.id)));
  };

  // SVG ring
  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (attempt.percentage / 100) * circumference;

  return (
    <div className="relative container max-w-4xl mx-auto px-4 py-8 md:py-12 space-y-8">
      {/* Ambient background glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 mx-auto h-72 max-w-4xl overflow-hidden blur-3xl opacity-20 bg-gradient-to-b from-indigo-500/25 via-purple-600/15 to-transparent"
      />

      {/* Hero Score Card */}
      <Card className="rounded-2xl border border-border/80 bg-card shadow-lg overflow-hidden relative">
        <div className={cn(
          "absolute top-0 left-0 right-0 h-1.5",
          attempt.percentage >= 75 ? "bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-300" :
          attempt.percentage >= 50 ? "bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-300" :
          "bg-gradient-to-r from-red-500 via-rose-400 to-red-300"
        )} />
        <CardContent className="p-6 sm:p-8 md:p-10">
          <div className="flex flex-col md:flex-row items-center gap-8">
            {/* Score Ring */}
            <div className="relative shrink-0">
              <svg width="148" height="148" className="-rotate-90">
                <circle cx="74" cy="74" r={radius} fill="none" stroke="currentColor" strokeWidth="8" className="text-muted/30" />
                <circle
                  cx="74" cy="74" r={radius} fill="none"
                  strokeWidth="8" strokeLinecap="round"
                  stroke="currentColor"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  className={cn(
                    "transition-all duration-1000 ease-out",
                    attempt.percentage >= 75 ? "text-emerald-500" :
                    attempt.percentage >= 50 ? "text-amber-500" : "text-red-500"
                  )}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-extrabold tracking-tight text-foreground">{attempt.score}/{attempt.totalQuestions}</span>
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{Math.round(attempt.percentage)}%</span>
              </div>
            </div>

            {/* Info */}
            <div className="text-center md:text-left flex-1">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">{challenge.title}</h1>
              <p className={cn("text-base sm:text-lg mt-2 font-bold", perf.color)}>{perf.text}</p>

              {weakTopics.length > 0 && (
                <div className="mt-3 flex items-start justify-center md:justify-start gap-2 text-xs sm:text-sm text-muted-foreground font-medium">
                  <AlertTriangle className="size-4 shrink-0 mt-0.5 text-amber-500" />
                  <span>
                    Review focus: <strong className="text-foreground">{weakTopics.map((t) => t.topic).join(", ")}</strong>
                  </span>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-6">
                <Link href={retryUrl}>
                  <Button variant="outline" className="rounded-xl h-10 px-4 text-xs sm:text-sm font-semibold">
                    <RotateCcw className="size-3.5 mr-2" /> Retry Challenge
                  </Button>
                </Link>
                <Link href={backUrl}>
                  <Button variant="ghost" className="rounded-xl h-10 px-4 text-xs sm:text-sm font-semibold text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="size-3.5 mr-2" /> Back to Challenges
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Card className="rounded-2xl border border-border/80 bg-card shadow-sm">
          <CardContent className="p-4 sm:p-5 flex items-center gap-3.5">
            <div className="size-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
              <CheckCircle2 className="size-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Correct</p>
              <p className="text-xl font-extrabold text-foreground">{attempt.score}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border border-border/80 bg-card shadow-sm">
          <CardContent className="p-4 sm:p-5 flex items-center gap-3.5">
            <div className="size-10 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive shrink-0">
              <XCircle className="size-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Incorrect</p>
              <p className="text-xl font-extrabold text-foreground">{incorrect}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border border-border/80 bg-card shadow-sm">
          <CardContent className="p-4 sm:p-5 flex items-center gap-3.5">
            <div className="size-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <Clock className="size-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Time</p>
              <p className="text-xl font-extrabold text-foreground">{formatTime(attempt.timeTaken)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border border-border/80 bg-card shadow-sm">
          <CardContent className="p-4 sm:p-5 flex items-center gap-3.5">
            <div className="size-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <BarChart3 className="size-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Difficulty</p>
              <p className="text-xl font-extrabold capitalize text-foreground">{challenge.difficulty}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Topic Performance */}
      {topicStats.length > 1 && (
        <div className="space-y-4">
          <h2 className="text-lg sm:text-xl font-bold tracking-tight flex items-center gap-2">
            <Trophy className="size-5 text-primary" /> Topic Performance
          </h2>
          <Card className="rounded-2xl border border-border/80 bg-card shadow-sm">
            <CardContent className="p-5 sm:p-6 space-y-4">
              {topicStats.map((t) => (
                <div key={t.topic} className="space-y-1.5">
                  <div className="flex justify-between text-xs sm:text-sm">
                    <span className="font-semibold text-foreground">{t.topic}</span>
                    <span className={cn(
                      "font-bold",
                      t.percentage >= 75 ? "text-emerald-600 dark:text-emerald-400" :
                      t.percentage >= 50 ? "text-amber-600 dark:text-amber-400" : "text-destructive"
                    )}>
                      {t.correct}/{t.total} ({t.percentage}%)
                    </span>
                  </div>
                  <Progress
                    value={t.percentage}
                    className={cn("h-2", t.percentage >= 75 ? "[&>div]:bg-emerald-500" : t.percentage >= 50 ? "[&>div]:bg-amber-500" : "[&>div]:bg-red-500")}
                  />
                  {t.percentage < 75 && (
                    <div className="flex justify-end pt-1">
                      <AskTeacherDialog
                        buttonLabel="Ask Teacher About This Topic"
                        variant="ghost"
                        className="text-xs text-muted-foreground hover:text-primary h-auto py-1 px-2"
                        context={{
                          source: "Challenge Results",
                          challengeName: challenge.title,
                          topic: t.topic,
                          score: t.percentage
                        }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Question Review */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" /> Question Review
          </h2>
          <Button variant="ghost" size="sm" onClick={expandAll}>
            Expand All
          </Button>
        </div>
        <div className="space-y-3">
          {challenge.questions.map((q, i) => {
            const userAnswer = attempt.answers[q.id]?.toUpperCase();
            const isCorrect = userAnswer === q.correctAnswer.toUpperCase();
            const isExpanded = expandedQuestions.has(q.id);

            return (
              <Card key={q.id} className={cn("shadow-sm transition-colors", isCorrect ? "border-emerald-500/30" : "border-red-500/30")}>
                <button
                  onClick={() => toggleQuestion(q.id)}
                  className="w-full text-left p-4 flex items-center gap-3"
                >
                  <div className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
                    isCorrect ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
                  )}>
                    {isCorrect ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      <span className="text-muted-foreground mr-2">Q{i + 1}.</span>
                      {q.questionText}
                    </p>
                  </div>
                  {q.topicTag && <Badge variant="secondary" className="text-xs shrink-0 hidden sm:inline-flex">{q.topicTag}</Badge>}
                  {!isCorrect && trackedMistakes[q.id] && (
                    <Badge variant="outline" className="text-xs shrink-0 hidden sm:inline-flex border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/5">
                      <BookOpen className="h-3 w-3 mr-1" /> {trackedMistakes[q.id].count}×
                    </Badge>
                  )}
                  {isExpanded ? <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />}
                </button>

                {isExpanded && (
                  <CardContent className="px-4 pb-4 pt-0 border-t border-border">
                    <p className="text-sm font-semibold mt-3 mb-4">{q.questionText}</p>
                    <div className="space-y-2">
                      {OPTIONS.map((opt) => {
                        const isUserAnswer = userAnswer === opt;
                        const isCorrectAnswer = q.correctAnswer.toUpperCase() === opt;
                        return (
                          <div
                            key={opt}
                            className={cn(
                              "flex items-center gap-3 p-3 rounded-lg border text-sm",
                              isCorrectAnswer && "border-emerald-500/50 bg-emerald-500/5",
                              isUserAnswer && !isCorrectAnswer && "border-red-500/50 bg-red-500/5",
                              !isCorrectAnswer && !isUserAnswer && "border-border bg-transparent"
                            )}
                          >
                            <div className={cn(
                              "h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                              isCorrectAnswer ? "bg-emerald-500 text-white" :
                              isUserAnswer ? "bg-red-500 text-white" :
                              "bg-muted text-muted-foreground"
                            )}>
                              {opt}
                            </div>
                            <span className="flex-1">{getOptionText(q, opt)}</span>
                            {isCorrectAnswer && <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />}
                            {isUserAnswer && !isCorrectAnswer && <XCircle className="h-4 w-4 text-red-500 shrink-0" />}
                          </div>
                        );
                      })}
                    </div>
                    {q.explanation && (
                      <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm">
                        <p className="font-semibold text-primary text-xs uppercase tracking-wider mb-1">Explanation</p>
                        <p className="text-foreground/90">{q.explanation}</p>
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      </div>
      {/* Mistake Book Auto-Capture Summary */}
      {incorrect > 0 && Object.keys(trackedMistakes).length > 0 && (
        <Card className="bg-amber-500/5 border-amber-500/20 shadow-sm mb-8">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="bg-amber-500/10 p-2 rounded-lg">
                <BookOpen className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="font-semibold text-sm">Mistakes Auto-Captured</p>
                <p className="text-xs text-muted-foreground">
                  {Object.keys(trackedMistakes).length} incorrect answer{Object.keys(trackedMistakes).length !== 1 ? 's' : ''} saved to your Mistake Book.
                  Review and mark revised when ready.
                </p>
              </div>
              <Link href="/dashboard/mistakes" className="ml-auto">
                <Button variant="outline" size="sm" className="border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10">
                  View Mistake Book
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
