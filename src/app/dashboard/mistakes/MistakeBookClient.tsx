"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Lightbulb,
  BookOpen,
} from "lucide-react";
import { AskTeacherDialog } from "@/components/AskTeacherDialog";

type MistakeItem = {
  id: string;
  topicTag: string | null;
  studentAnswer: string;
  correctAnswer: string;
  mistakeCount: number;
  status: string;
  updatedAt: string;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  explanation: string | null;
  challengeTitle: string;
  challengeId: string;
  retryUrl: string;
};

const OPTIONS = ["A", "B", "C", "D"] as const;

function getOptionText(m: MistakeItem, opt: string): string {
  const map: Record<string, string> = { A: m.optionA, B: m.optionB, C: m.optionC, D: m.optionD };
  return map[opt] || "";
}

export default function MistakeBookClient({ mistakes }: { mistakes: MistakeItem[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<"all" | "needs_revision" | "revised">("all");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [toggling, setToggling] = useState<string | null>(null);

  const filtered = useMemo(
    () => (filter === "all" ? mistakes : mistakes.filter((m) => m.status === filter)),
    [mistakes, filter]
  );

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "needs_revision" ? "revised" : "needs_revision";
    setToggling(id);
    try {
      const res = await fetch("/api/mistakes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus }),
      });
      if (res.ok) {
        toast.success(newStatus === "revised" ? "Marked as revised ✓" : "Marked for revision");
        router.refresh();
      } else {
        toast.error("Failed to update");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setToggling(null);
    }
  };

  // Group by challengeId for retry links
  const challengeRetryMap = useMemo(() => {
    const map: Record<string, { title: string; url: string }> = {};
    mistakes.forEach((m) => {
      if (!map[m.challengeId]) {
        map[m.challengeId] = { title: m.challengeTitle, url: m.retryUrl };
      }
    });
    return map;
  }, [mistakes]);

  if (mistakes.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/80 bg-muted/20 px-5 py-16 text-center">
        <BookOpen className="mx-auto size-10 text-muted-foreground opacity-50 mb-3" />
        <h3 className="text-base sm:text-lg font-bold">No mistakes recorded yet</h3>
        <p className="mx-auto mt-1 max-w-md text-xs sm:text-sm leading-relaxed text-muted-foreground">
          As you practice Topic Challenges, questions you answer incorrectly will appear here automatically for review.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {([
          ["all", "All Mistakes", mistakes.length],
          ["needs_revision", "Needs Revision", mistakes.filter((m) => m.status === "needs_revision").length],
          ["revised", "Revised", mistakes.filter((m) => m.status === "revised").length],
        ] as const).map(([key, label, count]) => {
          const isSelected = filter === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold transition-all duration-150 outline-none select-none cursor-pointer",
                isSelected
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                  : "bg-muted/40 text-muted-foreground hover:bg-muted/80 hover:text-foreground border border-border/60"
              )}
            >
              <span>{label}</span>
              <span className={cn("px-1.5 py-0.2 rounded-md text-[11px] font-bold", isSelected ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground")}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Retry Related Challenges */}
      {Object.keys(challengeRetryMap).length > 0 && filter !== "revised" && (
        <Card className="rounded-2xl border border-primary/20 bg-primary/5 shadow-sm">
          <CardContent className="p-4 sm:p-5">
            <p className="text-xs sm:text-sm font-bold text-primary mb-3 flex items-center gap-2">
              <RotateCcw className="size-4" /> Retry Related Challenges
            </p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(challengeRetryMap).map(([id, ch]) => (
                <Link key={id} href={ch.url}>
                  <Badge variant="outline" className="cursor-pointer bg-background hover:bg-primary/10 border-primary/30 transition-colors py-1.5 px-3 rounded-xl text-xs font-semibold">
                    {ch.title} →
                  </Badge>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mistake Cards */}
      <div className="space-y-3">
        {filtered.map((m) => {
          const isExpanded = expanded.has(m.id);
          const isRevised = m.status === "revised";

          return (
            <Card
              key={m.id}
              className={cn(
                "rounded-2xl shadow-sm transition-all duration-200 overflow-hidden bg-card",
                isRevised
                  ? "border border-emerald-500/30 opacity-80"
                  : "border border-border/80 hover:border-amber-500/40"
              )}
            >
              {/* Collapsed Header */}
              <button
                onClick={() => toggleExpand(m.id)}
                className="w-full text-left p-4 sm:p-5 flex items-center gap-3.5 transition-colors hover:bg-muted/20 outline-none"
              >
                <div className={cn(
                  "size-9 rounded-xl flex items-center justify-center shrink-0 border",
                  isRevised
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                    : "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400"
                )}>
                  {isRevised ? <CheckCircle2 className="size-4" /> : <XCircle className="size-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-semibold truncate text-foreground">{m.questionText}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    {m.topicTag && (
                      <Badge variant="secondary" className="bg-primary/10 border border-primary/20 text-primary text-[11px] font-semibold px-2 py-0.2">
                        {m.topicTag}
                      </Badge>
                    )}
                    <span className="text-[11px] sm:text-xs text-muted-foreground font-medium">
                      {m.challengeTitle} · {m.mistakeCount}× wrong
                    </span>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    "shrink-0 text-xs font-bold px-2.5 py-0.5 rounded-lg",
                    m.mistakeCount >= 3
                      ? "border-destructive/40 text-destructive bg-destructive/10"
                      : "border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10"
                  )}
                >
                  ×{m.mistakeCount}
                </Badge>
                {isExpanded ? (
                  <ChevronUp className="size-4 shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                )}
              </button>

              {/* Expanded Content */}
              {isExpanded && (
                <CardContent className="px-4 sm:px-6 pb-5 pt-0 border-t border-border/60">
                  <p className="text-sm font-bold mt-4 mb-4 text-foreground leading-relaxed">{m.questionText}</p>
                  <div className="space-y-2">
                    {OPTIONS.map((opt) => {
                      const isStudent = m.studentAnswer.toUpperCase() === opt;
                      const isCorrect = m.correctAnswer.toUpperCase() === opt;
                      return (
                        <div
                          key={opt}
                          className={cn(
                            "flex items-center gap-3 p-3 sm:p-3.5 rounded-xl border text-xs sm:text-sm transition-colors",
                            isCorrect && "border-emerald-500/50 bg-emerald-500/10 text-emerald-950 dark:text-emerald-100 font-medium",
                            isStudent && !isCorrect && "border-destructive/50 bg-destructive/10 text-destructive-foreground font-medium",
                            !isCorrect && !isStudent && "border-border/60 bg-muted/20 text-muted-foreground"
                          )}
                        >
                          <div className={cn(
                            "size-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0",
                            isCorrect ? "bg-emerald-600 text-white" :
                            isStudent ? "bg-destructive text-white" :
                            "bg-muted text-muted-foreground border border-border/60"
                          )}>
                            {opt}
                          </div>
                          <span className="flex-1 leading-relaxed">{getOptionText(m, opt)}</span>
                          {isCorrect && <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />}
                          {isStudent && !isCorrect && <XCircle className="size-4 text-destructive shrink-0" />}
                        </div>
                      );
                    })}
                  </div>

                  {m.explanation && (
                    <div className="mt-4 p-3.5 rounded-xl bg-primary/5 border border-primary/20 text-xs sm:text-sm">
                      <p className="font-bold text-primary text-[11px] uppercase tracking-wider mb-1 flex items-center gap-1.5">
                        <Lightbulb className="size-3.5" /> Explanation
                      </p>
                      <p className="text-foreground/90 leading-relaxed">{m.explanation}</p>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-5 pt-4 border-t border-border/60">
                    <div className="text-[11px] sm:text-xs text-muted-foreground font-medium">
                      Last answered incorrectly: {new Date(m.updatedAt).toLocaleDateString()}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link href={m.retryUrl}>
                        <Button variant="outline" size="sm" className="rounded-xl h-9 text-xs font-semibold">
                          <RotateCcw className="size-3.5 mr-1.5" /> Retry Challenge
                        </Button>
                      </Link>
                      <AskTeacherDialog
                        context={{
                          source: "Mistake Book",
                          topic: m.topicTag || undefined,
                          mistakes: m.mistakeCount,
                          challengeName: m.challengeTitle
                        }}
                      />
                      <Button
                        variant={isRevised ? "outline" : "default"}
                        size="sm"
                        disabled={toggling === m.id}
                        onClick={() => toggleStatus(m.id, m.status)}
                        className={cn(
                          "rounded-xl h-9 text-xs font-semibold",
                          !isRevised ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm" : ""
                        )}
                      >
                        {toggling === m.id
                          ? "Updating..."
                          : isRevised
                          ? "Mark Needs Revision"
                          : "✓ Mark as Revised"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
