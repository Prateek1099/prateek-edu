import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Search,
  Users,
} from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { formatAdminDateTime } from "@/lib/admin-date-format";
import { assessmentService } from "@/lib/assessments/service";
import {
  teacherAssessmentStatusLabel,
  type TeacherAssessmentCenterResult,
  type TeacherAssessmentFilter,
  type TeacherAssessmentState,
} from "@/lib/assessments/teacher-center";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const filters: Array<{ value: TeacherAssessmentFilter; label: string }> = [
  { value: "ALL", label: "All" },
  { value: "SCHEDULED", label: "Scheduled" },
  { value: "ACTIVE", label: "Active" },
  { value: "COMPLETED", label: "Completed" },
];

function first(value: string | string[] | undefined) {
  return typeof value === "string" ? value : "";
}

function assessmentCenterHref(
  query: TeacherAssessmentCenterResult["query"],
  overrides: Partial<{ status: TeacherAssessmentFilter; search: string; classId: string; page: number }>,
) {
  const next = { ...query, ...overrides };
  const params = new URLSearchParams();
  if (next.status !== "ALL") params.set("status", next.status.toLowerCase());
  if (next.search) params.set("search", next.search);
  if (next.classId) params.set("classId", next.classId);
  if (next.page > 1) params.set("page", String(next.page));
  const suffix = params.toString();
  return suffix ? `/workspace/assessments?${suffix}` : "/workspace/assessments";
}

function statusClasses(status: TeacherAssessmentState) {
  if (status === "ACTIVE") return "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  if (status === "SCHEDULED") return "border-blue-500/25 bg-blue-500/10 text-blue-700 dark:text-blue-300";
  if (status === "CANCELLED") return "border-destructive/25 bg-destructive/10 text-destructive";
  return "border-border bg-muted text-muted-foreground";
}

function StatusBadge({ item }: { item: TeacherAssessmentCenterResult["items"][number] }) {
  return (
    <Badge variant="outline" className={statusClasses(item.status)}>
      {teacherAssessmentStatusLabel(item.status, item.completionReason)}
    </Badge>
  );
}

function ProgressSummary({ item }: { item: TeacherAssessmentCenterResult["items"][number] }) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
      <span><strong className="text-foreground">{item.progress.notStarted}</strong> not started</span>
      <span><strong className="text-foreground">{item.progress.inProgress}</strong> in progress</span>
      <span><strong className="text-foreground">{item.progress.submittedReady}</strong> submitted / ready</span>
      <span><strong className="text-foreground">{item.progress.released}</strong> released</span>
    </div>
  );
}

export default async function TeacherAssessmentCenterPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const result = await assessmentService.teacherAssessmentCenter({
    status: first(params.status),
    search: first(params.search),
    classId: first(params.classId),
    page: first(params.page),
  });
  const filtered = result.query.status !== "ALL" || Boolean(result.query.search || result.query.classId) || result.query.page > 1;

  return (
    <div className="mx-auto max-w-7xl space-y-7 pb-10">
      <header className="flex flex-col gap-5 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 max-w-3xl">
          <p className="text-sm font-semibold text-primary">Assess</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Online Assessments</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground sm:text-base">
            Create, manage and review assessments assigned to your students.
          </p>
        </div>
        <Link href="/workspace/paper-builder/archive" className={cn(buttonVariants({ size: "lg" }), "w-full sm:w-auto")}>
          Assign assessment <ArrowRight className="size-4" />
        </Link>
      </header>

      <section aria-label="Assessment summary" className="grid grid-cols-3 gap-2 sm:max-w-xl sm:gap-3">
        {[
          { label: "Active", value: result.counts.active, Icon: Clock3 },
          { label: "Scheduled", value: result.counts.scheduled, Icon: CalendarClock },
          { label: "Completed", value: result.counts.completed, Icon: CheckCircle2 },
        ].map(({ label, value, Icon }) => (
          <div key={label} className="min-w-0 rounded-xl border bg-card p-3 sm:p-4">
            <Icon className="size-4 text-primary" />
            <p className="mt-2 text-xl font-bold tabular-nums sm:text-2xl">{value}</p>
            <p className="truncate text-xs text-muted-foreground sm:text-sm">{label}</p>
          </div>
        ))}
      </section>

      <section aria-label="Assessment filters" className="space-y-4">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {filters.map(filter => (
            <Link
              key={filter.value}
              href={assessmentCenterHref(result.query, { status: filter.value, page: 1 })}
              aria-current={result.query.status === filter.value ? "page" : undefined}
              className={cn(buttonVariants({ variant: result.query.status === filter.value ? "default" : "outline" }), "min-h-10")}
            >
              {filter.label}
            </Link>
          ))}
        </div>
        <form method="get" action="/workspace/assessments" className="grid gap-3 rounded-xl border bg-card p-3 sm:grid-cols-[minmax(0,1fr)_minmax(12rem,0.45fr)_auto] sm:p-4">
          {result.query.status !== "ALL" ? <input type="hidden" name="status" value={result.query.status.toLowerCase()} /> : null}
          <label className="relative min-w-0">
            <span className="sr-only">Search assessment titles</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              name="search"
              defaultValue={result.query.search}
              maxLength={100}
              placeholder="Search assessment title"
              className="h-10 w-full rounded-lg border bg-background pl-9 pr-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
            />
          </label>
          <label>
            <span className="sr-only">Filter by class</span>
            <select
              name="classId"
              defaultValue={result.query.classId}
              className="h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
            >
              <option value="">All classes</option>
              {result.classes.map(item => (
                <option key={item.id} value={item.id}>{item.name} · {item.subjectName}</option>
              ))}
            </select>
          </label>
          <button type="submit" className={cn(buttonVariants(), "h-10 w-full sm:w-auto")}>Apply filters</button>
        </form>
      </section>

      {result.items.length === 0 ? (
        <section className="rounded-2xl border border-dashed p-8 text-center sm:p-12">
          <ClipboardCheck className="mx-auto size-9 text-muted-foreground/50" />
          <h2 className="mt-4 text-lg font-semibold">{filtered ? "No assessments match this view." : "No online assessments yet."}</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
            {filtered
              ? "Try another status, class or title, or reset the filters."
              : "Create a paper and assign it online to start assessing your class."}
          </p>
          <Link
            href={filtered ? "/workspace/assessments" : "/workspace/paper-builder"}
            className={cn(buttonVariants({ variant: filtered ? "outline" : "default" }), "mt-5")}
          >
            {filtered ? "Reset filters" : "Go to Papers"}
          </Link>
        </section>
      ) : (
        <section aria-labelledby="assessment-list-heading">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 id="assessment-list-heading" className="text-lg font-semibold">Assessment history</h2>
              <p className="mt-1 text-sm text-muted-foreground">{result.total} assessment{result.total === 1 ? "" : "s"} in this view</p>
            </div>
            <p className="text-xs text-muted-foreground">Page {result.query.page} of {result.totalPages}</p>
          </div>

          <div className="space-y-3 md:hidden">
            {result.items.map(item => (
              <article key={item.id} className="min-w-0 rounded-2xl border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="break-words font-semibold">{item.title}</h3>
                    <p className="mt-1 break-words text-sm text-muted-foreground">{item.className} · {item.subjectName}</p>
                  </div>
                  <StatusBadge item={item} />
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div><dt className="text-xs text-muted-foreground">Opens</dt><dd className="mt-0.5">{formatAdminDateTime(item.opensAt)}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Closes</dt><dd className="mt-0.5">{formatAdminDateTime(item.closesAt)}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Paper</dt><dd className="mt-0.5">{item.questionCount} questions · {item.totalMarks} marks</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Duration</dt><dd className="mt-0.5">{item.durationMinutes} min</dd></div>
                </dl>
                <div className="mt-4 border-t pt-3">
                  <p className="mb-2 flex items-center gap-1.5 text-sm font-medium"><Users className="size-4 text-primary" /> {item.progress.assigned} students</p>
                  <ProgressSummary item={item} />
                </div>
                <Link href={`/workspace/assessments/${item.id}`} className={cn(buttonVariants({ variant: "outline" }), "mt-4 w-full")}>
                  View Results <ArrowRight className="size-4" />
                </Link>
              </article>
            ))}
          </div>

          <div className="hidden overflow-x-auto rounded-2xl border bg-card md:block">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="border-b bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Assessment</th>
                  <th className="px-4 py-3">Schedule</th>
                  <th className="px-4 py-3">Paper</th>
                  <th className="px-4 py-3">Progress</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {result.items.map(item => (
                  <tr key={item.id}>
                    <td className="max-w-xs px-4 py-4 align-top"><p className="break-words font-semibold">{item.title}</p><p className="mt-1 text-xs text-muted-foreground">{item.className} · {item.subjectName}</p></td>
                    <td className="whitespace-nowrap px-4 py-4 align-top"><p>{formatAdminDateTime(item.opensAt)}</p><p className="mt-1 text-xs text-muted-foreground">to {formatAdminDateTime(item.closesAt)}</p></td>
                    <td className="whitespace-nowrap px-4 py-4 align-top">{item.questionCount} questions<br /><span className="text-xs text-muted-foreground">{item.totalMarks} marks · {item.durationMinutes} min</span></td>
                    <td className="min-w-64 px-4 py-4 align-top"><p className="mb-1.5 font-medium">{item.progress.assigned} students</p><ProgressSummary item={item} /></td>
                    <td className="px-4 py-4 align-top"><StatusBadge item={item} /></td>
                    <td className="px-4 py-4 text-right align-top"><Link href={`/workspace/assessments/${item.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>View Results</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <nav aria-label="Assessment history pagination" className="mt-5 flex items-center justify-between gap-3">
            {result.query.page > 1 ? (
              <Link href={assessmentCenterHref(result.query, { page: result.query.page - 1 })} className={buttonVariants({ variant: "outline" })}>Previous</Link>
            ) : <span />}
            {result.query.page < result.totalPages ? (
              <Link href={assessmentCenterHref(result.query, { page: result.query.page + 1 })} className={buttonVariants({ variant: "outline" })}>Next</Link>
            ) : <span />}
          </nav>
        </section>
      )}
    </div>
  );
}
