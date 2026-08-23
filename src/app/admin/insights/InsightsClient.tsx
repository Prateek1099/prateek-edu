"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  CalendarDays,
  CircleHelp,
  RefreshCw,
  Target,
  Trophy,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { InsightsDateRange } from "@/lib/admin-insights-rules";
import type { InsightFilterOptions, ScopedTeachingInsights } from "@/lib/teaching-intelligence";

const ALL_OPTION = "__all__";

type FilterSelection = {
  boardId: string;
  qualificationId: string;
  subjectId: string;
  topicId: string;
  challengeId: string;
  dateRange: InsightsDateRange;
};

type Props = {
  options: InsightFilterOptions;
  initialSelection: FilterSelection;
  insights: ScopedTeachingInsights | null;
  scopeError: string | null;
};

function formatScore(value: number | null) {
  return value === null ? "—" : `${value}%`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  }).format(new Date(value));
}

function MetricCard({
  label,
  value,
  note,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  note: string;
  icon: typeof Users;
}) {
  return (
    <Card>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
            <p className="mt-2 text-2xl font-bold tracking-tight">{value}</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{note}</p>
          </div>
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icon className="size-4" />
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center px-5 py-12 text-center">
        <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-muted">
          <BarChart3 className="size-6 text-muted-foreground" />
        </div>
        <h2 className="font-semibold">{title}</h2>
        <p className="mt-1 max-w-xl text-sm leading-6 text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

export default function InsightsClient({ options, initialSelection, insights, scopeError }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [filters, setFilters] = useState(initialSelection);

  const qualifications = useMemo(
    () => options.qualifications.filter((item) => item.boardId === filters.boardId),
    [filters.boardId, options.qualifications],
  );
  const subjects = useMemo(
    () => options.subjects.filter((item) => item.qualificationId === filters.qualificationId),
    [filters.qualificationId, options.subjects],
  );
  const topics = useMemo(
    () => options.topics.filter((item) => item.subjectId === filters.subjectId),
    [filters.subjectId, options.topics],
  );
  const challenges = useMemo(
    () => options.challenges.filter(
      (item) => item.subjectId === filters.subjectId && (!filters.topicId || item.topicId === filters.topicId),
    ),
    [filters.subjectId, filters.topicId, options.challenges],
  );

  const canApply = Boolean(filters.boardId && filters.qualificationId && filters.subjectId);

  function applyFilters() {
    if (!canApply) return;
    const params = new URLSearchParams({
      boardId: filters.boardId,
      qualificationId: filters.qualificationId,
      subjectId: filters.subjectId,
      dateRange: filters.dateRange,
    });
    if (filters.topicId) params.set("topicId", filters.topicId);
    if (filters.challengeId) params.set("challengeId", filters.challengeId);
    router.push(`${pathname}?${params.toString()}`);
  }

  function resetFilters() {
    setFilters({
      boardId: "",
      qualificationId: "",
      subjectId: "",
      topicId: "",
      challengeId: "",
      dateRange: "7",
    });
    router.push(pathname);
  }

  return (
    <div className="mx-auto max-w-[1500px] space-y-6 pb-16">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Academic Insights</h1>
            <Badge variant="outline">Deterministic · scoped</Badge>
          </div>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
            Review real student activity within one board, qualification, subject, and date range. Results never combine unrelated academic scopes.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Academic scope</CardTitle>
          <CardDescription>Board, qualification, and subject are required. Topic and challenge are optional.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
            <div className="space-y-2">
              <Label>Board</Label>
              <Select
                value={filters.boardId || null}
                onValueChange={(value) => setFilters((current) => ({
                  ...current,
                  boardId: value ?? "",
                  qualificationId: "",
                  subjectId: "",
                  topicId: "",
                  challengeId: "",
                }))}
              >
                <SelectTrigger className="w-full" aria-label="Select board"><SelectValue placeholder="Select board">{options.boards.find((item) => item.id === filters.boardId)?.label}</SelectValue></SelectTrigger>
                <SelectContent>{options.boards.map((item) => <SelectItem key={item.id} value={item.id}>{item.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Qualification / Class</Label>
              <Select
                value={filters.qualificationId || null}
                disabled={!filters.boardId}
                onValueChange={(value) => setFilters((current) => ({
                  ...current,
                  qualificationId: value ?? "",
                  subjectId: "",
                  topicId: "",
                  challengeId: "",
                }))}
              >
                <SelectTrigger className="w-full" aria-label="Select qualification"><SelectValue placeholder="Select class">{qualifications.find((item) => item.id === filters.qualificationId)?.label}</SelectValue></SelectTrigger>
                <SelectContent>{qualifications.map((item) => <SelectItem key={item.id} value={item.id}>{item.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Subject</Label>
              <Select
                value={filters.subjectId || null}
                disabled={!filters.qualificationId}
                onValueChange={(value) => setFilters((current) => ({
                  ...current,
                  subjectId: value ?? "",
                  topicId: "",
                  challengeId: "",
                }))}
              >
                <SelectTrigger className="w-full" aria-label="Select subject"><SelectValue placeholder="Select subject">{subjects.find((item) => item.id === filters.subjectId)?.label}</SelectValue></SelectTrigger>
                <SelectContent>{subjects.map((item) => <SelectItem key={item.id} value={item.id}>{item.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Topic <span className="font-normal text-muted-foreground">optional</span></Label>
              <Select
                value={filters.topicId || ALL_OPTION}
                disabled={!filters.subjectId}
                onValueChange={(value) => setFilters((current) => ({
                  ...current,
                  topicId: value === ALL_OPTION || !value ? "" : value,
                  challengeId: "",
                }))}
              >
                <SelectTrigger className="w-full" aria-label="Select topic"><SelectValue>{topics.find((item) => item.id === filters.topicId)?.label || "All topics"}</SelectValue></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_OPTION}>All topics</SelectItem>
                  {topics.map((item) => <SelectItem key={item.id} value={item.id}>{item.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Challenge <span className="font-normal text-muted-foreground">optional</span></Label>
              <Select
                value={filters.challengeId || ALL_OPTION}
                disabled={!filters.subjectId}
                onValueChange={(value) => setFilters((current) => ({
                  ...current,
                  challengeId: value === ALL_OPTION || !value ? "" : value,
                }))}
              >
                <SelectTrigger className="w-full" aria-label="Select challenge"><SelectValue>{challenges.find((item) => item.id === filters.challengeId)?.label || "All challenges"}</SelectValue></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_OPTION}>All challenges</SelectItem>
                  {challenges.map((item) => <SelectItem key={item.id} value={item.id}>{item.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Date range</Label>
              <Select
                value={filters.dateRange}
                onValueChange={(value) => setFilters((current) => ({
                  ...current,
                  dateRange: value === "30" ? "30" : "7",
                }))}
              >
                <SelectTrigger className="w-full" aria-label="Select date range"><SelectValue>{filters.dateRange === "30" ? "Last 30 days" : "Last 7 days"}</SelectValue></SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={applyFilters} disabled={!canApply}>View insights</Button>
            <Button variant="outline" onClick={resetFilters}><RefreshCw className="size-4" /> Reset</Button>
            <p className="text-xs text-muted-foreground">Only published global Practice Challenges and Quick Practice are included.</p>
          </div>
        </CardContent>
      </Card>

      {scopeError ? (
        <Card className="border-destructive/40">
          <CardContent className="flex gap-3 p-5 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <div><p className="font-semibold">Invalid academic scope</p><p className="mt-1">{scopeError}</p></div>
          </CardContent>
        </Card>
      ) : !insights ? (
        <EmptyState
          title="Select board, class, and subject to view insights"
          description="The page will show only students with activity in the selected scope and date range. No cross-board or cross-subject totals are shown."
        />
      ) : (
        <InsightsResults insights={insights} />
      )}
    </div>
  );
}

function InsightsResults({ insights }: { insights: ScopedTeachingInsights }) {
  const title = insights.scope.dateRange === "7" ? "Weekly Report Preview" : "Performance Summary";
  const hasAttempts = insights.overview.totalAttempts > 0;

  return (
    <div className="space-y-6">
      <Card className="bg-muted/25">
        <CardContent className="flex flex-wrap items-center gap-2 p-4 text-sm">
          <Badge>{insights.scope.boardLabel}</Badge>
          <span className="text-muted-foreground">/</span>
          <Badge variant="outline">{insights.scope.qualificationLabel}</Badge>
          <span className="text-muted-foreground">/</span>
          <Badge variant="outline">{insights.scope.subjectLabel}</Badge>
          {insights.scope.topicLabel && <Badge variant="outline">{insights.scope.topicLabel}</Badge>}
          {insights.scope.challengeLabel && <Badge variant="outline">{insights.scope.challengeLabel}</Badge>}
          <span className="ml-auto text-xs text-muted-foreground">
            {formatDate(insights.dateStart)} – {formatDate(insights.dateEnd)}
          </span>
        </CardContent>
      </Card>

      {insights.warnings.length > 0 && (
        <div className="space-y-2">
          {insights.warnings.map((warning) => (
            <div key={warning} className="flex gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" /> {warning}
            </div>
          ))}
        </div>
      )}

      <section>
        <h2 className="mb-3 text-lg font-semibold">Scoped overview</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <MetricCard label="Active participants" value={insights.overview.activeParticipants} note="Students with activity in this scope" icon={Users} />
          <MetricCard label="Total attempts" value={insights.overview.totalAttempts} note="Completed attempts in selected range" icon={Trophy} />
          <MetricCard label="Average score" value={formatScore(insights.overview.averageScore)} note="Average of scoped attempts" icon={Target} />
          <MetricCard label="Wrong / unanswered" value={insights.overview.wrongOrUnanswered} note="Reconstructed from attempt answers" icon={AlertTriangle} />
          <MetricCard label="Help requests" value={insights.overview.helpRequests} note="Relationally scoped Ask Teacher requests" icon={CircleHelp} />
          <MetricCard label="Weak topics" value={insights.overview.weakTopics} note="Requires at least two attempts" icon={BookOpen} />
        </div>
      </section>

      {!hasAttempts && (
        <EmptyState
          title="No attempts found for this scope"
          description={insights.overview.helpRequests > 0
            ? "Help requests are shown, but there are no eligible published global challenge attempts in this date range."
            : "Try a wider date range or remove the optional topic or challenge filter."}
        />
      )}

      <StudentPerformanceSection insights={insights} />
      <HelpRequestsSection insights={insights} />
      <AttentionSection insights={insights} />
      <TopicSection insights={insights} />
      <ChallengeSection insights={insights} />
      <ReportPreview title={title} insights={insights} />
    </div>
  );
}

function HelpRequestsSection({ insights }: { insights: ScopedTeachingInsights }) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold">Help requests</h2>
        <p className="text-sm text-muted-foreground">
          Student questions matching this exact academic scope and date range.
        </p>
      </div>
      {insights.helpRequests.length === 0 ? (
        <EmptyState
          title="No help requests in this scope"
          description="Try a wider date range or remove an optional topic or challenge filter."
        />
      ) : (
        <>
          <div className="grid gap-3 md:hidden">
            {insights.helpRequests.map((request) => (
              <Card key={request.id}>
                <CardContent className="space-y-4 p-4">
                  <div>
                    <p className="font-semibold">{request.studentName}</p>
                    <p className="break-all text-xs text-muted-foreground">{request.studentEmail}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{request.subjectName}</Badge>
                    <Badge variant="outline">{request.topicName}</Badge>
                  </div>
                  <p className="whitespace-pre-wrap break-words text-sm leading-6">{request.message}</p>
                  <p className="text-xs text-muted-foreground">Asked {formatDate(request.createdAt)}</p>
                  <Button
                    nativeButton={false}
                    variant="outline"
                    className="w-full"
                    render={<Link href={`/admin/users/${request.userId}/performance`} />}
                  >
                    View all-time performance
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card className="hidden overflow-hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Subject / topic</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {insights.helpRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <p className="font-medium">{request.studentName}</p>
                      <p className="max-w-52 truncate text-xs text-muted-foreground">{request.studentEmail}</p>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{request.subjectName}</p>
                      <p className="text-xs text-muted-foreground">{request.topicName}</p>
                    </TableCell>
                    <TableCell className="max-w-md whitespace-normal">
                      <p className="line-clamp-3 break-words text-sm leading-5">{request.message}</p>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{formatDate(request.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        nativeButton={false}
                        variant="outline"
                        size="sm"
                        render={<Link href={`/admin/users/${request.userId}/performance`} />}
                      >
                        View all-time performance
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </>
      )}
    </section>
  );
}

function StudentPerformanceSection({ insights }: { insights: ScopedTeachingInsights }) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold">Student performance</h2>
        <p className="text-sm text-muted-foreground">Students with attempts or help requests in this exact scope and date range.</p>
      </div>
      {insights.students.length === 0 ? (
        <EmptyState title="No students with activity in this scope" description="Phase 1 does not infer inactive students without a reliable scoped roster." />
      ) : (
        <>
          <div className="grid gap-3 md:hidden">
            {insights.students.map((student) => (
              <Card key={student.userId}>
                <CardContent className="space-y-3 p-4">
                  <div><p className="font-semibold">{student.name}</p><p className="break-all text-xs text-muted-foreground">{student.email}</p></div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><p className="text-xs text-muted-foreground">Attempts</p><p className="font-medium">{student.attempts}</p></div>
                    <div><p className="text-xs text-muted-foreground">Average</p><p className="font-medium">{formatScore(student.averageScore)}</p></div>
                    <div><p className="text-xs text-muted-foreground">Best topic</p><p className="font-medium">{student.bestTopic}</p></div>
                    <div><p className="text-xs text-muted-foreground">Weak topic</p><p className="font-medium">{student.weakTopic}</p></div>
                    <div><p className="text-xs text-muted-foreground">Wrong / unanswered</p><p className="font-medium">{student.wrongOrUnanswered}</p></div>
                    <div><p className="text-xs text-muted-foreground">Last active</p><p className="font-medium">{formatDate(student.lastActive)}</p></div>
                  </div>
                  <Button nativeButton={false} variant="outline" className="w-full" render={<Link href={`/admin/users/${student.userId}/performance`} />}>View all-time performance</Button>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card className="hidden overflow-hidden md:block">
            <Table>
              <TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Attempts</TableHead><TableHead>Average</TableHead><TableHead>Best topic</TableHead><TableHead>Weak topic</TableHead><TableHead>Wrong / unanswered</TableHead><TableHead>Last active</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
              <TableBody>
                {insights.students.map((student) => (
                  <TableRow key={student.userId}>
                    <TableCell><p className="font-medium">{student.name}</p><p className="max-w-52 truncate text-xs text-muted-foreground">{student.email}</p></TableCell>
                    <TableCell>{student.attempts}</TableCell>
                    <TableCell>{formatScore(student.averageScore)}</TableCell>
                    <TableCell>{student.bestTopic}</TableCell>
                    <TableCell>{student.weakTopic}</TableCell>
                    <TableCell>{student.wrongOrUnanswered}</TableCell>
                    <TableCell>{formatDate(student.lastActive)}</TableCell>
                    <TableCell className="text-right"><Button nativeButton={false} variant="outline" size="sm" render={<Link href={`/admin/users/${student.userId}/performance`} />}>View all-time performance</Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </>
      )}
    </section>
  );
}

function AttentionSection({ insights }: { insights: ScopedTeachingInsights }) {
  return (
    <section className="space-y-3">
      <div><h2 className="text-lg font-semibold">Students needing attention</h2><p className="text-sm text-muted-foreground">Transparent rules only; no inactivity claims without a roster.</p></div>
      {insights.attention.length === 0 ? (
        <Card><CardContent className="p-6 text-sm text-muted-foreground">No attention rule was triggered. This does not imply that every student is performing well; the selected range may have limited data.</CardContent></Card>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
          {insights.attention.map((student) => (
            <Card key={student.userId} className="border-amber-500/30">
              <CardHeader className="pb-3"><CardTitle className="text-base">{student.name}</CardTitle><CardDescription>{student.email}</CardDescription></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2"><Badge variant="outline">{student.attempts} attempts</Badge><Badge variant="outline">{formatScore(student.averageScore)} average</Badge><Badge variant="outline">{student.wrongOrUnanswered} missed</Badge></div>
                <ul className="space-y-1.5 text-sm">{student.reasons.map((reason) => <li key={reason} className="flex gap-2"><AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-500" />{reason}</li>)}</ul>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}

function TopicSection({ insights }: { insights: ScopedTeachingInsights }) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold">Topic intelligence</h2>
        <p className="text-sm text-muted-foreground">
          Uses relational challenge topics only. A topic needs at least 2 scoped attempts before Vexa marks it as strong or weak.
        </p>
      </div>
      {insights.topics.length === 0 ? <Card><CardContent className="p-6 text-sm text-muted-foreground">Not enough data to identify topic performance.</CardContent></Card> : (
        <Card className="overflow-hidden"><Table><TableHeader><TableRow><TableHead>Topic</TableHead><TableHead>Attempts</TableHead><TableHead>Average</TableHead><TableHead>Wrong / unanswered</TableHead><TableHead>Students affected</TableHead><TableHead>Suggested action</TableHead></TableRow></TableHeader><TableBody>
          {insights.topics.map((topic) => <TableRow key={topic.topicId ?? "unassigned"}><TableCell><div className="flex items-center gap-2"><span className="font-medium">{topic.topicName}</span>{!topic.sufficientData && <Badge variant="outline">Insufficient data</Badge>}</div></TableCell><TableCell>{topic.attempts}</TableCell><TableCell>{formatScore(topic.averageScore)}</TableCell><TableCell>{topic.wrongOrUnanswered}</TableCell><TableCell>{topic.affectedStudents}</TableCell><TableCell className="max-w-sm whitespace-normal">{topic.suggestedAction}</TableCell></TableRow>)}
        </TableBody></Table></Card>
      )}
    </section>
  );
}

function ChallengeSection({ insights }: { insights: ScopedTeachingInsights }) {
  return (
    <section className="space-y-3">
      <div><h2 className="text-lg font-semibold">Challenge intelligence</h2><p className="text-sm text-muted-foreground">Published global Practice Challenges and Quick Practice only.</p></div>
      {insights.challenges.length === 0 ? <Card><CardContent className="p-6 text-sm text-muted-foreground">No challenge attempts found in this range.</CardContent></Card> : (
        <Card className="overflow-hidden"><Table><TableHeader><TableRow><TableHead>Challenge</TableHead><TableHead>Topic</TableHead><TableHead>Attempts</TableHead><TableHead>Average</TableHead><TableHead>Low-performing students</TableHead><TableHead>Wrong / unanswered</TableHead></TableRow></TableHeader><TableBody>
          {insights.challenges.map((challenge) => <TableRow key={challenge.challengeId}><TableCell className="font-medium">{challenge.challengeTitle}</TableCell><TableCell>{challenge.topicName}</TableCell><TableCell>{challenge.attempts}</TableCell><TableCell>{formatScore(challenge.averageScore)}</TableCell><TableCell>{challenge.lowPerformingStudents}</TableCell><TableCell>{challenge.wrongOrUnanswered}</TableCell></TableRow>)}
        </TableBody></Table></Card>
      )}
    </section>
  );
}

function ReportPreview({ title, insights }: { title: string; insights: ScopedTeachingInsights }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2"><CalendarDays className="size-5 text-primary" /><div><h2 className="text-lg font-semibold">{title}</h2><p className="text-sm text-muted-foreground">On-screen deterministic summary; no PDF, email, or saved report is created.</p></div></div>
      {insights.students.length === 0 ? <Card><CardContent className="p-6 text-sm text-muted-foreground">No student activity is available for a report preview.</CardContent></Card> : (
        <div className="grid gap-3 lg:grid-cols-2">
          {insights.students.map((student) => (
            <Card key={student.userId}>
              <CardHeader className="pb-3"><CardTitle className="text-base">{student.name}</CardTitle><CardDescription>{student.email}</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4"><div><p className="text-xs text-muted-foreground">Attempts</p><p className="font-semibold">{student.attempts}</p></div><div><p className="text-xs text-muted-foreground">Average</p><p className="font-semibold">{formatScore(student.averageScore)}</p></div><div><p className="text-xs text-muted-foreground">Missed</p><p className="font-semibold">{student.wrongOrUnanswered}</p></div><div><p className="text-xs text-muted-foreground">Help requests</p><p className="font-semibold">{student.helpRequests}</p></div></div>
                <div className="grid gap-3 text-sm sm:grid-cols-2"><div><p className="text-xs text-muted-foreground">Strongest topic</p><p className="font-medium">{student.bestTopic}</p></div><div><p className="text-xs text-muted-foreground">Weakest topic</p><p className="font-medium">{student.weakTopic}</p></div></div>
                <div className="rounded-lg bg-muted/50 p-3 text-sm"><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Suggested revision</p><p className="mt-1 font-medium">{student.suggestedRevision}</p><p className="mt-2 text-xs text-muted-foreground">Last active {formatDate(student.lastActive)}</p></div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
