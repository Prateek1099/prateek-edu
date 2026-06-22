"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  CalendarDays,
  Clock,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { createRevisionPlan } from "@/app/actions/revision-actions";

interface RevisionOnboardingProps {
  board: string | null;
  qualification: string | null;
}

const DURATION_OPTIONS = [
  { value: 30, label: "30 min", hint: "~2 tasks/day" },
  { value: 45, label: "45 min", hint: "~3 tasks/day" },
  { value: 60, label: "60 min", hint: "~4 tasks/day" },
  { value: 90, label: "90 min", hint: "~5 tasks/day" },
];

const DAY_LABELS: Record<number, string> = {
  1: "Light",
  2: "Relaxed",
  3: "Moderate",
  4: "Balanced",
  5: "Weekdays",
  6: "Intense",
  7: "Every Day",
};

export function RevisionOnboarding({
  board,
  qualification,
}: RevisionOnboardingProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [examDate, setExamDate] = useState("");
  const [studyDaysPerWeek, setStudyDaysPerWeek] = useState(5);
  const [studyDuration, setStudyDuration] = useState(45);
  const [isGenerating, setIsGenerating] = useState(false);

  // Minimum date is tomorrow
  const tomorrow = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  }, []);

  // Days away calculation
  const daysAway = useMemo(() => {
    if (!examDate) return null;
    const diff = Math.ceil(
      (new Date(examDate).getTime() - new Date().getTime()) /
        (1000 * 60 * 60 * 24)
    );
    return diff > 0 ? diff : null;
  }, [examDate]);

  const canProceed = () => {
    if (step === 1) return !!examDate && daysAway !== null && daysAway > 0;
    if (step === 2) return studyDaysPerWeek >= 1 && studyDaysPerWeek <= 7;
    if (step === 3) return [30, 45, 60, 90].includes(studyDuration);
    return true;
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const result = await createRevisionPlan({
        examDate: new Date(examDate).toISOString(),
        studyDaysPerWeek,
        studyDuration,
        board: board || "cambridge",
        qualification: qualification || "igcse",
      });

      if (result.success) {
        toast.success("Revision plan created! Your tasks are ready.");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to create plan");
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Step Indicator */}
      <div className="flex items-center justify-center mb-10">
        {[1, 2, 3, 4].map((s, i) => (
          <div key={s} className="flex items-center">
            <button
              onClick={() => {
                if (s < step) setStep(s);
              }}
              className={cn(
                "relative flex items-center justify-center w-10 h-10 rounded-full border-2 text-sm font-bold transition-all duration-300",
                s === step
                  ? "border-primary bg-primary text-primary-foreground scale-110 shadow-lg shadow-primary/30"
                  : s < step
                    ? "border-primary bg-primary/20 text-primary cursor-pointer hover:bg-primary/30"
                    : "border-muted bg-muted/30 text-muted-foreground"
              )}
            >
              {s < step ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : (
                s
              )}
            </button>
            {i < 3 && (
              <div
                className={cn(
                  "w-12 sm:w-16 h-0.5 mx-1 transition-colors duration-300",
                  s < step ? "bg-primary" : "bg-muted"
                )}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <Card className="bg-card/80 backdrop-blur-sm border-primary/10 shadow-xl overflow-hidden">
        <CardContent className="p-6 sm:p-8">
          {/* ─── Step 1: Exam Date ─── */}
          <div
            className={cn(
              "transition-all duration-300",
              step === 1
                ? "opacity-100 translate-y-0"
                : "hidden"
            )}
          >
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
                <CalendarDays className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight">
                When is your exam?
              </h2>
              <p className="text-muted-foreground mt-2">
                We&apos;ll build your revision plan around this deadline
              </p>
            </div>

            <div className="max-w-xs mx-auto space-y-4">
              <input
                type="date"
                value={examDate}
                min={tomorrow}
                onChange={(e) => setExamDate(e.target.value)}
                className="w-full h-12 px-4 rounded-xl border border-border bg-muted/30 text-foreground text-center text-lg font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
              />
              {daysAway !== null && (
                <div className="text-center">
                  <span
                    className={cn(
                      "inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold",
                      daysAway > 60
                        ? "bg-emerald-500/10 text-emerald-500"
                        : daysAway > 30
                          ? "bg-amber-500/10 text-amber-500"
                          : "bg-red-500/10 text-red-500"
                    )}
                  >
                    <CalendarDays className="w-4 h-4" />
                    {daysAway} days away
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* ─── Step 2: Study Days ─── */}
          <div
            className={cn(
              "transition-all duration-300",
              step === 2
                ? "opacity-100 translate-y-0"
                : "hidden"
            )}
          >
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
                <CalendarDays className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight">
                How many days per week can you study?
              </h2>
              <p className="text-muted-foreground mt-2">
                Pick what works for your schedule
              </p>
            </div>

            <div className="grid grid-cols-7 gap-2 max-w-md mx-auto mb-4">
              {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                <button
                  key={d}
                  onClick={() => setStudyDaysPerWeek(d)}
                  className={cn(
                    "flex flex-col items-center justify-center h-14 rounded-xl border-2 text-sm font-bold transition-all duration-200",
                    studyDaysPerWeek === d
                      ? "border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-105"
                      : "border-border bg-muted/20 text-foreground hover:border-primary/40 hover:bg-primary/5"
                  )}
                >
                  {d}
                </button>
              ))}
            </div>

            <div className="text-center">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold">
                {DAY_LABELS[studyDaysPerWeek] || "Custom"} Schedule
              </span>
            </div>
          </div>

          {/* ─── Step 3: Study Duration ─── */}
          <div
            className={cn(
              "transition-all duration-300",
              step === 3
                ? "opacity-100 translate-y-0"
                : "hidden"
            )}
          >
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
                <Clock className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight">
                How long is each study session?
              </h2>
              <p className="text-muted-foreground mt-2">
                Choose a comfortable session length
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto">
              {DURATION_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setStudyDuration(opt.value)}
                  className={cn(
                    "flex flex-col items-center justify-center p-5 rounded-xl border-2 transition-all duration-200",
                    studyDuration === opt.value
                      ? "border-primary bg-primary/10 shadow-lg shadow-primary/10 scale-[1.02]"
                      : "border-border bg-muted/20 hover:border-primary/40 hover:bg-primary/5"
                  )}
                >
                  <Clock
                    className={cn(
                      "w-5 h-5 mb-2",
                      studyDuration === opt.value
                        ? "text-primary"
                        : "text-muted-foreground"
                    )}
                  />
                  <span
                    className={cn(
                      "text-lg font-bold",
                      studyDuration === opt.value
                        ? "text-primary"
                        : "text-foreground"
                    )}
                  >
                    {opt.label}
                  </span>
                  <span className="text-xs text-muted-foreground mt-1">
                    {opt.hint}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* ─── Step 4: Confirmation ─── */}
          <div
            className={cn(
              "transition-all duration-300",
              step === 4
                ? "opacity-100 translate-y-0"
                : "hidden"
            )}
          >
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight">
                Your Revision Plan
              </h2>
              <p className="text-muted-foreground mt-2">
                Review your settings before we generate your plan
              </p>
            </div>

            <div className="space-y-3 max-w-sm mx-auto mb-8">
              <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border">
                <div className="flex items-center gap-3">
                  <CalendarDays className="w-5 h-5 text-primary" />
                  <span className="text-sm text-muted-foreground">
                    Exam Date
                  </span>
                </div>
                <span className="text-sm font-semibold">
                  {examDate
                    ? new Date(examDate).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : "—"}
                </span>
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border">
                <div className="flex items-center gap-3">
                  <CalendarDays className="w-5 h-5 text-primary" />
                  <span className="text-sm text-muted-foreground">
                    Study Days
                  </span>
                </div>
                <span className="text-sm font-semibold">
                  {studyDaysPerWeek} days/week (
                  {DAY_LABELS[studyDaysPerWeek]})
                </span>
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-primary" />
                  <span className="text-sm text-muted-foreground">
                    Session Length
                  </span>
                </div>
                <span className="text-sm font-semibold">
                  {studyDuration} minutes
                </span>
              </div>

              {daysAway && (
                <div className="flex items-center justify-between p-4 rounded-xl bg-primary/5 border border-primary/20">
                  <div className="flex items-center gap-3">
                    <Sparkles className="w-5 h-5 text-primary" />
                    <span className="text-sm text-muted-foreground">
                      Time Remaining
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-primary">
                    {daysAway} days
                  </span>
                </div>
              )}
            </div>

            <Button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full h-12 text-base font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Generating Your Plan...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Generate My Plan
                </>
              )}
            </Button>
          </div>

          {/* ─── Navigation Buttons ─── */}
          {step < 4 && (
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-border/50">
              <Button
                variant="ghost"
                onClick={() => setStep(Math.max(1, step - 1))}
                disabled={step === 1}
                className="gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </Button>
              <Button
                onClick={() => setStep(Math.min(4, step + 1))}
                disabled={!canProceed()}
                className="gap-1 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}

          {step === 4 && (
            <div className="mt-4">
              <Button
                variant="ghost"
                onClick={() => setStep(3)}
                className="w-full gap-1 text-muted-foreground"
              >
                <ChevronLeft className="w-4 h-4" />
                Go Back and Edit
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
