export const dynamic = "force-dynamic";

import {
  CalendarDays,
  CheckCircle2,
  Clock,
  ChevronRight,
  FileText,
  Sparkles,
  Target,
  Users,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { getTeacherRemedialPracticeContext } from "@/lib/remedial-practice/service";
import { requireActiveWorkspace } from "@/lib/require-role";
import { groupAssignmentRecipients } from "@/lib/human-ui-density-rules";
import { formatAssignmentDueDate } from "@/lib/workspace-assignment-rules";
import { getWorkspaceClassAssignmentTracking } from "@/lib/workspace-assignment-tracking";
import { requireWorkspaceSubjectScope } from "@/lib/workspace-academic-scope";
import { readOptionSnapshot } from "@/lib/assignment-attempt-answer-snapshot-rules";

function formatDate(value: Date | string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

function statusLabel(status: string) {
  if (status === "MARKED_DONE") return "Marked Done";
  return status.charAt(0) + status.slice(1).toLowerCase();
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

export default async function WorkspaceAssignmentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; batchId: string }>;
  searchParams: Promise<{ studentId?: string | string[] }>;
}) {
  const [{ id: classId, batchId }, query] = await Promise.all([params, searchParams]);
  const user = await requireActiveWorkspace();

  const classData = await prisma.class.findFirst({
    where: {
      id: classId,
      workspaceId: user.workspaceId,
      workspace: { status: "ACTIVE" },
    },
    select: { id: true, name: true, subjectId: true },
  });
  if (!classData) notFound();
  await requireWorkspaceSubjectScope(user.workspaceId, classData.subjectId);

  const [assignment] = await getWorkspaceClassAssignmentTracking({
    workspaceId: user.workspaceId,
    classId,
    batchId,
  });
  if (!assignment || assignment.challenge.subjectId !== classData.subjectId) notFound();
  const focusedStudentId =
    typeof query.studentId === "string" &&
    assignment.recipients.some((recipient) => recipient.studentId === query.studentId)
      ? query.studentId
      : null;

  const isPractice = assignment.challenge.type === "QUICK_PRACTICE";
  const remedialResult = isPractice
    ? await getTeacherRemedialPracticeContext({ classId, batchId })
    : null;
  const contentLabel = isPractice
    ? "Practice set"
    : assignment.challenge.type === "PDF_WORKSHEET"
      ? "PDF Worksheet"
      : "Worksheet";
  const recipientGroups = groupAssignmentRecipients(assignment.recipients);
  const recipientSections = [
    {
      key: "needsAttention" as const,
      label: "Needs attention",
      description: "Overdue students and completed practice with recorded mistakes.",
      recipients: recipientGroups.needsAttention,
    },
    {
      key: "pending" as const,
      label: "Pending",
      description: "Students who have not completed this assignment yet.",
      recipients: recipientGroups.pending,
    },
    {
      key: "completed" as const,
      label: "Completed",
      description: "Completed work without a current recorded attention signal.",
      recipients: recipientGroups.completed,
    },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-10">
      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/workspace/classes" className="shrink-0 hover:text-foreground hover:underline">Classes</Link>
        <ChevronRight className="size-3.5 shrink-0" />
        <Link href={`/workspace/classes/${classId}`} className="max-w-40 truncate hover:text-foreground hover:underline sm:max-w-64">{classData.name}</Link>
        <ChevronRight className="size-3.5 shrink-0" />
        <span className="truncate font-medium text-foreground" aria-current="page">{assignment.challenge.title}</span>
      </nav>

      <header>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{contentLabel}</Badge>
          <Badge variant={assignment.status === "ACTIVE" ? "default" : "secondary"}>
            {statusLabel(assignment.status)}
          </Badge>
        </div>
        <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
          {assignment.challenge.title}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Progress for the students currently receiving this work in {classData.name}.
        </p>
      </header>

      <dl className="grid grid-cols-2 divide-x divide-y overflow-hidden rounded-xl border bg-card sm:grid-cols-5 sm:divide-y-0">
        {[
          { label: "Assigned", value: assignment.summary.assigned, className: "" },
          { label: "Completed", value: assignment.summary.completed, className: "text-emerald-600" },
          { label: "Pending", value: assignment.summary.pending, className: "" },
          { label: "Overdue", value: assignment.summary.overdue, className: assignment.summary.overdue > 0 ? "text-destructive" : "" },
          { label: "Average score", value: isPractice && assignment.summary.averageScore !== null ? `${assignment.summary.averageScore}%` : "—", className: "col-span-2 sm:col-span-1" },
        ].map((item) => (
          <div key={item.label} className={`p-4 ${item.className}`}>
            <dt className="text-xs text-muted-foreground">{item.label}</dt>
            <dd className="mt-1 text-2xl font-bold">{item.value}</dd>
          </div>
        ))}
      </dl>

      <section aria-labelledby="assignment-details-heading" className="rounded-xl border bg-card">
        <h2 id="assignment-details-heading" className="border-b px-4 py-3 text-base font-semibold">Assignment details</h2>
        <div className="grid gap-3 p-4 text-sm sm:grid-cols-3">
          <p className="flex items-center gap-2"><CalendarDays className="size-4 text-muted-foreground" /> Assigned {formatDate(assignment.createdAt)}</p>
          <p className="flex items-center gap-2"><Clock className="size-4 text-muted-foreground" /> Due {assignment.dueDate ? formatAssignmentDueDate(assignment.dueDate) : "No due date"}</p>
          <p className="flex items-center gap-2"><Users className="size-4 text-muted-foreground" /> {assignment.audience === "CLASS" ? "Entire class" : "Selected students"}</p>
        </div>
      </section>

      {isPractice && remedialResult?.success ? (
        <Card className="border-violet-500/20">
          <CardHeader className="gap-3 border-b sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="size-4 text-violet-500" /> Follow-up practice
              </CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Create focused practice from wrong answers made after this assignment was issued.
              </p>
            </div>
            {remedialResult.data.weakTopics.length > 0 &&
            remedialResult.data.candidates.length > 0 &&
            remedialResult.data.suggestedStudentIds.length > 0 ? (
              <Link href={`/workspace/classes/${classId}/assignments/${batchId}/remedial`}>
                <Button size="sm" className="w-full sm:w-auto">
                  <Sparkles className="mr-2 size-4" /> Create follow-up practice
                </Button>
              </Link>
            ) : null}
          </CardHeader>
          <CardContent className="p-4">
            {remedialResult.data.weakTopics.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No wrong answers are linked to a topic yet. Follow-up practice becomes available after students make topic-linked mistakes.
              </p>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {remedialResult.data.weakTopics.map((topic) => (
                    <Badge key={topic.id} variant="outline">
                      {topic.name} · {topic.mistakeCount} mistake{topic.mistakeCount === 1 ? "" : "s"}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {remedialResult.data.suggestedStudentIds.length} student{remedialResult.data.suggestedStudentIds.length === 1 ? "" : "s"} with mistakes · {remedialResult.data.candidates.length} question{remedialResult.data.candidates.length === 1 ? "" : "s"} available for follow-up
                </p>
                {remedialResult.data.candidates.length === 0 ? (
                  <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
                    No complete MCQs are available in the weak topics for this assigned subject and workspace.
                  </p>
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-bold">Student progress</h2>
          <p className="text-sm text-muted-foreground">
            {isPractice
              ? "Completion and scores come from real attempts made after this assignment was created."
              : "Document worksheets are completed only when the assigned student selects Mark as Done."}
            {" "}Students who may need attention appear first.
          </p>
        </div>

        {assignment.recipients.length === 0 ? (
          <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
            No active recipients for this assignment.
          </div>
        ) : (
          <div className="space-y-6">
            {recipientSections.map((section) => section.recipients.length > 0 ? (
              <section key={section.key} aria-labelledby={`assignment-group-${section.key}`} className="space-y-2">
                <div>
                  <h3 id={`assignment-group-${section.key}`} className="font-semibold">
                    {section.label} <span className="text-sm font-normal text-muted-foreground">{section.recipients.length}</span>
                  </h3>
                  <p className="text-xs text-muted-foreground">{section.description}</p>
                </div>
                <div className="divide-y overflow-hidden rounded-xl border bg-card">
                  {section.recipients.map((recipient) => (
                    <article
                      key={recipient.id}
                      className={focusedStudentId === recipient.studentId ? "ring-2 ring-inset ring-primary/40" : undefined}
                    >
                      <div className="grid min-w-0 gap-3 p-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_auto] md:items-center">
                        <div className="min-w-0">
                          <p className="truncate font-semibold">{recipient.student.name || recipient.student.email || "Unnamed student"}</p>
                          <p className="truncate text-xs text-muted-foreground">{recipient.student.email || "No email"}</p>
                        </div>
                        <div className="min-w-0">
                          <Badge variant={recipient.status === "OVERDUE" ? "destructive" : recipient.status === "PENDING" ? "outline" : "default"}>
                            {statusLabel(recipient.status)}
                          </Badge>
                          <p className="mt-1 break-words text-sm text-muted-foreground">
                            {isPractice && recipient.attemptCount > 0
                              ? `Latest ${recipient.latestPercentage}% · Best ${recipient.bestPercentage}% · ${recipient.attemptCount} attempt${recipient.attemptCount === 1 ? "" : "s"} · ${recipient.mistakesCount} mistake${recipient.mistakesCount === 1 ? "" : "s"}`
                              : isPractice
                                ? "No attempt yet"
                                : recipient.completedAt
                                  ? `Marked done ${formatDate(recipient.completedAt)}`
                                  : "Waiting for student"}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2 md:justify-end">
                          {isPractice && recipient.attemptCount > 0 ? (
                            <Link href={`?studentId=${recipient.studentId}#answer-review-${recipient.studentId}`}>
                              <Button size="sm">Review answers</Button>
                            </Link>
                          ) : null}
                          <Link href={`/workspace/classes/${classId}/students/${recipient.studentId}`}>
                            <Button variant="outline" size="sm" aria-label="Open Student Profile">
                              <Target className="mr-1 size-4" /> View student
                            </Button>
                          </Link>
                          {!isPractice ? (
                            <Link href={`/workspace/print/${assignment.challenge.id}`}>
                              <Button variant="ghost" size="sm">
                                <FileText className="mr-1 size-4" /> View worksheet
                              </Button>
                            </Link>
                          ) : null}
                        </div>
                      </div>
                      {isPractice && recipient.attemptCount > 0 ? (
                        <details
                          id={`answer-review-${recipient.studentId}`}
                          className="scroll-mt-24 border-t border-border/70"
                          open={focusedStudentId === recipient.studentId}
                        >
                          <summary className="min-h-11 cursor-pointer list-none px-4 py-3 text-sm font-semibold text-primary outline-none hover:bg-muted/30 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
                            Answer details
                            <span className="ml-2 text-xs font-normal text-muted-foreground">
                              Latest attempt · {formatDateTime(recipient.latestAttemptAt)}
                            </span>
                          </summary>
                          <div className="space-y-3 px-4 pb-4">
                            {!recipient.answerReviewCaptured ? (
                              <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                                This attempt was completed before detailed answer review was available.
                              </div>
                            ) : recipient.answerReview.length === 0 ? (
                              <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-emerald-700 dark:text-emerald-300">
                                <CheckCircle2 className="size-4" /> No incorrect answers in this attempt.
                              </div>
                            ) : (
                              recipient.answerReview.map((answer, index) => {
                                const options = readOptionSnapshot(answer.options);
                                return (
                                  <div key={answer.id} className="rounded-xl border border-destructive/20 bg-destructive/[0.03] p-4">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <Badge variant="destructive" className="gap-1">
                                        <XCircle className="size-3" /> Wrong
                                      </Badge>
                                      {answer.topicLabel ? <Badge variant="outline">{answer.topicLabel}</Badge> : null}
                                      {answer.difficulty ? <Badge variant="secondary">{answer.difficulty}</Badge> : null}
                                      <span className="text-xs text-muted-foreground">
                                        {answer.marksAwarded}/{answer.maxMarks} marks
                                      </span>
                                    </div>
                                    <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                      Question {index + 1}
                                    </p>
                                    <p className="mt-1 whitespace-pre-wrap text-sm font-semibold leading-relaxed">
                                      {answer.questionText}
                                    </p>
                                    {options ? (
                                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                        {(["A", "B", "C", "D"] as const).map((key) => (
                                          <div
                                            key={key}
                                            className={`rounded-lg border p-2.5 text-sm ${
                                              key === answer.correctOptionKey
                                                ? "border-emerald-500/40 bg-emerald-500/10"
                                                : key === answer.selectedOptionKey
                                                  ? "border-destructive/40 bg-destructive/10"
                                                  : "border-border/70 bg-background"
                                            }`}
                                          >
                                            <strong>{key}.</strong> {options[key]}
                                          </div>
                                        ))}
                                      </div>
                                    ) : null}
                                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                      <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm">
                                        <p className="text-xs font-semibold text-destructive">Student selected</p>
                                        <p className="mt-1 break-words">
                                          <strong>{answer.selectedOptionKey}.</strong> {answer.selectedOptionText}
                                        </p>
                                      </div>
                                      <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm">
                                        <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">Correct answer</p>
                                        <p className="mt-1 break-words">
                                          <strong>{answer.correctOptionKey}.</strong> {answer.correctOptionText}
                                        </p>
                                      </div>
                                    </div>
                                    {answer.explanation ? (
                                      <div className="mt-3 rounded-lg bg-muted/50 p-3 text-sm">
                                        <p className="text-xs font-semibold text-muted-foreground">Explanation</p>
                                        <p className="mt-1 whitespace-pre-wrap leading-relaxed">{answer.explanation}</p>
                                      </div>
                                    ) : null}
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </details>
                      ) : null}
                    </article>
                  ))}
                </div>
              </section>
            ) : null)}
          </div>
        )}
      </section>

      {assignment.summary.completed === assignment.summary.assigned && assignment.summary.assigned > 0 ? (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm font-medium text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="size-4" /> All active recipients have completed this assignment.
        </div>
      ) : null}
    </div>
  );
}
