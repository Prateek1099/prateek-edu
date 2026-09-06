import {
  BookOpen,
  CalendarDays,
  ChevronLeft,
  FileText,
  School,
  UserRound,
} from "lucide-react";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import { StudentAssignmentRow } from "@/components/student/StudentAssignmentRow";
import { getStudentWorkspaceClass } from "@/lib/student-workspace-classes";
import {
  getStudentWorkDisplayState,
  orderStudentWork,
} from "@/lib/student-work-presentation";
import { formatAssignmentDueDate } from "@/lib/workspace-assignment-rules";
import { withStudentReturnTo } from "@/lib/student-assignment-navigation";

export default async function StudentClassDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const user = session.user as typeof session.user & { id?: string; role?: string };
  if (!user.id) redirect("/login");
  if (user.role !== "STUDENT") redirect(user.role === "TEACHER" ? "/workspace" : "/admin");

  const { id } = await params;
  const studentClass = await getStudentWorkspaceClass(user.id, id);
  if (!studentClass) notFound();

  const teacherName = studentClass.workspace.owner.name
    || studentClass.workspace.owner.email
    || "Teacher";
  const classAssignments = studentClass.assignments;
  const orderedAssignments = orderStudentWork(classAssignments);
  const toDo = orderedAssignments.filter((assignment) => assignment.status !== "COMPLETED");
  const completed = orderedAssignments.filter((assignment) => assignment.status === "COMPLETED");

  function renderAssignment(assignment: (typeof classAssignments)[number]) {
    const challenge = assignment.challenge;
    const isDocument = challenge.type === "WORKSHEET" || challenge.type === "PDF_WORKSHEET";
    const returnTo = `/dashboard/classes/${id}`;
    const href = isDocument
      ? withStudentReturnTo(
          `/resources/${challenge.subject.boardName}/${challenge.subject.qualificationName}/${challenge.subject.slug}/worksheet/${challenge.id}`,
          returnTo,
          assignment.id,
        )
      : withStudentReturnTo(
          assignment.attemptSummary
            ? `/resources/${challenge.subject.boardName}/${challenge.subject.qualificationName}/${challenge.subject.slug}/challenge/${challenge.id}/results/${assignment.attemptSummary.latestAttemptId}`
            : `/resources/${challenge.subject.boardName}/${challenge.subject.qualificationName}/${challenge.subject.slug}/challenge/${challenge.id}/attempt`,
          returnTo,
        );
    const state = getStudentWorkDisplayState(assignment);

    return (
      <StudentAssignmentRow
        key={assignment.id}
        title={challenge.title}
        typeLabel={isDocument ? "Worksheet" : "Practice set"}
        context={challenge.subject.name}
        state={state}
        dueText={assignment.dueDate ? `Due ${formatAssignmentDueDate(assignment.dueDate)}` : `Assigned ${assignment.assignedAt.toLocaleDateString()}`}
        detail={isDocument ? (challenge.type === "PDF_WORKSHEET" ? "PDF worksheet" : "View and complete") : `${challenge.questionCount} questions`}
        scoreText={assignment.attemptSummary ? `Latest ${Math.round(assignment.attemptSummary.latestPercentage)}% · Best ${Math.round(assignment.attemptSummary.bestPercentage)}%` : null}
        note={isDocument ? "This worksheet is not scored. Mark it as done after you finish." : null}
        actionHref={href}
        actionLabel={isDocument ? "Open worksheet" : assignment.attemptSummary ? "Review answers" : "Start practice"}
      />
    );
  }

  return (
    <main className="container mx-auto min-h-[calc(100vh-140px)] max-w-5xl space-y-7 px-4 py-7 sm:py-9 md:px-8">
      <Link href="/dashboard/classes" className="-ml-2 inline-flex h-9 items-center gap-1.5 rounded-xl px-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
        <ChevronLeft className="size-4" /> My Classes
      </Link>

      <header className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3.5">
            <div className="mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary"><School className="size-5" /></div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">{studentClass.subject?.name || "Class workspace"}</p>
              <h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">{studentClass.name}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{studentClass.workspace.name}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center sm:min-w-64">
            <div className="rounded-xl bg-primary/5 px-2 py-2"><p className="font-bold text-primary">{studentClass.assignmentCounts.pending}</p><p className="text-[10px] uppercase text-muted-foreground">To do</p></div>
            <div className="rounded-xl bg-emerald-500/5 px-2 py-2"><p className="font-bold text-emerald-600 dark:text-emerald-400">{studentClass.assignmentCounts.completed}</p><p className="text-[10px] uppercase text-muted-foreground">Done</p></div>
            <div className="rounded-xl bg-destructive/5 px-2 py-2"><p className="font-bold text-destructive">{studentClass.assignmentCounts.overdue}</p><p className="text-[10px] uppercase text-muted-foreground">Overdue</p></div>
          </div>
        </div>
        <div className="mt-5 grid gap-2 border-t border-border/70 pt-4 text-xs text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
          <p className="flex items-center gap-2"><UserRound className="size-3.5" /> {teacherName}</p>
          <p className="flex items-center gap-2"><BookOpen className="size-3.5" /> {studentClass.qualification?.title || "Qualification not set"}</p>
          <p className="flex items-center gap-2"><CalendarDays className="size-3.5" /> {studentClass.academicYear}</p>
          <p className="flex items-center gap-2"><CalendarDays className="size-3.5" /> Joined {studentClass.enrolledAt.toLocaleDateString()}</p>
        </div>
      </header>

      <section>
        <div className="mb-3">
          <h2 className="text-lg font-semibold">Assigned work</h2>
          <p className="text-sm text-muted-foreground">Only work assigned to you in this class appears here.</p>
        </div>

        {studentClass.assignments.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-5 py-12 text-center">
            <FileText className="mx-auto mb-3 size-9 text-muted-foreground/60" />
            <h3 className="font-semibold">No assigned work for this class yet.</h3>
            <p className="mt-1 text-sm text-muted-foreground">Your teacher&apos;s published assignments will appear here after they are assigned to you.</p>
          </div>
        ) : (
          <div className="space-y-7">
            {toDo.length > 0 ? (
              <div>
                <h3 className="mb-2 text-sm font-semibold">To do</h3>
                <div className="divide-y divide-border/70 overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
                  {toDo.map(renderAssignment)}
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm font-medium text-emerald-700 dark:text-emerald-300">
                You&apos;re caught up with this class.
              </div>
            )}
            {completed.length > 0 ? (
              <div>
                <h3 className="mb-2 text-sm font-semibold">Completed</h3>
                <div className="divide-y divide-border/70 overflow-hidden rounded-2xl border border-border/80 bg-card">
                  {completed.map(renderAssignment)}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </section>
    </main>
  );
}
