export const dynamic = "force-dynamic";

import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock,
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
}: {
  params: Promise<{ id: string; batchId: string }>;
}) {
  const { id: classId, batchId } = await params;
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

  const isPractice = assignment.challenge.type === "QUICK_PRACTICE";
  const remedialResult = isPractice
    ? await getTeacherRemedialPracticeContext({ classId, batchId })
    : null;
  const contentLabel = isPractice
    ? "Quick Practice"
    : assignment.challenge.type === "PDF_WORKSHEET"
      ? "PDF Worksheet"
      : "Worksheet";

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-10">
      <Link href={`/workspace/classes/${classId}`} className="inline-flex">
        <Button variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
          <ArrowLeft className="mr-2 size-4" /> Back to {classData.name}
        </Button>
      </Link>

      <header>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{contentLabel}</Badge>
          <Badge variant={assignment.status === "ACTIVE" ? "default" : "secondary"}>
            {assignment.status}
          </Badge>
        </div>
        <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
          {assignment.challenge.title}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Assignment tracking for {classData.name}. Removed or revoked recipients are excluded.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Recipients</p><p className="mt-1 text-2xl font-bold">{assignment.summary.assigned}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Completed</p><p className="mt-1 text-2xl font-bold text-emerald-600">{assignment.summary.completed}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Pending</p><p className="mt-1 text-2xl font-bold">{assignment.summary.pending}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Overdue</p><p className="mt-1 text-2xl font-bold text-destructive">{assignment.summary.overdue}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Average score</p><p className="mt-1 text-2xl font-bold">{isPractice && assignment.summary.averageScore !== null ? `${assignment.summary.averageScore}%` : "—"}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-base">Assignment details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 p-4 text-sm sm:grid-cols-3">
          <p className="flex items-center gap-2"><CalendarDays className="size-4 text-muted-foreground" /> Assigned {formatDate(assignment.createdAt)}</p>
          <p className="flex items-center gap-2"><Clock className="size-4 text-muted-foreground" /> Due {assignment.dueDate ? formatAssignmentDueDate(assignment.dueDate) : "No due date"}</p>
          <p className="flex items-center gap-2"><Users className="size-4 text-muted-foreground" /> {assignment.audience === "CLASS" ? "Entire class" : "Selected students"}</p>
        </CardContent>
      </Card>

      {isPractice && remedialResult?.success ? (
        <Card className="border-violet-500/20">
          <CardHeader className="gap-3 border-b sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="size-4 text-violet-500" /> Remedial practice
              </CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Create focused repractice from wrong answers made after this assignment was issued.
              </p>
            </div>
            {remedialResult.data.weakTopics.length > 0 &&
            remedialResult.data.candidates.length > 0 &&
            remedialResult.data.suggestedStudentIds.length > 0 ? (
              <Link href={`/workspace/classes/${classId}/assignments/${batchId}/remedial`}>
                <Button size="sm" className="w-full sm:w-auto">
                  <Sparkles className="mr-2 size-4" /> Create Remedial Practice
                </Button>
              </Link>
            ) : null}
          </CardHeader>
          <CardContent className="p-4">
            {remedialResult.data.weakTopics.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No post-assignment wrong answers are linked to a real topic yet. A remedial practice can be created after students make topic-linked mistakes.
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
                  {remedialResult.data.suggestedStudentIds.length} student{remedialResult.data.suggestedStudentIds.length === 1 ? "" : "s"} with mistakes · {remedialResult.data.candidates.length} scoped MCQ candidate{remedialResult.data.candidates.length === 1 ? "" : "s"}
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
          </p>
        </div>

        {assignment.recipients.length === 0 ? (
          <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
            No active recipients for this assignment.
          </div>
        ) : (
          <div className="space-y-3">
            {assignment.recipients.map((recipient) => (
              <Card key={recipient.id}>
                <CardContent className="grid gap-4 p-4 md:grid-cols-[minmax(0,1.4fr)_repeat(4,minmax(0,1fr))_auto] md:items-center">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{recipient.student.name || recipient.student.email || "Unnamed student"}</p>
                    <p className="truncate text-xs text-muted-foreground">{recipient.student.email || "No email"}</p>
                  </div>
                  <div><p className="text-xs text-muted-foreground">Status</p><Badge className="mt-1" variant={recipient.status === "OVERDUE" ? "destructive" : recipient.status === "PENDING" ? "outline" : "default"}>{statusLabel(recipient.status)}</Badge></div>
                  <div><p className="text-xs text-muted-foreground">Attempts</p><p className="mt-1 font-semibold">{isPractice ? recipient.attemptCount : "—"}</p></div>
                  <div><p className="text-xs text-muted-foreground">Score</p><p className="mt-1 font-semibold">{isPractice && recipient.latestPercentage !== null ? `Latest ${recipient.latestPercentage}% · Best ${recipient.bestPercentage}%` : "—"}</p></div>
                  <div><p className="text-xs text-muted-foreground">Completed</p><p className="mt-1 font-semibold">{formatDate(recipient.completedAt)}</p>{isPractice ? <p className="text-xs text-muted-foreground">{recipient.mistakesCount} wrong answer{recipient.mistakesCount === 1 ? "" : "s"}</p> : null}</div>
                  <Link href={isPractice ? `/workspace/students/${recipient.studentId}` : `/workspace/print/${assignment.challenge.id}`}>
                    <Button variant="outline" size="sm" className="w-full md:w-auto">
                      {isPractice ? <Target className="mr-1 size-4" /> : <FileText className="mr-1 size-4" />}
                      {isPractice ? "View performance" : "View worksheet"}
                    </Button>
                  </Link>
                </CardContent>
                {isPractice && recipient.attemptCount > 0 ? (
                  <details className="border-t border-border/70">
                    <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-primary hover:bg-muted/30">
                      Answer Review
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        Latest attempt · {formatDateTime(recipient.latestAttemptAt)}
                      </span>
                    </summary>
                    <div className="space-y-3 px-4 pb-4">
                      {!recipient.answerReviewCaptured ? (
                        <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                          Detailed answer review was not captured for this attempt.
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
              </Card>
            ))}
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
