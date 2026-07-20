"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
  CalendarDays,
  CheckCircle2,
  Settings,
  RefreshCw,
  Loader2,
  FileText,
  Trophy,
  AlertTriangle,
  ClipboardList,
  Calendar,
  Flame,
  ExternalLink,
  SkipForward,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import {
  regeneratePlan,
  updateTaskStatus,
  deleteRevisionPlan,
  updatePlanSettings,
} from "@/app/actions/revision-actions";

// ─── Types ───────────────────────────────────────────────────────────────────

interface TaskItem {
  id: string;
  title: string;
  subject: string;
  topic: string;
  type: string;
  status: string;
  dueDate: string;
  priority: string;
  source: string | null;
  sourceDetail: string | null;
  linkUrl: string | null;
  linkLabel: string | null;
  completedAt: string | null;
}

interface RevisionPlannerDashboardProps {
  plan: {
    id: string;
    board: string;
    qualification: string;
    examDate: string;
    studyDaysPerWeek: number;
    studyDuration: number;
    createdAt: string;
  };
  tasks: TaskItem[];
  todayTasks: TaskItem[];
  upcomingTasks: Record<string, TaskItem[]>;
  totalTasks: number;
  completedTasks: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const TASK_TYPE_ICONS: Record<string, React.ReactNode> = {
  NOTE_REVISION: <FileText className="w-4 h-4" />,
  CHALLENGE: <Trophy className="w-4 h-4" />,
  MISTAKE_REVIEW: <AlertTriangle className="w-4 h-4" />,
  TOPICAL: <ClipboardList className="w-4 h-4" />,
};

const TASK_TYPE_LABELS: Record<string, string> = {
  NOTE_REVISION: "📝 Notes",
  CHALLENGE: "⚡ Challenge",
  MISTAKE_REVIEW: "🔖 Mistake Review",
  TOPICAL: "📋 Topical",
};

const PRIORITY_CONFIG: Record<
  string,
  { emoji: string; className: string }
> = {
  HIGH: { emoji: "🔴", className: "bg-red-500/10 text-red-500" },
  MEDIUM: { emoji: "🟡", className: "bg-amber-500/10 text-amber-500" },
  LOW: { emoji: "🟢", className: "bg-emerald-500/10 text-emerald-500" },
};

const DURATION_OPTIONS = [30, 45, 60, 90];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDateLabel(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  const now = new Date();
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  if (date.toDateString() === tomorrow.toDateString()) return "Tomorrow";

  return date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function computeStudyStreak(tasks: TaskItem[]): number {
  // Count consecutive calendar days (ending today or yesterday) where the user completed at least one task
  const completedDates = new Set<string>();
  for (const t of tasks) {
    if (t.status === "COMPLETED" && t.completedAt) {
      completedDates.add(t.completedAt.split("T")[0]);
    }
  }

  if (completedDates.size === 0) return 0;

  const today = new Date();
  let streak = 0;
  const checkDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  // Check if today has completions, if not start from yesterday
  const todayStr = checkDate.toISOString().split("T")[0];
  if (!completedDates.has(todayStr)) {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  while (true) {
    const ds = checkDate.toISOString().split("T")[0];
    if (completedDates.has(ds)) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

// ─── SVG Donut Chart ─────────────────────────────────────────────────────────

function DonutChart({
  percentage,
  size = 80,
  colorClass = "text-primary",
  label,
}: {
  percentage: number;
  size?: number;
  colorClass?: string;
  label?: string;
}) {
  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} viewBox="0 0 36 36">
        <path
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          className="text-muted/20"
        />
        <path
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeDasharray={`${percentage}, 100`}
          className={colorClass}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-sm font-bold">{Math.round(percentage)}%</span>
        {label && (
          <span className="text-[10px] text-muted-foreground">{label}</span>
        )}
      </div>
    </div>
  );
}

// ─── Task Card Component ─────────────────────────────────────────────────────

function TaskCard({
  task,
  showCheckbox = false,
  onComplete,
  onSkip,
  isUpdating,
}: {
  task: TaskItem;
  showCheckbox?: boolean;
  onComplete?: (taskId: string) => void;
  onSkip?: (taskId: string) => void;
  isUpdating?: boolean;
}) {
  const priorityConfig = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.MEDIUM;
  const isCompleted = task.status === "COMPLETED";
  const isSkipped = task.status === "SKIPPED";

  return (
    <div
      className={cn(
        "group relative p-4 rounded-xl border transition-all duration-300",
        isCompleted
          ? "bg-emerald-500/5 border-emerald-500/20"
          : isSkipped
            ? "bg-muted/30 border-border opacity-60"
            : "bg-card border-border hover:border-primary/30 hover:shadow-sm"
      )}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        {showCheckbox && !isCompleted && !isSkipped && (
          <div className="pt-0.5">
            <Checkbox
              checked={false}
              disabled={isUpdating}
              onCheckedChange={() => onComplete?.(task.id)}
              className="mt-0.5"
            />
          </div>
        )}

        {/* Completed check icon */}
        {isCompleted && (
          <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4
              className={cn(
                "font-semibold text-sm leading-tight",
                isCompleted && "line-through text-muted-foreground"
              )}
            >
              {task.title}
            </h4>
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Priority Badge */}
              <span
                className={cn(
                  "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
                  priorityConfig.className
                )}
              >
                {priorityConfig.emoji} {task.priority}
              </span>
            </div>
          </div>

          {/* Subject + Topic pills */}
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-medium">
              {TASK_TYPE_ICONS[task.type]}
              {TASK_TYPE_LABELS[task.type] || task.type}
            </span>
            <span className="px-2 py-0.5 rounded-md bg-muted text-muted-foreground text-xs">
              {task.subject}
            </span>
            <span className="px-2 py-0.5 rounded-md bg-muted text-muted-foreground text-xs">
              {task.topic}
            </span>
          </div>

          {/* Source Badge */}
          {task.source && (
            <p className="text-xs text-muted-foreground mt-2">
              Source: {task.source}
              {task.sourceDetail ? ` — ${task.sourceDetail}` : ""}
            </p>
          )}

          {/* Completed timestamp */}
          {isCompleted && task.completedAt && (
            <p className="text-xs text-emerald-500 mt-1.5 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Completed {new Date(task.completedAt).toLocaleString("en-GB", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          )}

          {/* Action Buttons */}
          {!isCompleted && !isSkipped && (
            <div className="flex items-center gap-2 mt-3">
              {task.linkUrl && (
                <Link
                  href={task.linkUrl}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                  {task.linkLabel || "Open"}
                </Link>
              )}
              {showCheckbox && onSkip && (
                <button
                  onClick={() => onSkip(task.id)}
                  disabled={isUpdating}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
                >
                  <SkipForward className="w-3 h-3" />
                  Skip
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── AI Study Advice Card ────────────────────────────────────────────────────

function AiStudyAdviceCard({ plan, tasks }: { plan: RevisionPlannerDashboardProps["plan"]; tasks: TaskItem[] }) {
  const [advice, setAdvice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateAdvice = async () => {
    setLoading(true);
    setError(null);
    try {
      const completed = tasks.filter((t) => t.status === "COMPLETED").length;
      const pending = tasks.filter((t) => t.status === "PENDING").length;
      const skipped = tasks.filter((t) => t.status === "SKIPPED").length;

      const subjects = [...new Set(tasks.map((t) => t.subject))];
      const topPriority = tasks
        .filter((t) => t.priority === "HIGH" && t.status === "PENDING")
        .slice(0, 5)
        .map((t) => `${t.title} (${t.subject})`)
        .join(", ");

      const context = `
Exam: ${plan.qualification} (${plan.board})
Exam Date: ${new Date(plan.examDate).toLocaleDateString()}
Days until exam: ${Math.ceil((new Date(plan.examDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))}
Study schedule: ${plan.studyDaysPerWeek} days/week, ${plan.studyDuration} min/session
Tasks: ${completed} completed, ${pending} pending, ${skipped} skipped out of ${tasks.length} total
Subjects: ${subjects.join(", ")}
High priority pending: ${topPriority || "None"}
      `.trim();

      const res = await fetch("/api/revision/ai-advice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context }),
      });

      const data = await res.json();
      if (!res.ok) {
        let errorMessage = "Failed to generate advice";
        if (typeof data.error === "string") {
          try {
            const parsed = JSON.parse(data.error);
            errorMessage = parsed.error?.message || data.error;
          } catch {
            errorMessage = data.error;
          }
        } else if (data.error?.message) {
          errorMessage = data.error.message;
        }
        throw new Error(errorMessage);
      }
      setAdvice(data.advice);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-gradient-to-br from-primary/5 via-card to-card shadow-sm border-primary/20 relative overflow-hidden">
      <div className="absolute top-0 right-0 p-4 opacity-10">
        <Sparkles className="w-24 h-24 text-primary" />
      </div>
      <CardHeader className="pb-2 relative z-10">
        <CardTitle className="text-lg flex items-center gap-2 text-primary">
          <Sparkles className="w-5 h-5" /> AI Study Advice
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Get personalised recommendations based on your revision progress.
        </p>
      </CardHeader>
      <CardContent className="relative z-10">
        {!advice && !loading && (
          <Button
            onClick={generateAdvice}
            className="mt-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 shadow-none"
          >
            Get Study Advice
          </Button>
        )}

        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-4">
            <Loader2 className="w-4 h-4 animate-spin" /> Analysing your plan...
          </div>
        )}

        {error && <div className="text-sm text-destructive mt-4">{error}</div>}

        {advice && (
          <div className="mt-4 prose prose-sm dark:prose-invert max-w-none text-foreground/90">
            <ReactMarkdown>{advice}</ReactMarkdown>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Settings Dialog ─────────────────────────────────────────────────────────

function SettingsDialog({
  plan,
  open,
  onOpenChange,
}: {
  plan: RevisionPlannerDashboardProps["plan"];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [examDate, setExamDate] = useState(
    plan.examDate.split("T")[0]
  );
  const [studyDays, setStudyDays] = useState(plan.studyDaysPerWeek);
  const [duration, setDuration] = useState(plan.studyDuration);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const tomorrow = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const result = await updatePlanSettings(plan.id, {
        examDate: new Date(examDate).toISOString(),
        studyDaysPerWeek: studyDays,
        studyDuration: duration,
      });

      if (result.success) {
        toast.success("Settings updated! Tasks have been regenerated.");
        onOpenChange(false);
        router.refresh();
      } else {
        toast.error(result.error || "Failed to update settings");
      }
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await deleteRevisionPlan(plan.id);
      if (result.success) {
        toast.success("Plan deleted. You can create a new one anytime.");
        onOpenChange(false);
        router.refresh();
      } else {
        toast.error(result.error || "Failed to delete plan");
      }
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Plan Settings</DialogTitle>
          <DialogDescription>
            Update your revision plan preferences. Changes will regenerate your
            remaining tasks.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Exam Date */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Exam Date</label>
            <input
              type="date"
              value={examDate}
              min={tomorrow}
              onChange={(e) => setExamDate(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-border bg-muted/30 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
            />
          </div>

          {/* Study Days */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Study Days per Week
            </label>
            <div className="grid grid-cols-7 gap-1.5">
              {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                <button
                  key={d}
                  onClick={() => setStudyDays(d)}
                  className={cn(
                    "h-9 rounded-lg border text-sm font-semibold transition-all",
                    studyDays === d
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-muted/20 hover:border-primary/40"
                  )}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Session Duration
            </label>
            <div className="grid grid-cols-4 gap-2">
              {DURATION_OPTIONS.map((d) => (
                <button
                  key={d}
                  onClick={() => setDuration(d)}
                  className={cn(
                    "h-10 rounded-lg border text-sm font-semibold transition-all",
                    duration === d
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-muted/20 hover:border-primary/40"
                  )}
                >
                  {d}m
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          {!showDeleteConfirm ? (
            <>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" />
                Delete Plan
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving}
                size="sm"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : null}
                Save & Regenerate
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm text-destructive flex-1">
                This will permanently delete your plan and all tasks. Are you
                sure?
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : null}
                Confirm Delete
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Dashboard Component ────────────────────────────────────────────────

export function RevisionPlannerDashboard({
  plan,
  tasks,
  todayTasks,
  upcomingTasks,
  totalTasks,
  completedTasks: initialCompletedTasks,
}: RevisionPlannerDashboardProps) {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [updatingTasks, setUpdatingTasks] = useState<Set<string>>(new Set());
  const [optimisticStatuses, setOptimisticStatuses] = useState<
    Record<string, string>
  >({});
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showAllUpcoming, setShowAllUpcoming] = useState(false);

  // ── Derived state ──
  const completedTasks = useMemo(() => {
    const extraCompleted = Object.values(optimisticStatuses).filter(
      (s) => s === "COMPLETED"
    ).length;
    return initialCompletedTasks + extraCompleted;
  }, [initialCompletedTasks, optimisticStatuses]);

  const completionPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  const daysUntilExam = useMemo(() => {
    return Math.ceil(
      (new Date(plan.examDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
  }, [plan.examDate]);

  const studyStreak = useMemo(() => computeStudyStreak(tasks), [tasks]);

  const urgencyColor = useMemo(() => {
    if (daysUntilExam > 30) return "text-emerald-500";
    if (daysUntilExam > 15) return "text-amber-500";
    return "text-red-500";
  }, [daysUntilExam]);

  // Task type breakdown for today
  const todayTypeBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of todayTasks) {
      counts[t.type] = (counts[t.type] || 0) + 1;
    }
    return counts;
  }, [todayTasks]);

  // Effective today tasks (applying optimistic updates)
  const effectiveTodayTasks = useMemo(() => {
    return todayTasks.map((t) => ({
      ...t,
      status: optimisticStatuses[t.id] || t.status,
    }));
  }, [todayTasks, optimisticStatuses]);

  // Upcoming date keys (limit to 7 unless expanded)
  const upcomingDateKeys = useMemo(() => {
    const keys = Object.keys(upcomingTasks).sort();
    return showAllUpcoming ? keys : keys.slice(0, 7);
  }, [upcomingTasks, showAllUpcoming]);

  const hasMoreUpcoming = Object.keys(upcomingTasks).length > 7;

  // ── Handlers ──

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const result = await regeneratePlan(plan.id);
      if (result.success) {
        toast.success("Plan refreshed with updated tasks!");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to refresh plan");
      }
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleTaskUpdate = useCallback(
    async (taskId: string, status: "COMPLETED" | "SKIPPED") => {
      setUpdatingTasks((prev) => new Set(prev).add(taskId));
      setOptimisticStatuses((prev) => ({ ...prev, [taskId]: status }));

      try {
        const result = await updateTaskStatus(taskId, status);
        if (result.success) {
          toast.success(
            status === "COMPLETED" ? "Task completed! 🎉" : "Task skipped."
          );
          router.refresh();
        } else {
          // Revert optimistic update
          setOptimisticStatuses((prev) => {
            const next = { ...prev };
            delete next[taskId];
            return next;
          });
          toast.error(result.error || "Failed to update task");
        }
      } catch {
        setOptimisticStatuses((prev) => {
          const next = { ...prev };
          delete next[taskId];
          return next;
        });
        toast.error("Something went wrong.");
      } finally {
        setUpdatingTasks((prev) => {
          const next = new Set(prev);
          next.delete(taskId);
          return next;
        });
      }
    },
    [router]
  );

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            <CalendarDays className="w-7 h-7 text-primary" />
            Revision Planner
          </h1>
          <p className="text-muted-foreground mt-1">
            {plan.qualification.toUpperCase()} · {plan.board}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSettingsOpen(true)}
            className="h-9 w-9"
          >
            <Settings className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="gap-1.5"
          >
            {isRefreshing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            Refresh Plan
          </Button>
        </div>
      </div>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Exam Countdown */}
        <Card className="bg-card shadow-sm border-border hover:border-primary/20 transition-colors">
          <CardContent className="p-5 flex flex-col items-center text-center">
            <DonutChart
              percentage={Math.max(0, Math.min(100, 100 - (daysUntilExam / 90) * 100))}
              colorClass={urgencyColor}
              size={80}
            />
            <div className="mt-3">
              <p className={cn("text-2xl font-bold", urgencyColor)}>
                {daysUntilExam > 0 ? daysUntilExam : 0}
              </p>
              <p className="text-xs text-muted-foreground">days until exam</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {new Date(plan.examDate).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Completion */}
        <Card className="bg-card shadow-sm border-border hover:border-primary/20 transition-colors">
          <CardContent className="p-5 flex flex-col items-center text-center">
            <DonutChart
              percentage={completionPercentage}
              colorClass="text-primary"
              size={80}
            />
            <div className="mt-3">
              <p className="text-sm font-semibold">
                {completedTasks}/{totalTasks}
              </p>
              <p className="text-xs text-muted-foreground">tasks completed</p>
            </div>
          </CardContent>
        </Card>

        {/* Today's Load */}
        <Card className="bg-card shadow-sm border-border hover:border-primary/20 transition-colors">
          <CardContent className="p-5 flex flex-col items-center text-center">
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-2">
              <ClipboardList className="w-7 h-7 text-primary" />
            </div>
            <p className="text-2xl font-bold">{todayTasks.length}</p>
            <p className="text-xs text-muted-foreground mb-2">
              tasks today
            </p>
            <div className="flex flex-wrap justify-center gap-1">
              {Object.entries(todayTypeBreakdown).map(([type, count]) => (
                <span
                  key={type}
                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] bg-muted text-muted-foreground"
                >
                  {TASK_TYPE_ICONS[type]} {count}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Study Streak */}
        <Card className="bg-card shadow-sm border-border hover:border-primary/20 transition-colors">
          <CardContent className="p-5 flex flex-col items-center text-center">
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-orange-500/10 mb-2">
              <Flame className="w-7 h-7 text-orange-500" />
            </div>
            <p className="text-2xl font-bold">{studyStreak}</p>
            <p className="text-xs text-muted-foreground">
              {studyStreak === 1 ? "day streak" : "days streak"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Main Content ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column — Tasks */}
        <div className="lg:col-span-2 space-y-8">
          {/* Today's Tasks */}
          <section>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-primary" />
              Today&apos;s Plan
              {effectiveTodayTasks.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {effectiveTodayTasks.filter((t) => t.status === "COMPLETED").length}/
                  {effectiveTodayTasks.length}
                </Badge>
              )}
            </h2>

            {effectiveTodayTasks.length === 0 ? (
              <Card className="bg-muted/20 border-dashed shadow-sm">
                <CardContent className="p-8 text-center">
                  <CalendarDays className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
                  <p className="text-muted-foreground font-medium">
                    No tasks scheduled for today
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Check your upcoming tasks below or refresh your plan.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {effectiveTodayTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    showCheckbox
                    onComplete={(id) => handleTaskUpdate(id, "COMPLETED")}
                    onSkip={(id) => handleTaskUpdate(id, "SKIPPED")}
                    isUpdating={updatingTasks.has(task.id)}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Upcoming Tasks */}
          <section>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Upcoming
            </h2>

            {upcomingDateKeys.length === 0 ? (
              <Card className="bg-muted/20 border-dashed shadow-sm">
                <CardContent className="p-8 text-center">
                  <Calendar className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
                  <p className="text-muted-foreground font-medium">
                    No upcoming tasks in the next 7 days
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                <Accordion>
                  {upcomingDateKeys.map((dateKey) => (
                    <AccordionItem key={dateKey} value={dateKey}>
                      <AccordionTrigger className="py-3 px-1">
                        <div className="flex items-center gap-3">
                          <span className="font-semibold">
                            {formatDateLabel(dateKey)}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {upcomingTasks[dateKey].length}{" "}
                            {upcomingTasks[dateKey].length === 1
                              ? "task"
                              : "tasks"}
                          </Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-2 pb-2">
                          {upcomingTasks[dateKey].map((task) => (
                            <TaskCard key={task.id} task={task} />
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>

                {hasMoreUpcoming && !showAllUpcoming && (
                  <Button
                    variant="ghost"
                    className="w-full mt-2 text-primary"
                    onClick={() => setShowAllUpcoming(true)}
                  >
                    View All Upcoming Days
                  </Button>
                )}
              </>
            )}
          </section>
        </div>

        {/* Right Column — AI + Info */}
        <div className="space-y-6">
          {/* AI Study Advice */}
          <AiStudyAdviceCard plan={plan} tasks={tasks} />

          {/* Plan Summary Card */}
          <Card className="bg-card shadow-sm border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Plan Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Board</span>
                <span className="font-medium">{plan.board}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Qualification</span>
                <span className="font-medium">{plan.qualification.toUpperCase()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Study Days</span>
                <span className="font-medium">
                  {plan.studyDaysPerWeek} days/week
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Session Length</span>
                <span className="font-medium">{plan.studyDuration} min</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Created</span>
                <span className="font-medium">
                  {new Date(plan.createdAt).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="bg-card shadow-sm border-border">
            <CardContent className="p-4 space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                size="sm"
                onClick={() => setSettingsOpen(true)}
              >
                <Settings className="w-4 h-4" />
                Edit Plan Settings
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                {isRefreshing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                Regenerate Tasks
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Settings Dialog */}
      <SettingsDialog
        plan={plan}
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
      />
    </div>
  );
}
