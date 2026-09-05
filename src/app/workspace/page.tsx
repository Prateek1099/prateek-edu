export const dynamic = "force-dynamic";

import {
  Activity,
  AlertCircle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  FileText,
  Zap,
} from "lucide-react";
import { getServerSession } from "next-auth/next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  buildTeacherAttentionItems,
  contentTypeLabel,
  getTeacherGreeting,
  summarizeClassWork,
} from "@/lib/teacher-daily-workflow";
import { listActiveWorkspaceScopes } from "@/lib/workspace-academic-scope";
import { getWorkspaceClassAssignmentTracking } from "@/lib/workspace-assignment-tracking";

type WorkspaceSessionUser = { id: string; name?: string | null };

function getRelativeTime(date: Date) {
  const elapsedMinutes = Math.max(0, Math.round((Date.now() - date.getTime()) / 60_000));
  if (elapsedMinutes < 1) return "Just now";
  if (elapsedMinutes < 60) return String(elapsedMinutes) + " min ago";
  const elapsedHours = Math.round(elapsedMinutes / 60);
  if (elapsedHours < 24) return String(elapsedHours) + " hr ago";
  const elapsedDays = Math.round(elapsedHours / 24);
  return String(elapsedDays) + " day" + (elapsedDays === 1 ? "" : "s") + " ago";
}

export default async function WorkspaceDashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const user = session.user as typeof session.user & WorkspaceSessionUser;

  const workspace = await prisma.workspace.findUnique({ where: { ownerId: user.id } });
  if (!workspace) redirect("/dashboard");

  const scopes = await listActiveWorkspaceScopes(workspace.id);
  const subjectIds = scopes.map((scope) => scope.subjectId);
  const activeClasses = await prisma.class.findMany({
    where: { workspaceId: workspace.id, status: "ACTIVE", subjectId: { in: subjectIds } },
    include: {
      subject: true,
      _count: { select: { students: { where: { status: "ACTIVE" } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  const [assignmentGroups, totalStudents, worksheetsCount, questionBankSize, recentStudents, recentContent] =
    await Promise.all([
      Promise.all(
        activeClasses.map((classData) =>
          getWorkspaceClassAssignmentTracking({ workspaceId: workspace.id, classId: classData.id }),
        ),
      ),
      prisma.classStudent.count({
        where: {
          class: { workspaceId: workspace.id, status: "ACTIVE", subjectId: { in: subjectIds } },
          status: "ACTIVE",
        },
      }),
      prisma.challenge.count({
        where: {
          workspaceId: workspace.id,
          subjectId: { in: subjectIds },
          type: { in: ["WORKSHEET", "PDF_WORKSHEET"] },
        },
      }),
      prisma.bankQuestion.count({
        where: { workspaceId: workspace.id, subjectId: { in: subjectIds } },
      }),
      prisma.classStudent.findMany({
        where: {
          status: "ACTIVE",
          class: { workspaceId: workspace.id, status: "ACTIVE", subjectId: { in: subjectIds } },
        },
        select: {
          id: true,
          enrolledAt: true,
          student: { select: { name: true } },
          class: { select: { id: true, name: true } },
        },
        orderBy: { enrolledAt: "desc" },
        take: 5,
      }),
      prisma.challenge.findMany({
        where: {
          workspaceId: workspace.id,
          subjectId: { in: subjectIds },
          type: { in: ["WORKSHEET", "PDF_WORKSHEET", "QUICK_PRACTICE"] },
        },
        select: { id: true, type: true, title: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

  const classesWithWork = activeClasses.map((classData, index) => ({
    ...classData,
    assignments: assignmentGroups[index],
    workSummary: summarizeClassWork(assignmentGroups[index]),
  }));
  const attentionItems = buildTeacherAttentionItems(
    classesWithWork.map((classData) => ({
      id: classData.id,
      name: classData.name,
      assignments: classData.assignments,
    })),
  );

  const recentAssignments = classesWithWork.flatMap((classData) =>
    classData.assignments.map((assignment) => ({
      id: "assignment-" + assignment.id,
      title: "Assigned “" + assignment.challenge.title + "” to " + classData.name,
      date: new Date(assignment.createdAt),
      href: "/workspace/classes/" + classData.id + "/assignments/" + assignment.id,
    })),
  );
  const recentActivity = [
    ...recentAssignments,
    ...recentStudents.map((membership) => ({
      id: "student-" + membership.id,
      title: (membership.student.name || "A student") + " joined " + membership.class.name,
      date: membership.enrolledAt,
      href: "/workspace/classes/" + membership.class.id,
    })),
    ...recentContent.map((content) => ({
      id: "content-" + content.id,
      title: "Created " + contentTypeLabel(content.type) + " “" + content.title + "”",
      date: content.createdAt,
      href: content.type === "QUICK_PRACTICE" ? "/workspace/quick-practice" : "/workspace/worksheets",
    })),
  ]
    .sort((left, right) => right.date.getTime() - left.date.getTime())
    .slice(0, 6);

  return (
    <div className="mx-auto max-w-7xl space-y-9 pb-10">
      <header className="flex flex-col gap-5 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-primary">{workspace.name}</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
            {getTeacherGreeting()}, {user.name?.split(" ")[0] || "Teacher"}
          </h1>
          <p className="mt-2 text-muted-foreground">
            Start with the work that needs you, or open a class to continue teaching.
          </p>
        </div>
        <Link href="/workspace/classes" className="w-full sm:w-auto">
          <Button size="lg" className="w-full sm:w-auto">
            Open classes <ArrowRight className="ml-2 size-4" />
          </Button>
        </Link>
      </header>

      {scopes.length === 0 ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-200">
          Your academic access has not been configured yet. Please contact the administrator.
        </div>
      ) : null}

      <section aria-labelledby="needs-attention-heading">
        <div className="mb-4">
          <h2 id="needs-attention-heading" className="text-xl font-bold">Needs attention</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Based on active assignments, completion, deadlines, and recorded answers.
          </p>
        </div>
        <div className="overflow-hidden rounded-xl border bg-card">
          {attentionItems.length === 0 ? (
            <div className="flex flex-col gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" />
                <div>
                  <p className="font-semibold">You&apos;re all caught up.</p>
                  <p className="text-sm text-muted-foreground">No active assigned work currently needs attention.</p>
                </div>
              </div>
              <Link href="/workspace/classes"><Button variant="outline" size="sm">Open a class</Button></Link>
            </div>
          ) : (
            <div className="divide-y">
              {attentionItems.map((item) => (
                <div key={item.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <AlertCircle className={"mt-0.5 size-5 shrink-0 " + (item.kind === "OVERDUE" ? "text-destructive" : "text-amber-600")} />
                    <div className="min-w-0">
                      <p className="font-medium leading-snug">{item.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{item.context}</p>
                    </div>
                  </div>
                  <Link href={item.href} className="w-full shrink-0 sm:w-auto">
                    <Button variant={item.kind === "OVERDUE" ? "default" : "outline"} size="sm" className="w-full sm:w-auto">
                      {item.actionLabel}
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section aria-labelledby="my-classes-heading">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 id="my-classes-heading" className="text-xl font-bold">My classes</h2>
            <p className="mt-1 text-sm text-muted-foreground">Your main spaces for students and assigned work.</p>
          </div>
          <Link href="/workspace/classes" className="hidden text-sm font-semibold text-primary hover:underline sm:inline">
            View all classes
          </Link>
        </div>
        {classesWithWork.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center">
            <BookOpen className="mx-auto size-8 text-muted-foreground/50" />
            <p className="mt-3 font-semibold">No classes yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Create your first class, then share its code with students.</p>
            <Link href="/workspace/classes"><Button className="mt-4" size="sm">Create a class</Button></Link>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {classesWithWork.slice(0, 6).map((classData) => (
              <article key={classData.id} className="flex min-w-0 flex-col rounded-xl border bg-card p-5">
                <div className="min-w-0">
                  <h3 className="break-words text-lg font-bold">{classData.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{classData.subject?.name || "Subject not set"}</p>
                </div>
                <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm">
                  <span><strong>{classData._count.students}</strong> students</span>
                  <span><strong>{classData.workSummary.pending}</strong> pending</span>
                  {classData.workSummary.overdue > 0 ? (
                    <span className="font-semibold text-destructive">{classData.workSummary.overdue} overdue</span>
                  ) : null}
                </div>
                <Link href={"/workspace/classes/" + classData.id} className="mt-5">
                  <Button variant="outline" className="w-full">Open class <ArrowRight className="ml-2 size-4" /></Button>
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="create-heading">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 id="create-heading" className="text-lg font-bold">Create for your class</h2>
          <Link href="/workspace/question-bank" className="text-sm font-semibold text-primary hover:underline">
            Manage question bank
          </Link>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <Link href="/workspace/quick-practice" className="flex min-h-12 items-center justify-between rounded-lg border px-4 py-3 font-medium hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <span className="flex items-center gap-2"><Zap className="size-4 text-primary" /> Practice set</span>
            <ArrowRight className="size-4 text-muted-foreground" />
          </Link>
          <Link href="/workspace/worksheets" className="flex min-h-12 items-center justify-between rounded-lg border px-4 py-3 font-medium hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <span className="flex items-center gap-2"><FileText className="size-4 text-primary" /> Worksheet</span>
            <ArrowRight className="size-4 text-muted-foreground" />
          </Link>
          <Link href="/workspace/paper-builder" className="flex min-h-12 items-center justify-between rounded-lg border px-4 py-3 font-medium hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <span className="flex items-center gap-2"><BookOpen className="size-4 text-primary" /> Quick paper</span>
            <ArrowRight className="size-4 text-muted-foreground" />
          </Link>
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(17rem,0.65fr)]">
        <section aria-labelledby="recent-activity-heading">
          <div className="mb-3">
            <h2 id="recent-activity-heading" className="text-lg font-bold">Recent activity</h2>
            <p className="mt-1 text-sm text-muted-foreground">Real class membership, assignment, and content activity.</p>
          </div>
          <div className="divide-y overflow-hidden rounded-xl border bg-card">
            {recentActivity.length === 0 ? (
              <div className="p-7 text-center text-sm text-muted-foreground">
                Activity will appear after students join or you create and assign work.
              </div>
            ) : recentActivity.map((event) => (
              <Link key={event.id} href={event.href} className="flex items-start gap-3 p-4 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
                <Activity className="mt-0.5 size-4 shrink-0 text-primary" />
                <span className="min-w-0 flex-1">
                  <span className="block break-words text-sm font-medium">{event.title}</span>
                  <span className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="size-3" /> {getRelativeTime(event.date)}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section aria-labelledby="workspace-summary-heading">
          <div className="mb-3">
            <h2 id="workspace-summary-heading" className="text-lg font-bold">Workspace summary</h2>
            <p className="mt-1 text-sm text-muted-foreground">Useful totals, kept secondary.</p>
          </div>
          <dl className="divide-y rounded-xl border bg-card px-4">
            {[
              { label: "Active classes", value: activeClasses.length },
              { label: "Students", value: totalStudents },
              { label: "Worksheets", value: worksheetsCount },
              { label: "Your questions", value: questionBankSize },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between py-3">
                <dt className="text-sm text-muted-foreground">{item.label}</dt>
                <dd className="font-semibold tabular-nums">{item.value}</dd>
              </div>
            ))}
          </dl>
          {scopes.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {scopes.map((scope) => <Badge key={scope.subjectId} variant="outline">{scope.subject.name}</Badge>)}
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
