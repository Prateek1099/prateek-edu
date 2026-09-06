import { CheckCircle2, ChevronLeft, FileText } from "lucide-react";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";

import { StudentAssignmentRow } from "@/components/student/StudentAssignmentRow";
import { authOptions } from "@/lib/auth";
import { withStudentReturnTo } from "@/lib/student-assignment-navigation";
import {
  getStudentWorkDisplayState,
  orderStudentWork,
} from "@/lib/student-work-presentation";
import { formatAssignmentDueDate } from "@/lib/workspace-assignment-rules";
import {
  getStudentWorkspaceAssignments,
  type StudentAssignedWork,
} from "@/lib/workspace-assignment-service";

function assignmentPresentation(assignment: StudentAssignedWork) {
  const challenge = assignment.challenge;
  const board = challenge.subject.boardName;
  const qualification = challenge.subject.qualificationName;
  const isDocument = challenge.type === "WORKSHEET" || challenge.type === "PDF_WORKSHEET";
  const href = isDocument
    ? withStudentReturnTo(
        `/resources/${board}/${qualification}/${challenge.subject.slug}/worksheet/${challenge.id}`,
        "/dashboard/worksheets",
        assignment.source === "DURABLE" ? assignment.id : undefined,
      )
    : withStudentReturnTo(
        assignment.attemptSummary
          ? `/resources/${board}/${qualification}/${challenge.subject.slug}/challenge/${challenge.id}/results/${assignment.attemptSummary.latestAttemptId}`
          : `/resources/${board}/${qualification}/${challenge.subject.slug}/challenge/${challenge.id}/attempt`,
        "/dashboard/worksheets",
      );

  return {
    href,
    isDocument,
    typeLabel: isDocument ? "Worksheet" : "Practice set",
    detail: isDocument
      ? challenge.type === "PDF_WORKSHEET" ? "PDF worksheet" : "View and complete"
      : `${challenge.questionCount} questions`,
    actionLabel: isDocument
      ? "Open worksheet"
      : assignment.attemptSummary ? "Review answers" : "Start practice",
    scoreText: assignment.attemptSummary
      ? `Latest ${Math.round(assignment.attemptSummary.latestPercentage)}% · Best ${Math.round(assignment.attemptSummary.bestPercentage)}%`
      : null,
    note: isDocument
      ? assignment.source === "DURABLE"
        ? "This worksheet is not scored. Mark it as done after you finish."
        : "Completion is not tracked for this earlier assignment."
      : null,
  };
}

export default async function StudentAssignedWorkPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const user = session.user as typeof session.user & { id?: string; role?: string };
  if (!user.id) redirect("/login");
  if (user.role !== "STUDENT") redirect(user.role === "TEACHER" ? "/workspace" : "/admin");

  const now = new Date();
  const assignments = orderStudentWork(await getStudentWorkspaceAssignments(user.id), now);
  const toDo = assignments.filter((assignment) => getStudentWorkDisplayState(assignment, now) !== "COMPLETED");
  const completed = assignments.filter((assignment) => getStudentWorkDisplayState(assignment, now) === "COMPLETED");

  function renderAssignment(assignment: StudentAssignedWork) {
    const presentation = assignmentPresentation(assignment);
    return (
      <StudentAssignmentRow
        key={assignment.id}
        title={assignment.challenge.title}
        typeLabel={presentation.typeLabel}
        context={`${assignment.className} · ${assignment.challenge.subject.name}`}
        state={getStudentWorkDisplayState(assignment, now)}
        dueText={assignment.dueDate ? `Due ${formatAssignmentDueDate(assignment.dueDate)}` : `Assigned ${assignment.assignedAt.toLocaleDateString()}`}
        detail={presentation.detail}
        scoreText={presentation.scoreText}
        note={presentation.note}
        actionHref={presentation.href}
        actionLabel={presentation.actionLabel}
      />
    );
  }

  return (
    <main className="container mx-auto min-h-[calc(100vh-140px)] max-w-5xl space-y-7 px-4 py-7 sm:py-9 md:px-8">
      <Link href="/dashboard" className="-ml-2 inline-flex min-h-10 items-center gap-1.5 rounded-xl px-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
        <ChevronLeft className="size-4" /> Student home
      </Link>

      <header className="flex items-start gap-3.5">
        <div className="mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
          <FileText className="size-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Assigned work</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            Start with overdue and due work, then review anything you have completed.
          </p>
        </div>
      </header>

      {assignments.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-border bg-muted/20 px-5 py-12 text-center">
          <CheckCircle2 className="mx-auto size-9 text-emerald-600 dark:text-emerald-400" />
          <h2 className="mt-3 text-lg font-semibold">You&apos;re all caught up.</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            Work assigned by your teachers will appear here.
          </p>
        </section>
      ) : (
        <div className="space-y-8">
          <section aria-labelledby="to-do-heading">
            <div className="mb-3">
              <h2 id="to-do-heading" className="text-lg font-semibold">To do</h2>
              <p className="mt-1 text-sm text-muted-foreground">Overdue and due work appears first. Work without a due date is labelled clearly.</p>
            </div>
            {toDo.length > 0 ? (
              <div className="divide-y divide-border/70 overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
                {toDo.map(renderAssignment)}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-5 py-8 text-center text-sm text-muted-foreground">
                Nothing is waiting for you right now.
              </div>
            )}
          </section>

          {completed.length > 0 ? (
            <section aria-labelledby="completed-heading">
              <div className="mb-3">
                <h2 id="completed-heading" className="text-lg font-semibold">Completed</h2>
                <p className="mt-1 text-sm text-muted-foreground">Review past answers and completed worksheets.</p>
              </div>
              <div className="divide-y divide-border/70 overflow-hidden rounded-2xl border border-border/80 bg-card">
                {completed.map(renderAssignment)}
              </div>
            </section>
          ) : null}
        </div>
      )}
    </main>
  );
}
