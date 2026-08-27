import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  Clock,
  FileText,
  School,
  UserRound,
} from "lucide-react";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import { getStudentWorkspaceClass } from "@/lib/student-workspace-classes";
import { formatAssignmentDueDate } from "@/lib/workspace-assignment-rules";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  const allCompleted = studentClass.assignments.length > 0
    && studentClass.assignments.every((assignment) => assignment.status === "COMPLETED");

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
            <div className="rounded-xl bg-primary/5 px-2 py-2"><p className="font-bold text-primary">{studentClass.assignmentCounts.pending}</p><p className="text-[10px] uppercase text-muted-foreground">Pending</p></div>
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
          <h2 className="text-lg font-bold">Assigned Work</h2>
          <p className="text-sm text-muted-foreground">Only work assigned to you in this class appears here.</p>
        </div>

        {studentClass.assignments.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-5 py-12 text-center">
            <FileText className="mx-auto mb-3 size-9 text-muted-foreground/60" />
            <h3 className="font-bold">No assigned work for this class yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">Your teacher&apos;s published assignments will appear here after they are assigned to you.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {allCompleted ? (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm font-medium text-emerald-700 dark:text-emerald-300">
                You have completed all tracked work assigned in this class.
              </div>
            ) : null}
            {studentClass.assignments.map((assignment) => {
              const challenge = assignment.challenge;
              const isDocument = challenge.type === "WORKSHEET" || challenge.type === "PDF_WORKSHEET";
              const returnTo = `/dashboard/classes/${studentClass.id}`;
              const worksheetLink = withStudentReturnTo(
                `/resources/${challenge.subject.boardName}/${challenge.subject.qualificationName}/${challenge.subject.slug}/worksheet/${challenge.id}`,
                returnTo,
              );
              const practiceLink = withStudentReturnTo(
                `/resources/${challenge.subject.boardName}/${challenge.subject.qualificationName}/${challenge.subject.slug}/challenge/${challenge.id}/attempt`,
                returnTo,
              );
              const stateClass = assignment.status === "COMPLETED"
                ? "text-emerald-600 dark:text-emerald-400"
                : assignment.status === "OVERDUE" ? "text-destructive" : "text-primary";
              return (
                <Card key={assignment.id} className="rounded-2xl border-border/80 bg-card shadow-sm">
                  <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold">{challenge.title}</h3>
                        <span className={cn("text-xs font-semibold", stateClass)}>
                          {assignment.status === "COMPLETED" ? "Completed" : assignment.status === "OVERDUE" ? "Overdue" : "Pending"}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {challenge.type === "QUICK_PRACTICE" ? "Quick Practice" : challenge.type === "PDF_WORKSHEET" ? "PDF Worksheet" : "Worksheet"} · {challenge.subject.name}
                      </p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5"><CalendarDays className="size-3.5" /> Assigned {assignment.assignedAt.toLocaleDateString()}</span>
                        {assignment.dueDate ? <span className="flex items-center gap-1.5"><Clock className="size-3.5" /> Due {formatAssignmentDueDate(assignment.dueDate)}</span> : null}
                        {!isDocument ? <span>{challenge.questionCount} questions · {challenge.difficulty}</span> : null}
                      </div>
                      {isDocument ? <p className="text-xs text-muted-foreground">View-only document · completion is not tracked.</p> : null}
                    </div>
                    <Link href={isDocument ? worksheetLink : practiceLink} className={cn(buttonVariants({ variant: assignment.status === "COMPLETED" ? "outline" : "default" }), "w-full shrink-0 rounded-xl sm:w-auto")}>
                      {isDocument ? <FileText className="size-4" /> : assignment.status === "COMPLETED" ? <CheckCircle2 className="size-4" /> : <Clock className="size-4" />}
                      {isDocument ? "View Worksheet" : assignment.status === "COMPLETED" ? "Review Practice" : "Start Practice"}
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
