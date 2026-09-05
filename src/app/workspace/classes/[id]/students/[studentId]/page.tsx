export const dynamic = "force-dynamic";

import {
  ChevronRight,
  CheckCircle2,
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
import { groupStudentAssignments } from "@/lib/human-ui-density-rules";
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
  if (type === "QUICK_PRACTICE") return "Practice set";
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
  const assignmentGroups = groupStudentAssignments(profile.assignments);
  const workSections = [
    {
      key: "needsAttention" as const,
      label: "Needs attention",
      description: "Overdue work and completed practice with recorded mistakes.",
      assignments: assignmentGroups.needsAttention,
    },
    {
      key: "inProgress" as const,
      label: "In progress",
      description: "Assigned work that has not been completed yet.",
      assignments: assignmentGroups.inProgress,
    },
    {
      key: "completed" as const,
      label: "Completed",
      description: "Finished work without a current recorded attention signal.",
      assignments: assignmentGroups.completed,
    },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-10">
      <nav className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground" aria-label="Breadcrumb">
        <Link href="/workspace/classes" className="shrink-0 hover:text-foreground hover:underline">Classes</Link>
        <ChevronRight className="size-3.5 shrink-0" />
        <Link href={`/workspace/classes/${profile.class.id}`} aria-label="Back to Class" className="max-w-40 truncate hover:text-foreground hover:underline sm:max-w-64">{profile.class.name}</Link>
        <ChevronRight className="size-3.5 shrink-0" />
        <span className="truncate font-medium text-foreground" aria-current="page">{studentName}</span>
      </nav>

      <Card className="overflow-hidden">
        <CardContent className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <UserRound className="size-7" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-primary">Student in {profile.class.name}</p>
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

      <section aria-labelledby="learning-snapshot-heading">
        <h2 id="learning-snapshot-heading" className="mb-3 text-lg font-bold">Learning snapshot</h2>
        <dl className="grid grid-cols-2 divide-x divide-y overflow-hidden rounded-xl border bg-card sm:grid-cols-3 lg:grid-cols-6 lg:divide-y-0">
          {[
            { label: "Assigned", value: profile.summary.total, className: "" },
            { label: "Completed", value: profile.summary.completed, className: "text-emerald-600" },
            { label: "Pending", value: profile.summary.pending, className: "" },
            { label: "Overdue", value: profile.summary.overdue, className: profile.summary.overdue > 0 ? "text-destructive" : "" },
            { label: "Average score", value: profile.summary.averageScore === null ? "—" : `${profile.summary.averageScore}%`, className: "" },
            { label: "Latest attempt", value: formatDateTime(profile.summary.latestAttemptAt), className: "" },
          ].map((item) => (
            <div key={item.label} className={`min-w-0 p-4 ${item.className}`}>
              <dt className="text-xs text-muted-foreground">{item.label}</dt>
              <dd className="mt-1 break-words font-bold">{item.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
          <h2 className="text-xl font-bold">Recent Assigned Work</h2>
          <p className="text-sm text-muted-foreground">
            Class-specific completion and attempt history for this student.
          </p>
          </div>
          <Link href={`/workspace/classes/${profile.class.id}?tab=assignments#assigned-work`} className="text-sm font-semibold text-primary hover:underline">Back to Assigned Work</Link>
        </div>

        {profile.assignments.length === 0 ? (
          <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
            This student has no assigned work in this class yet.
          </div>
        ) : (
          <div className="space-y-6">
            {workSections.map((section) => section.assignments.length > 0 ? (
              <section key={section.key} aria-labelledby={`student-work-${section.key}`} className="space-y-2">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <h3 id={`student-work-${section.key}`} className="font-semibold">
                      {section.label} <span className="text-sm font-normal text-muted-foreground">{section.assignments.length}</span>
                    </h3>
                    <p className="text-xs text-muted-foreground">{section.description}</p>
                  </div>
                </div>
                <div className="divide-y overflow-hidden rounded-xl border bg-card">
                  {section.assignments.map((assignment) => {
                    const isPractice = assignment.challenge.type === "QUICK_PRACTICE";
                    const attempted = isPractice && assignment.recipient.attemptCount > 0;
                    const reviewHref = `/workspace/classes/${profile.class.id}/assignments/${assignment.id}?studentId=${profile.student.id}#answer-review-${profile.student.id}`;
                    const assignmentHref = `/workspace/classes/${profile.class.id}/assignments/${assignment.id}`;

                    return (
                      <article key={assignment.id} className="grid min-w-0 gap-3 p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline">{contentTypeLabel(assignment.challenge.type)}</Badge>
                            <Badge variant={assignment.recipient.status === "OVERDUE" ? "destructive" : assignment.recipient.status === "PENDING" ? "outline" : "default"}>
                              {statusLabel(assignment.recipient.status)}
                            </Badge>
                          </div>
                          <h4 className="mt-2 break-words font-semibold leading-snug">
                            {assignment.challenge.title}
                          </h4>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {assignment.dueDate ? `Due ${formatAssignmentDueDate(assignment.dueDate)}` : "No due date"}
                            {!attempted && isPractice ? " · Not attempted yet" : ""}
                            {!isPractice && assignment.recipient.status === "PENDING" ? " · Waiting for student" : ""}
                          </p>
                          {attempted ? (
                            <p className="mt-1 text-sm text-muted-foreground">
                              Latest {assignment.recipient.latestPercentage}% · Best {assignment.recipient.bestPercentage}%
                              <span aria-hidden="true"> · </span>
                              {assignment.recipient.attemptCount} attempt{assignment.recipient.attemptCount === 1 ? "" : "s"}
                              <span aria-hidden="true"> · </span>
                              {assignment.recipient.mistakesCount} mistake{assignment.recipient.mistakesCount === 1 ? "" : "s"}
                              {assignment.recipient.latestAttemptAt ? ` · Last attempted ${formatDate(assignment.recipient.latestAttemptAt)}` : ""}
                            </p>
                          ) : assignment.recipient.completedAt ? (
                            <p className="mt-1 text-sm text-muted-foreground">
                              Completed {formatDate(assignment.recipient.completedAt)}
                            </p>
                          ) : null}
                          {assignment.answerReviewState === "OLDER_ATTEMPT" ? (
                            <p className="mt-1 text-xs text-muted-foreground">Detailed answer review was not captured for this older attempt.</p>
                          ) : null}
                        </div>

                        <Link
                          href={assignment.answerReviewState === "AVAILABLE" ? reviewHref : assignmentHref}
                          className="w-full md:w-auto"
                        >
                          <Button
                            variant={assignment.answerReviewState === "AVAILABLE" ? "default" : "outline"}
                            size="sm"
                            className="w-full md:w-auto"
                          >
                            {assignment.answerReviewState === "AVAILABLE" ? (
                              <><Target className="mr-2 size-4" /> Review answers</>
                            ) : (
                              <><ExternalLink className="mr-2 size-4" /> Open assignment</>
                            )}
                          </Button>
                        </Link>
                      </article>
                    );
                  })}
                </div>
              </section>
            ) : null)}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-xl font-bold">Areas to revisit</h2>
          <p className="text-sm text-muted-foreground">
            Recorded wrong answers from this student&apos;s latest class assignment attempts.
          </p>
        </div>

        {profile.mistakes.capturedWrongAnswers === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            {profile.mistakes.trackedWrongSelections > 0
              ? "Detailed mistake topics were not captured for this student’s older attempts."
              : "No recorded mistakes yet. They’ll appear after this student completes assigned practice."}
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

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <CheckCircle2 className="size-4 text-emerald-600" /> Showing learning activity from {profile.class.name} only.
      </p>
    </div>
  );
}
