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
      <div className="text-center py-16 bg-muted/20 rounded-xl border border-dashed">
        <BookOpen className="h-10 w-10 text-muted-foreground mx-auto mb-4 opacity-50" />
        <h3 className="text-lg font-semibold">No mistakes yet</h3>
        <p className="text-muted-foreground">Complete a Topic Challenge and your mistakes will appear here automatically.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter Tabs */}
      <div className="flex gap-2">
        {([
          ["all", "All", mistakes.length],
          ["needs_revision", "Needs Revision", mistakes.filter((m) => m.status === "needs_revision").length],
          ["revised", "Revised", mistakes.filter((m) => m.status === "revised").length],
        ] as const).map(([key, label, count]) => (
          <Button
            key={key}
            variant={filter === key ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(key as any)}
          >
            {label} ({count})
          </Button>
        ))}
      </div>

      {/* Retry Related Challenges */}
      {Object.keys(challengeRetryMap).length > 0 && filter !== "revised" && (
        <Card className="bg-primary/5 border-primary/20 shadow-sm">
          <CardContent className="p-4">
            <p className="text-sm font-semibold text-primary mb-2 flex items-center gap-2">
              <RotateCcw className="h-4 w-4" /> Retry Related Challenges
            </p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(challengeRetryMap).map(([id, ch]) => (
                <Link key={id} href={ch.url}>
                  <Badge variant="outline" className="cursor-pointer hover:bg-primary/10 transition-colors py-1.5 px-3">
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
                "shadow-sm transition-colors",
                isRevised ? "border-emerald-500/30 opacity-75" : "border-amber-500/30"
              )}
            >
              {/* Collapsed Header */}
              <button
                onClick={() => toggleExpand(m.id)}
                className="w-full text-left p-4 flex items-center gap-3"
              >
                <div className={cn(
                  "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
                  isRevised ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
                )}>
                  {isRevised ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{m.questionText}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {m.topicTag && (
                      <Badge variant="secondary" className="text-xs">{m.topicTag}</Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {m.challengeTitle} · {m.mistakeCount}× wrong
                    </span>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    "shrink-0 text-xs",
                    m.mistakeCount >= 3
                      ? "border-red-500/50 text-red-500 bg-red-500/5"
                      : "border-amber-500/50 text-amber-500 bg-amber-500/5"
                  )}
                >
                  ×{m.mistakeCount}
                </Badge>
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
              </button>

              {/* Expanded Content */}
              {isExpanded && (
                <CardContent className="px-4 pb-4 pt-0 border-t border-border">
                  <p className="text-sm font-semibold mt-3 mb-4">{m.questionText}</p>
                  <div className="space-y-2">
                    {OPTIONS.map((opt) => {
                      const isStudent = m.studentAnswer.toUpperCase() === opt;
                      const isCorrect = m.correctAnswer.toUpperCase() === opt;
                      return (
                        <div
                          key={opt}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-lg border text-sm",
                            isCorrect && "border-emerald-500/50 bg-emerald-500/5",
                            isStudent && !isCorrect && "border-red-500/50 bg-red-500/5",
                            !isCorrect && !isStudent && "border-border"
                          )}
                        >
                          <div className={cn(
                            "h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                            isCorrect ? "bg-emerald-500 text-white" :
                            isStudent ? "bg-red-500 text-white" :
                            "bg-muted text-muted-foreground"
                          )}>
                            {opt}
                          </div>
                          <span className="flex-1">{getOptionText(m, opt)}</span>
                          {isCorrect && <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />}
                          {isStudent && !isCorrect && <XCircle className="h-4 w-4 text-red-500 shrink-0" />}
                        </div>
                      );
                    })}
                  </div>

                  {m.explanation && (
                    <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm">
                      <p className="font-semibold text-primary text-xs uppercase tracking-wider mb-1 flex items-center gap-1">
                        <Lightbulb className="h-3 w-3" /> Explanation
                      </p>
                      <p className="text-foreground/90">{m.explanation}</p>
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                    <div className="text-xs text-muted-foreground">
                      Last seen: {new Date(m.updatedAt).toLocaleDateString()}
                    </div>
                    <div className="flex gap-2">
                      <Link href={m.retryUrl}>
                        <Button variant="outline" size="sm">
                          <RotateCcw className="h-3 w-3 mr-1.5" /> Retry Challenge
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
                        className={!isRevised ? "bg-emerald-600 hover:bg-emerald-700" : ""}
                      >
                        {toggling === m.id
                          ? "..."
                          : isRevised
                          ? "Mark Needs Revision"
                          : "✓ Mark Revised"}
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
