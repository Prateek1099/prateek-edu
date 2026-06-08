"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Clock, ChevronLeft, ChevronRight, Send, AlertTriangle } from "lucide-react";

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

  const answeredCount = Object.keys(answers).length;
  const current = questions[currentIndex];
  const progressPercent = total > 0 ? Math.round((answeredCount / total) * 100) : 0;

  // Timer
  useEffect(() => {
    const interval = setInterval(() => setTimeElapsed((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

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
  }, [currentIndex, total]);

  const selectAnswer = useCallback(
    (opt: string) => {
      if (!current) return;
      setAnswers((prev) => ({ ...prev, [current.id]: opt }));
    },
    [current]
  );

  const handleSubmit = async () => {
    setShowConfirm(false);
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
        alert(data.error || "Submission failed");
        setIsSubmitting(false);
      }
    } catch {
      alert("Network error. Please try again.");
      setIsSubmitting(false);
    }
  };

  const getOptionText = (q: ChallengeQuestion, opt: string): string => {
    const map: Record<string, string> = { A: q.optionA, B: q.optionB, C: q.optionC, D: q.optionD };
    return map[opt] || "";
  };

  if (isSubmitting) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin mx-auto" />
          <p className="text-lg font-semibold">Submitting your answers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top Bar */}
      <div className="sticky top-0 z-30 bg-card/95 backdrop-blur-sm border-b border-border shadow-sm">
        <div className="container max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <h2 className="font-bold text-sm md:text-base truncate">{challenge.title}</h2>
          <div className="flex items-center gap-4 shrink-0">
            <span className="text-sm text-muted-foreground hidden sm:inline">
              Question {currentIndex + 1} of {total}
            </span>
            <div className="flex items-center gap-1.5 bg-muted px-3 py-1.5 rounded-lg">
              <Clock className="h-4 w-4 text-primary" />
              <span className="font-mono text-sm font-semibold">{formatTimer(timeElapsed)}</span>
            </div>
          </div>
        </div>
        <Progress value={progressPercent} className="h-1 rounded-none" />
      </div>

      <div className="container max-w-6xl mx-auto px-4 py-6">
        {/* Mobile palette */}
        <div className="flex gap-1.5 overflow-x-auto pb-4 lg:hidden scrollbar-none">
          {questions.map((q, i) => (
            <button
              key={q.id}
              onClick={() => setCurrentIndex(i)}
              className={cn(
                "h-9 w-9 shrink-0 rounded-lg text-xs font-bold transition-all",
                i === currentIndex && "ring-2 ring-primary ring-offset-2 ring-offset-background",
                answers[q.id]
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {i + 1}
            </button>
          ))}
        </div>

        <div className="flex gap-8">
          {/* Question Area */}
          <div className="flex-1 min-w-0">
            <Card className="shadow-sm">
              <CardContent className="p-6 md:p-8">
                {/* Question Header */}
                <div className="flex items-start justify-between gap-3 mb-6">
                  <span className="text-sm font-semibold text-primary bg-primary/10 px-3 py-1 rounded-lg shrink-0">
                    Q{currentIndex + 1}
                  </span>
                  {current.topicTag && (
                    <Badge variant="secondary" className="text-xs shrink-0">
                      {current.topicTag}
                    </Badge>
                  )}
                </div>

                {/* Question Text */}
                <p className="text-lg md:text-xl font-semibold leading-relaxed mb-8">
                  {current.questionText}
                </p>

                {/* Options */}
                <div className="space-y-3">
                  {OPTIONS.map((opt) => {
                    const isSelected = answers[current.id] === opt;
                    return (
                      <button
                        key={opt}
                        onClick={() => selectAnswer(opt)}
                        className={cn(
                          "w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all",
                          isSelected
                            ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                            : "border-border bg-card hover:border-primary/40 hover:bg-muted/30"
                        )}
                      >
                        <div
                          className={cn(
                            "h-9 w-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition-colors",
                            isSelected
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          {opt}
                        </div>
                        <span className={cn("text-sm md:text-base", isSelected && "font-medium text-foreground")}>
                          {getOptionText(current, opt)}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Navigation */}
                <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                    disabled={currentIndex === 0}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                  </Button>

                  {currentIndex === total - 1 ? (
                    <Button
                      onClick={() => setShowConfirm(true)}
                      className="px-8 font-semibold"
                      size="lg"
                    >
                      <Send className="h-4 w-4 mr-2" /> Submit Challenge
                    </Button>
                  ) : (
                    <Button
                      onClick={() => setCurrentIndex((i) => Math.min(total - 1, i + 1))}
                    >
                      Next <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Desktop Palette Sidebar */}
          <div className="hidden lg:block w-64 shrink-0">
            <div className="sticky top-24">
              <Card className="shadow-sm">
                <CardContent className="p-5">
                  <h3 className="text-sm font-bold mb-4 text-muted-foreground uppercase tracking-wider">
                    Question Palette
                  </h3>
                  <div className="grid grid-cols-5 gap-2">
                    {questions.map((q, i) => (
                      <button
                        key={q.id}
                        onClick={() => setCurrentIndex(i)}
                        className={cn(
                          "h-10 w-10 rounded-lg text-xs font-bold transition-all",
                          i === currentIndex && "ring-2 ring-primary ring-offset-2 ring-offset-background",
                          answers[q.id]
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        )}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>
                  <div className="mt-5 pt-4 border-t border-border space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Answered</span>
                      <span className="font-semibold text-primary">{answeredCount}/{total}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Remaining</span>
                      <span className="font-semibold">{total - answeredCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Time</span>
                      <span className="font-mono font-semibold">{formatTimer(timeElapsed)}</span>
                    </div>
                  </div>
                  <Button
                    onClick={() => setShowConfirm(true)}
                    className="w-full mt-5 font-semibold"
                    variant={answeredCount === total ? "default" : "outline"}
                  >
                    <Send className="h-4 w-4 mr-2" /> Submit
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Submit Confirmation Dialog */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {answeredCount < total && <AlertTriangle className="h-5 w-5 text-amber-500" />}
              Submit Challenge?
            </DialogTitle>
            <DialogDescription>
              {answeredCount < total ? (
                <>
                  You have answered <strong>{answeredCount}</strong> out of <strong>{total}</strong> questions.{" "}
                  <strong>{total - answeredCount}</strong> unanswered questions will be marked incorrect.
                </>
              ) : (
                <>
                  You have answered all <strong>{total}</strong> questions. Ready to submit?
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setShowConfirm(false)}>
              Go Back
            </Button>
            <Button onClick={handleSubmit}>
              Submit Answers
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
