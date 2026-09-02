export const dynamic = "force-dynamic";

import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock,
  ExternalLink,
  Target,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireActiveWorkspace } from "@/lib/require-role";
import { getTeacherClassStudentProfile } from "@/lib/teacher-class-student-profile";
import { formatAssignmentDueDate } from "@/lib/workspace-assignment-rules";

function formatDate(value: Date | string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

function formatDateTime(value: Date | string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  }).format(new Date(value));
}

function statusLabel(status: string) {
  if (status === "MARKED_DONE") return "Marked Done";
  return status.charAt(0) + status.slice(1).toLowerCase();
}

function contentTypeLabel(type: string) {
  if (type === "QUICK_PRACTICE") return "Quick Practice";
  if (type === "PDF_WORKSHEET") return "PDF Worksheet";
  return "Worksheet";
}

export default async function TeacherClassStudentProfilePage({
  params,
}: {
  params: Promise<{ id: string; studentId: string }>;
}) {
  const { id: classId, studentId } = await params;
  const user = await requireActiveWorkspace();
  const profile = await getTeacherClassStudentProfile({
    workspaceId: user.workspaceId,
    classId,
    studentId,
  });

  if (!profile) notFound();

  const studentName = profile.student.name || profile.student.email || "Unnamed student";

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-10">
      <nav className="flex flex-wrap gap-2" aria-label="Student profile navigation">
        <Link href={`/workspace/classes/${profile.class.id}`}>
          <Button variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
            <ArrowLeft className="mr-2 size-4" /> Back to Class
          </Button>
        </Link>
        <Link href={`/workspace/classes/${profile.class.id}?tab=assignments#assigned-work`}>
          <Button variant="outline" size="sm">
            <BookOpen className="mr-2 size-4" /> Back to Assigned Work
          </Button>
        </Link>
      </nav>

      <Card className="overflow-hidden">
        <CardContent className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <UserRound className="size-7" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">Student Profile</p>
              <h1 className="mt-1 break-words text-2xl font-bold tracking-tight sm:text-3xl">
                {studentName}
              </h1>
              <p className="mt-1 break-all text-sm text-muted-foreground">
                {profile.student.email || "No email available"}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge variant="secondary">{profile.class.name}</Badge>
                {profile.class.subject ? <Badge variant="outline">{profile.class.subject.name}</Badge> : null}
                {profile.class.qualification ? <Badge variant="outline">{profile.class.qualification.title}</Badge> : null}
                <Badge variant="outline">{profile.class.academicYear}</Badge>
              </div>
            </div>
          </div>
          <div className="grid shrink-0 gap-1 text-sm sm:text-right">
            <p><span className="text-muted-foreground">Membership:</span> {statusLabel(profile.membership.status)}</p>
            <p><span className="text-muted-foreground">Joined:</span> {formatDate(profile.membership.enrolledAt)}</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Assigned</p><p className="mt-1 text-2xl font-bold">{profile.summary.total}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Completed</p><p className="mt-1 text-2xl font-bold text-emerald-600">{profile.summary.completed}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Pending</p><p className="mt-1 text-2xl font-bold">{profile.summary.pending}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Overdue</p><p className="mt-1 text-2xl font-bold text-destructive">{profile.summary.overdue}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Average score</p><p className="mt-1 text-2xl font-bold">{profile.summary.averageScore === null ? "—" : `${profile.summary.averageScore}%`}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Latest attempt</p><p className="mt-1 text-sm font-bold leading-snug">{formatDateTime(profile.summary.latestAttemptAt)}</p></CardContent></Card>
      </div>

      <section className="space-y-3">
        <div>
          <h2 className="text-xl font-bold">Assigned Work</h2>
          <p className="text-sm text-muted-foreground">
            Class-specific completion and attempt history for this student.
          </p>
        </div>

        {profile.assignments.length === 0 ? (
          <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
            This student has no assigned work in this class yet.
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {profile.assignments.map((assignment) => {
              const reviewHref = `/workspace/classes/${profile.class.id}/assignments/${assignment.id}?studentId=${profile.student.id}#answer-review-${profile.student.id}`;
              const assignmentHref = `/workspace/classes/${profile.class.id}/assignments/${assignment.id}`;

              return (
                <Card key={assignment.id} className="min-w-0">
                  <CardHeader className="gap-3 border-b p-4 sm:p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{contentTypeLabel(assignment.challenge.type)}</Badge>
                      <Badge variant={assignment.recipient.status === "OVERDUE" ? "destructive" : assignment.recipient.status === "PENDING" ? "outline" : "default"}>
                        {statusLabel(assignment.recipient.status)}
                      </Badge>
                    </div>
                    <CardTitle className="break-words text-base leading-snug">
                      {assignment.challenge.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 p-4 sm:p-5">
                    <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                      <div><p className="text-xs text-muted-foreground">Due date</p><p className="mt-1 font-semibold">{assignment.dueDate ? formatAssignmentDueDate(assignment.dueDate) : "No due date"}</p></div>
                      <div><p className="text-xs text-muted-foreground">Attempts</p><p className="mt-1 font-semibold">{assignment.challenge.type === "QUICK_PRACTICE" ? assignment.recipient.attemptCount : "—"}</p></div>
                      <div><p className="text-xs text-muted-foreground">Last attempted</p><p className="mt-1 font-semibold">{formatDateTime(assignment.recipient.latestAttemptAt)}</p></div>
                      <div><p className="text-xs text-muted-foreground">Latest score</p><p className="mt-1 font-semibold">{assignment.recipient.latestPercentage === null ? "—" : `${assignment.recipient.latestPercentage}%`}</p></div>
                      <div><p className="text-xs text-muted-foreground">Best score</p><p className="mt-1 font-semibold">{assignment.recipient.bestPercentage === null ? "—" : `${assignment.recipient.bestPercentage}%`}</p></div>
                      <div><p className="text-xs text-muted-foreground">Wrong answers</p><p className="mt-1 font-semibold">{assignment.challenge.type === "QUICK_PRACTICE" ? assignment.recipient.mistakesCount : "—"}</p></div>
                    </div>

                    {assignment.answerReviewState === "OLDER_ATTEMPT" ? (
                      <p className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                        Detailed answer review was not captured for this older attempt.
                      </p>
                    ) : assignment.answerReviewState === "NOT_ATTEMPTED" ? (
                      <p className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                        This student has not attempted this assignment yet.
                      </p>
                    ) : null}

                    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                      {assignment.answerReviewState === "AVAILABLE" ? (
                        <Link href={reviewHref} className="w-full sm:w-auto">
                          <Button size="sm" className="w-full sm:w-auto">
                            <Target className="mr-2 size-4" /> Review Answers
                          </Button>
                        </Link>
                      ) : null}
                      <Link href={assignmentHref} className="w-full sm:w-auto">
                        <Button variant="outline" size="sm" className="w-full sm:w-auto">
                          <ExternalLink className="mr-2 size-4" /> Open Assignment Detail
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-xl font-bold">Mistake Summary</h2>
          <p className="text-sm text-muted-foreground">
            Snapshot-backed wrong answers from this student&apos;s latest class assignment attempts.
          </p>
        </div>

        {profile.mistakes.capturedWrongAnswers === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            {profile.mistakes.trackedWrongSelections > 0
              ? "Detailed mistake topics were not captured for this student’s older attempts."
              : "No mistakes recorded yet."}
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
            <Card>
              <CardHeader><CardTitle className="text-base">Topics to revisit</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {profile.mistakes.topics.map((topic) => (
                  <div key={topic.label} className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm">
                    <span className="break-words font-medium">{topic.label}</span>
                    <Badge variant="outline">{topic.count} wrong</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Recent wrong answers</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {profile.mistakes.recent.map((mistake) => (
                  <div key={mistake.id} className="rounded-xl border border-destructive/20 bg-destructive/[0.03] p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{mistake.topicLabel || "Unassigned topic"}</Badge>
                      {mistake.difficulty ? <Badge variant="secondary">{mistake.difficulty}</Badge> : null}
                    </div>
                    <p className="mt-2 whitespace-pre-wrap break-words text-sm font-medium leading-relaxed">
                      {mistake.questionText}
                    </p>
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-xs text-muted-foreground">{mistake.assignmentTitle}</p>
                      <Link href={`/workspace/classes/${profile.class.id}/assignments/${mistake.assignmentId}?studentId=${profile.student.id}#answer-review-${profile.student.id}`}>
                        <Button variant="ghost" size="sm" className="w-full sm:w-auto">Review Answers</Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}
      </section>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
        <CheckCircle2 className="size-4 text-emerald-600" />
        This profile is read-only and includes only this class, this student, and this teacher workspace.
        <CalendarDays className="ml-auto hidden size-4 sm:block" />
        <Clock className="hidden size-4 sm:block" />
      </div>
    </div>
  );
}
