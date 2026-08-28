export const dynamic = "force-dynamic";

import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock,
  FileText,
  Target,
  Users,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { requireActiveWorkspace } from "@/lib/require-role";
import { formatAssignmentDueDate } from "@/lib/workspace-assignment-rules";
import { getWorkspaceClassAssignmentTracking } from "@/lib/workspace-assignment-tracking";
import { requireWorkspaceSubjectScope } from "@/lib/workspace-academic-scope";

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
