import Link from "next/link";
import { ArrowLeft, CheckCircle2, CircleX, MinusCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { formatAdminDateTime } from "@/lib/admin-date-format";
import { assessmentService } from "@/lib/assessments/service";
import { objectiveTypeLabel } from "@/lib/assessments/rules";
import { cn } from "@/lib/utils";
import { ReleaseResultButton } from "./ReleaseResultButton";

const reviewStatus = {
  CORRECT: {
    label: "Correct",
    icon: CheckCircle2,
    className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  INCORRECT: {
    label: "Incorrect",
    icon: CircleX,
    className: "border-destructive/30 bg-destructive/10 text-destructive",
  },
  UNANSWERED: {
    label: "Unanswered",
    icon: MinusCircle,
    className: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
} as const;

function AnswerPanel({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="min-w-0 rounded-xl border bg-muted/20 p-3 sm:p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn("mt-2 break-words text-sm leading-6", !value && "italic text-muted-foreground")}>
        {value || "No answer submitted"}
      </p>
    </div>
  );
}

export default async function TeacherAttemptReviewPage({
  params,
}: {
  params: Promise<{ assignmentId: string; attemptId: string }>;
}) {
  const { assignmentId, attemptId } = await params;
  const review = await assessmentService.teacherAttemptReview(assignmentId, attemptId);

  return (
    <div className="mx-auto max-w-5xl space-y-7 pb-10">
      <Link
        href={`/workspace/assessments/${review.assignmentId}`}
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-ml-2")}
      >
        <ArrowLeft className="size-4" />
        Student results
      </Link>

      <header className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-primary">Detailed answer review</p>
            <h1 className="mt-1 break-words text-2xl font-bold tracking-tight sm:text-3xl">{review.title}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {review.className} · {review.subjectName} · Attempt {review.attemptNumber}
            </p>
          </div>
          <ReleaseResultButton
            assignmentId={review.assignmentId}
            attemptId={review.attemptId}
            initiallyReleased={review.status === "RELEASED"}
          />
        </div>

        <div className="rounded-2xl border bg-card p-4 sm:p-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="min-w-0 sm:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Student</p>
              <p className="mt-1 break-words font-semibold">{review.studentName || review.studentEmail || "Unnamed student"}</p>
              <p className="break-all text-xs text-muted-foreground">{review.studentEmail || "No email"}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Submitted</p>
              <p className="mt-1 text-sm font-medium">{formatAdminDateTime(review.submittedAt)}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Overall score</p>
              <p className="mt-1 text-lg font-bold">{review.awardedMarks}/{review.totalMarks}</p>
              <p className="text-xs text-muted-foreground">{review.percentage}%</p>
            </div>
          </div>
        </div>
      </header>

      <section aria-labelledby="answer-review-heading" className="space-y-4">
        <div>
          <h2 id="answer-review-heading" className="text-lg font-semibold">Answers in paper order</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Review the student response, immutable answer key, awarded marks, and explanation for every question.
          </p>
        </div>

        {review.questions.map((question) => {
          const status = reviewStatus[question.status];
          const StatusIcon = status.icon;
          return (
            <article key={question.id} className="min-w-0 rounded-2xl border bg-card p-4 sm:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {question.sectionLabel} · Question {question.number} · {objectiveTypeLabel(question.type)}
                  </p>
                  <h3 className="mt-2 break-words text-base font-semibold leading-7">{question.text}</h3>
                </div>
                <Badge variant="outline" className="shrink-0">{question.marks} {question.marks === 1 ? "mark" : "marks"}</Badge>
              </div>

              {question.options.length > 0 ? (
                <ol className="mt-4 grid gap-2 sm:grid-cols-2" aria-label={`Options for question ${question.number}`}>
                  {question.options.map((option) => (
                    <li key={option.key} className="min-w-0 break-words rounded-lg border bg-muted/15 px-3 py-2 text-sm leading-6">
                      <span className="font-semibold">{option.key}.</span> {option.text}
                    </li>
                  ))}
                </ol>
              ) : null}

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <AnswerPanel label="Student answer" value={question.studentAnswer} />
                <AnswerPanel label="Correct answer" value={question.correctAnswer} />
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <Badge variant="outline" className={status.className}>
                  <StatusIcon className="size-3" />
                  {status.label}
                </Badge>
                <p className="text-sm font-semibold">Marks awarded: {question.marksAwarded}/{question.marks}</p>
              </div>

              {question.explanation ? (
                <div className="mt-4 rounded-xl border border-primary/15 bg-primary/5 p-3 sm:p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary">Explanation</p>
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6">{question.explanation}</p>
                </div>
              ) : null}
            </article>
          );
        })}
      </section>
    </div>
  );
}
