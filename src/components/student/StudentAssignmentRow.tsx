import { CalendarDays, CheckCircle2, Clock3, FileText } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import type { StudentWorkDisplayState } from "@/lib/student-work-presentation";
import { getStudentWorkStatusLabel } from "@/lib/student-work-presentation";
import { cn } from "@/lib/utils";

type StudentAssignmentRowProps = {
  title: string;
  typeLabel: string;
  context: string;
  state: StudentWorkDisplayState;
  dueText?: string | null;
  detail?: string | null;
  scoreText?: string | null;
  note?: string | null;
  actionHref?: string | null;
  actionLabel?: string | null;
};

const statusTone: Record<StudentWorkDisplayState, string> = {
  COMPLETED: "text-emerald-700 dark:text-emerald-300",
  OVERDUE: "text-destructive",
  DUE_TODAY: "text-amber-700 dark:text-amber-300",
  UPCOMING: "text-primary",
  NO_DUE_DATE: "text-muted-foreground",
};

export function StudentAssignmentRow({
  title,
  typeLabel,
  context,
  state,
  dueText,
  detail,
  scoreText,
  note,
  actionHref,
  actionLabel,
}: StudentAssignmentRowProps) {
  const completed = state === "COMPLETED";

  return (
    <article className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h3 className="text-sm font-semibold leading-6 text-foreground sm:text-base">{title}</h3>
          <span className={cn("text-xs font-semibold", statusTone[state])}>
            {completed ? <CheckCircle2 className="mr-1 inline size-3.5" /> : null}
            {getStudentWorkStatusLabel(state)}
          </span>
        </div>
        <p className="mt-0.5 text-xs leading-5 text-muted-foreground sm:text-sm">
          {typeLabel} · {context}
        </p>
        <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {dueText ? (
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="size-3.5" /> {dueText}
            </span>
          ) : null}
          {detail ? (
            <span className="inline-flex items-center gap-1.5">
              {typeLabel === "Practice set" ? <Clock3 className="size-3.5" /> : <FileText className="size-3.5" />}
              {detail}
            </span>
          ) : null}
          {scoreText ? <span className="font-medium text-foreground/80">{scoreText}</span> : null}
        </div>
        {note ? <p className="mt-1.5 text-xs leading-5 text-muted-foreground">{note}</p> : null}
      </div>
      {actionHref && actionLabel ? (
        <Link
          href={actionHref}
          className={cn(
            buttonVariants({ variant: completed ? "outline" : "default", size: "sm" }),
            "min-h-10 w-full shrink-0 rounded-xl px-4 sm:w-auto",
          )}
        >
          {actionLabel}
        </Link>
      ) : null}
    </article>
  );
}
