"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { AlertTriangle, Check, ChevronLeft, ChevronRight, CircleAlert, Clock, LoaderCircle, RotateCcw, Send } from "lucide-react";

type ChallengeQuestion = {
  id: string;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  topicTag: string | null;
};

type Props = {
  challenge: {
    id: string;
    title: string;
    type: string;
    estimatedTime: number;
    questions: ChallengeQuestion[];
  };
  board: string;
  qualification: string;
  subject: string;
};

const OPTIONS = ["A", "B", "C", "D"] as const;

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default function ChallengeEngine({ challenge, board, qualification, subject }: Props) {
  const router = useRouter();
  const { questions } = challenge;
  const total = questions.length;

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const answeredCount = Object.keys(answers).length;
  const current = questions[currentIndex];
  const progressPercent = total > 0 ? Math.round((answeredCount / total) * 100) : 0;
  const positionProgress = total > 0 ? Math.round(((currentIndex + 1) / total) * 100) : 0;
  const isQuickPractice = challenge.type === "QUICK_PRACTICE";

  // Timer
  useEffect(() => {
    const interval = setInterval(() => setTimeElapsed((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const selectAnswer = useCallback(
    (opt: string) => {
      if (!current) return;
      setAnswers((prev) => ({ ...prev, [current.id]: opt }));
    },
    [current]
  );

  // Keyboard nav
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return;
      switch (e.key) {
        case "ArrowLeft":
          setCurrentIndex((i) => Math.max(0, i - 1));
          break;
        case "ArrowRight":
          setCurrentIndex((i) => Math.min(total - 1, i + 1));
          break;
        case "1": case "a": case "A":
          selectAnswer("A");
          break;
        case "2": case "b": case "B":
          selectAnswer("B");
          break;
        case "3": case "c": case "C":
          selectAnswer("C");
          break;
        case "4": case "d": case "D":
          selectAnswer("D");
          break;
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [currentIndex, selectAnswer, total]);

  const handleSubmit = async () => {
    setShowConfirm(false);
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/challenges/${challenge.id}/attempt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers, timeTaken: timeElapsed }),
      });
      const data = await res.json();
      if (res.ok && data.attemptId) {
        router.push(
          `/resources/${board}/${qualification}/${subject}/challenge/${challenge.id}/results/${data.attemptId}`
        );
      } else {
        const message = data.error || "Submission failed";
        if (isQuickPractice) setSubmitError(message);
        else alert(message);
        setIsSubmitting(false);
      }
    } catch {
      const message = "We couldn’t submit your answers. Check your connection and try again.";
      if (isQuickPractice) setSubmitError(message);
      else alert("Network error. Please try again.");
      setIsSubmitting(false);
    }
  };

  const getOptionText = (q: ChallengeQuestion, opt: string): string => {
    const map: Record<string, string> = { A: q.optionA, B: q.optionB, C: q.optionC, D: q.optionD };
    return map[opt] || "";
  };

  if (isQuickPractice && total === 0) {
    return (
      <main className="flex min-h-[calc(100vh-140px)] items-center justify-center bg-background px-4 py-12">
        <div className="w-full max-w-md rounded-2xl bg-muted/40 px-6 py-10 text-center">
          <CircleAlert className="mx-auto size-10 text-muted-foreground" />
          <h1 className="mt-4 text-xl font-semibold">No questions available</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            This practice set does not have any published questions yet. Please return to the subject page and choose another set.
          </p>
          <Button className="mt-6 h-11" onClick={() => router.back()}>
            Go back
          </Button>
        </div>
      </main>
    );
  }

  if (isSubmitting) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm text-center" role="status" aria-live="polite">
          {isQuickPractice ? (
            <LoaderCircle className="mx-auto size-10 animate-spin text-primary" />
          ) : (
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          )}
          <p className="mt-5 text-lg font-semibold">
            {isQuickPractice ? "Finishing your practice…" : "Submitting your answers..."}
          </p>
          {isQuickPractice && (
            <p className="mt-2 text-sm text-muted-foreground">Calculating your score and preparing your review.</p>
          )}
        </div>
      </div>
    );
  }

  if (isQuickPractice) {
    return (
      <div className="min-h-screen bg-muted/20">
        <header className="sticky top-16 z-30 border-b bg-background/95 backdrop-blur">
          <div className="mx-auto flex min-h-16 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{challenge.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {answeredCount} of {total} answered
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3 sm:gap-5">
              <div className="text-right">
                <p className="text-xs font-medium text-muted-foreground">Question</p>
                <p className="text-sm font-semibold tabular-nums">{currentIndex + 1} / {total}</p>
              </div>
              <div className="flex h-10 min-w-23 items-center justify-center gap-2 rounded-xl bg-muted px-3">
                <Clock className="size-4 text-primary" />
                <span className="font-mono text-sm font-semibold tabular-nums">{formatTimer(timeElapsed)}</span>
              </div>
            </div>
          </div>
          <Progress value={positionProgress} className="h-1 rounded-none" aria-label={`Question ${currentIndex + 1} of ${total}`} />
        </header>

        <main className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-6 sm:py-8">
          <nav aria-label="Practice questions" className="mb-5 flex gap-2 overflow-x-auto pb-2">
            {questions.map((question, index) => {
              const isCurrent = index === currentIndex;
              const isAnswered = Boolean(answers[question.id]);
              return (
                <button
                  key={question.id}
                  type="button"
                  onClick={() => setCurrentIndex(index)}
                  aria-label={`Question ${index + 1}${isAnswered ? ", answered" : ""}`}
                  aria-current={isCurrent ? "step" : undefined}
                  className={cn(
                    "flex size-11 shrink-0 items-center justify-center rounded-xl text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40",
                    isCurrent && "bg-foreground text-background",
                    !isCurrent && isAnswered && "bg-primary/12 text-primary",
                    !isCurrent && !isAnswered && "bg-background text-muted-foreground ring-1 ring-foreground/10 hover:bg-muted"
                  )}
                >
                  {isAnswered && !isCurrent ? <Check className="size-4" /> : index + 1}
                </button>
              );
            })}
          </nav>

          {submitError && (
            <div className="mb-5 flex flex-col gap-4 rounded-2xl bg-destructive/10 p-4 text-sm sm:flex-row sm:items-center sm:justify-between" role="alert">
              <div className="flex gap-3">
                <CircleAlert className="mt-0.5 size-5 shrink-0 text-destructive" />
                <div>
                  <p className="font-semibold text-foreground">Couldn’t submit your practice</p>
                  <p className="mt-1 text-muted-foreground">{submitError}</p>
                </div>
              </div>
              <Button variant="outline" className="h-10 shrink-0" onClick={() => setShowConfirm(true)}>
                <RotateCcw className="size-4" />
                Try again
              </Button>
            </div>
          )}

          <section className="mx-auto max-w-3xl overflow-hidden rounded-3xl bg-card ring-1 ring-foreground/10">
            <div className="px-5 py-6 sm:px-8 sm:py-9 md:px-10">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-semibold text-primary">Question {currentIndex + 1}</p>
                {current.topicTag && (
                  <Badge variant="secondary" className="font-medium">{current.topicTag}</Badge>
                )}
              </div>

              <h1 className="mt-5 text-xl font-semibold leading-8 tracking-tight text-balance sm:text-2xl sm:leading-9">
                {current.questionText}
              </h1>

              <div className="mt-8 space-y-3" role="radiogroup" aria-label={`Answers for question ${currentIndex + 1}`}>
                {OPTIONS.map((option) => {
                  const isSelected = answers[current.id] === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      onClick={() => selectAnswer(option)}
                      className={cn(
                        "group flex min-h-14 w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40 sm:min-h-16 sm:gap-4 sm:px-4",
                        isSelected
                          ? "bg-primary/10 text-foreground ring-2 ring-primary"
                          : "bg-muted/45 text-foreground ring-1 ring-foreground/10 hover:bg-muted"
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-9 shrink-0 items-center justify-center rounded-xl text-sm font-semibold transition-colors",
                          isSelected
                            ? "bg-primary text-primary-foreground"
                            : "bg-background text-muted-foreground ring-1 ring-foreground/10 group-hover:text-foreground"
                        )}
                      >
                        {isSelected ? <Check className="size-4" /> : option}
                      </span>
                      <span className="min-w-0 flex-1 text-sm leading-6 sm:text-base">
                        {getOptionText(current, option)}
                      </span>
                      {isSelected && <span className="hidden text-xs font-semibold text-primary sm:inline">Selected</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-3 border-t bg-muted/25 px-4 py-4 sm:px-8">
              <Button
                variant="ghost"
                size="lg"
                className="h-11 px-3 sm:px-4"
                onClick={() => setCurrentIndex((index) => Math.max(0, index - 1))}
                disabled={currentIndex === 0}
              >
                <ChevronLeft className="size-4" />
                <span className="hidden sm:inline">Previous</span>
              </Button>

              <div className="ml-auto flex items-center gap-3">
                {currentIndex === total - 1 ? (
                  <Button size="lg" className="h-11 px-5" onClick={() => setShowConfirm(true)}>
                    Submit practice
                    <Send className="size-4" />
                  </Button>
                ) : (
                  <Button
                    size="lg"
                    className="h-11 px-5"
                    onClick={() => setCurrentIndex((index) => Math.min(total - 1, index + 1))}
                  >
                    Next
                    <ChevronRight className="size-4" />
                  </Button>
                )}
              </div>
            </div>
          </section>

          <p className="mx-auto mt-4 max-w-3xl text-center text-xs text-muted-foreground">
            Your answers are saved while you move between questions. Results appear after you submit.
          </p>
        </main>

        <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                {answeredCount < total && <AlertTriangle className="size-5 text-amber-500" />}
                Finish this practice?
              </DialogTitle>
              <DialogDescription className="pt-1 leading-6">
                {answeredCount < total ? (
                  <>
                    You answered <strong className="text-foreground">{answeredCount}</strong> of{" "}
                    <strong className="text-foreground">{total}</strong> questions. The remaining{" "}
                    <strong className="text-foreground">{total - answeredCount}</strong> will be marked incorrect.
                  </>
                ) : (
                  <>You answered all {total} questions. Submit now to see your score and explanations.</>
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="mt-3 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button variant="outline" size="lg" className="h-11" onClick={() => setShowConfirm(false)}>
                Keep reviewing
              </Button>
              <Button size="lg" className="h-11" onClick={handleSubmit}>
                Submit answers
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-background">
      {/* Top Bar */}
      <div className="sticky top-0 z-30 bg-card/90 backdrop-blur-md border-b border-border/80 shadow-xs">
        <div className="container max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 min-w-0">
            <h2 className="font-bold text-xs sm:text-sm md:text-base truncate text-foreground">{challenge.title}</h2>
          </div>
          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
            <span className="text-xs sm:text-sm text-muted-foreground hidden sm:inline font-medium">
              Question {currentIndex + 1} of {total}
            </span>
            <div className="flex items-center gap-1.5 bg-primary/10 border border-primary/20 text-primary px-3 py-1.5 rounded-xl shadow-2xs">
              <Clock className="size-3.5 text-primary" />
              <span className="font-mono text-xs sm:text-sm font-bold">{formatTimer(timeElapsed)}</span>
            </div>
          </div>
        </div>
        <Progress value={progressPercent} className="h-1 rounded-none bg-muted/40" />
      </div>

      <div className="container max-w-6xl mx-auto px-4 py-6 sm:py-8 space-y-6">
        {/* Mobile palette */}
        <div className="flex gap-1.5 overflow-x-auto pb-2 lg:hidden scrollbar-none">
          {questions.map((q, i) => (
            <button
              key={q.id}
              onClick={() => setCurrentIndex(i)}
              className={cn(
                "size-9 shrink-0 rounded-xl text-xs font-bold transition-all outline-none",
                i === currentIndex && "ring-2 ring-primary ring-offset-2 ring-offset-background shadow-xs",
                answers[q.id]
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted border border-border/60"
              )}
            >
              {i + 1}
            </button>
          ))}
        </div>

        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          {/* Question Area */}
          <div className="flex-1 min-w-0">
            <Card className="rounded-2xl border border-border/80 bg-card shadow-sm">
              <CardContent className="p-5 sm:p-8 md:p-10">
                {/* Question Header */}
                <div className="flex items-start justify-between gap-3 mb-6">
                  <span className="text-xs font-bold uppercase tracking-wider text-primary bg-primary/10 border border-primary/20 px-3 py-1 rounded-lg shrink-0">
                    Question {currentIndex + 1} of {total}
                  </span>
                  {current.topicTag && (
                    <Badge variant="secondary" className="bg-primary/10 border border-primary/20 text-primary text-xs font-semibold shrink-0">
                      {current.topicTag}
                    </Badge>
                  )}
                </div>

                {/* Question Text */}
                <p className="text-base sm:text-lg md:text-xl font-bold leading-relaxed mb-8 text-foreground">
                  {current.questionText}
                </p>

                {/* Options */}
                <div className="space-y-3">
                  {OPTIONS.map((opt) => {
                    const isSelected = answers[current.id] === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => selectAnswer(opt)}
                        className={cn(
                          "w-full flex items-center gap-3.5 sm:gap-4 p-4 rounded-xl border text-left transition-all duration-150 outline-none select-none cursor-pointer",
                          isSelected
                            ? "border-primary bg-primary/10 text-foreground ring-2 ring-primary/20 shadow-xs"
                            : "border-border/80 bg-card hover:border-primary/40 hover:bg-muted/30 text-foreground"
                        )}
                      >
                        <div
                          className={cn(
                            "size-8 sm:size-9 rounded-xl flex items-center justify-center text-xs sm:text-sm font-bold shrink-0 transition-colors border",
                            isSelected
                              ? "bg-primary border-primary text-primary-foreground shadow-xs"
                              : "bg-muted/50 border-border/80 text-muted-foreground"
                          )}
                        >
                          {isSelected ? <Check className="size-4" /> : opt}
                        </div>
                        <span className={cn("text-xs sm:text-sm md:text-base leading-relaxed flex-1", isSelected && "font-semibold")}>
                          {getOptionText(current, opt)}
                        </span>
                        {isSelected && <span className="hidden text-xs font-bold text-primary sm:inline">Selected</span>}
                      </button>
                    );
                  })}
                </div>

                {/* Navigation */}
                <div className="flex items-center justify-between mt-8 pt-6 border-t border-border/60">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                    disabled={currentIndex === 0}
                    className="rounded-xl h-10 px-4 text-xs sm:text-sm font-semibold"
                  >
                    <ChevronLeft className="size-4 mr-1" /> Previous
                  </Button>

                  {currentIndex === total - 1 ? (
                    <Button
                      onClick={() => setShowConfirm(true)}
                      className="rounded-xl h-10 px-6 font-semibold text-xs sm:text-sm shadow-md"
                      size="default"
                    >
                      <Send className="size-3.5 mr-2" /> Submit Challenge
                    </Button>
                  ) : (
                    <Button
                      onClick={() => setCurrentIndex((i) => Math.min(total - 1, i + 1))}
                      className="rounded-xl h-10 px-5 text-xs sm:text-sm font-semibold shadow-xs"
                    >
                      Next <ChevronRight className="size-4 ml-1" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Desktop Palette Sidebar */}
          <div className="hidden lg:block w-72 shrink-0">
            <div className="sticky top-24">
              <Card className="rounded-2xl border border-border/80 bg-card shadow-sm">
                <CardContent className="p-5">
                  <h3 className="text-xs font-bold mb-4 text-muted-foreground uppercase tracking-wider">
                    Question Palette
                  </h3>
                  <div className="grid grid-cols-5 gap-2">
                    {questions.map((q, i) => (
                      <button
                        key={q.id}
                        onClick={() => setCurrentIndex(i)}
                        className={cn(
                          "size-10 rounded-xl text-xs font-bold transition-all outline-none",
                          i === currentIndex && "ring-2 ring-primary ring-offset-2 ring-offset-background shadow-xs",
                          answers[q.id]
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted/60 text-muted-foreground hover:bg-muted border border-border/60"
                        )}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>
                  <div className="mt-5 pt-4 border-t border-border/60 space-y-2 text-xs font-medium">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Answered</span>
                      <span className="font-bold text-primary">{answeredCount}/{total}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Remaining</span>
                      <span className="font-bold text-foreground">{total - answeredCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Time elapsed</span>
                      <span className="font-mono font-bold text-foreground">{formatTimer(timeElapsed)}</span>
                    </div>
                  </div>
                  <Button
                    onClick={() => setShowConfirm(true)}
                    className="w-full mt-5 font-semibold rounded-xl text-xs sm:text-sm h-10 shadow-sm"
                    variant={answeredCount === total ? "default" : "outline"}
                  >
                    <Send className="size-3.5 mr-2" /> Submit Answers
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Submit Confirmation Dialog */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="max-w-md rounded-2xl border border-border/80 bg-card p-6 shadow-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              {answeredCount < total && <AlertTriangle className="size-5 text-amber-500" />}
              Submit Challenge?
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm text-muted-foreground leading-relaxed pt-1">
              {answeredCount < total ? (
                <>
                  You have answered <strong className="text-foreground font-semibold">{answeredCount}</strong> out of <strong className="text-foreground font-semibold">{total}</strong> questions.{" "}
                  <strong className="text-foreground font-semibold">{total - answeredCount}</strong> unanswered questions will be marked incorrect.
                </>
              ) : (
                <>
                  You have answered all <strong className="text-foreground font-semibold">{total}</strong> questions. Ready to submit?
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2.5 mt-5">
            <Button variant="outline" className="rounded-xl text-xs font-semibold" onClick={() => setShowConfirm(false)}>
              Keep Reviewing
            </Button>
            <Button className="rounded-xl text-xs font-semibold shadow-md" onClick={handleSubmit}>
              Submit Answers
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
