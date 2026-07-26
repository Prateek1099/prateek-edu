"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Archive,
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  FileQuestion,
  FileText,
  Loader2,
  MoreHorizontal,
  Printer,
  Search,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import {
  deleteWorksheet,
  setWorksheetPublished,
} from "@/app/actions/admin";
import { useAdminBoard } from "@/components/AdminBoardContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type WorksheetRow = {
  id: string;
  title: string;
  type: string;
  isPublished: boolean;
  pdfUrl: string | null;
  pdfAnswerUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
  subject: {
    id: string;
    name: string;
    code: string | null;
    qualification: {
      title: string;
      board: {
        name: string;
        title: string;
      };
    };
  };
  topic: { topicName: string } | null;
  _count: {
    questions: number;
    assignments: number;
    attempts: number;
    mistakes: number;
  };
};

type WorksheetTypeFilter = "all" | "generated" | "pdf";
type WorksheetStatusFilter = "all" | "published" | "draft";

function safeDocumentUrl(value: string | null) {
  if (!value) return null;
  if (value.startsWith("/") && !value.startsWith("//")) return value;

  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? value : null;
  } catch {
    return null;
  }
}

function hasStudentHistory(worksheet: WorksheetRow) {
  return (
    worksheet._count.assignments > 0 ||
    worksheet._count.attempts > 0 ||
    worksheet._count.mistakes > 0
  );
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function WorksheetTypeBadge({ type }: { type: string }) {
  const isPdf = type === "PDF_WORKSHEET";
  return (
    <Badge
      variant="outline"
      className={
        isPdf
          ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
          : "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300"
      }
    >
      {isPdf ? "PDF Worksheet" : "Generated MCQ Worksheet"}
    </Badge>
  );
}

function StatusBadge({ published }: { published: boolean }) {
  return published ? (
    <Badge className="bg-emerald-600 text-white">
      <CheckCircle2 className="size-3" />
      Published
    </Badge>
  ) : (
    <Badge variant="secondary">Draft</Badge>
  );
}

export default function AdminWorksheetsClient({
  worksheets,
}: {
  worksheets: WorksheetRow[];
}) {
  const router = useRouter();
  const { selectedBoard } = useAdminBoard();
  const [rows, setRows] = useState(worksheets);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<WorksheetTypeFilter>("all");
  const [statusFilter, setStatusFilter] =
    useState<WorksheetStatusFilter>("all");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<WorksheetRow | null>(null);

  useEffect(() => {
    setRows(worksheets);
  }, [worksheets]);

  const boardRows = useMemo(() => {
    if (selectedBoard === "all") return rows;
    return rows.filter(
      (worksheet) =>
        worksheet.subject.qualification.board.name === selectedBoard,
    );
  }, [rows, selectedBoard]);

  const subjects = useMemo(() => {
    const unique = new Map<string, string>();
    for (const worksheet of boardRows) {
      unique.set(worksheet.subject.id, worksheet.subject.name);
    }
    return Array.from(unique, ([id, name]) => ({ id, name })).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [boardRows]);

  useEffect(() => {
    if (
      subjectFilter !== "all" &&
      !subjects.some((subject) => subject.id === subjectFilter)
    ) {
      setSubjectFilter("all");
    }
  }, [subjectFilter, subjects]);

  const filteredWorksheets = useMemo(() => {
    const query = search.trim().toLowerCase();

    return boardRows.filter((worksheet) => {
      const matchesSearch =
        !query ||
        [
          worksheet.title,
          worksheet.subject.name,
          worksheet.subject.code,
          worksheet.topic?.topicName,
          worksheet.subject.qualification.title,
        ]
          .filter(Boolean)
          .some((value) => value?.toLowerCase().includes(query));
      const matchesType =
        typeFilter === "all" ||
        (typeFilter === "generated" && worksheet.type === "WORKSHEET") ||
        (typeFilter === "pdf" && worksheet.type === "PDF_WORKSHEET");
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "published" && worksheet.isPublished) ||
        (statusFilter === "draft" && !worksheet.isPublished);
      const matchesSubject =
        subjectFilter === "all" || worksheet.subject.id === subjectFilter;

      return matchesSearch && matchesType && matchesStatus && matchesSubject;
    });
  }, [boardRows, search, statusFilter, subjectFilter, typeFilter]);

  const stats = useMemo(
    () => [
      { label: "Total worksheets", value: boardRows.length },
      {
        label: "Published",
        value: boardRows.filter((worksheet) => worksheet.isPublished).length,
      },
      {
        label: "Draft",
        value: boardRows.filter((worksheet) => !worksheet.isPublished).length,
      },
      {
        label: "PDF worksheets",
        value: boardRows.filter(
          (worksheet) => worksheet.type === "PDF_WORKSHEET",
        ).length,
      },
      {
        label: "Generated",
        value: boardRows.filter((worksheet) => worksheet.type === "WORKSHEET")
          .length,
      },
    ],
    [boardRows],
  );

  const updatePublishedState = async (
    worksheet: WorksheetRow,
    isPublished: boolean,
  ) => {
    setBusyId(worksheet.id);
    try {
      const result = await setWorksheetPublished(worksheet.id, isPublished);
      if (!result.success) {
        toast.error(result.error || "Could not update worksheet status.");
        return false;
      }

      setRows((current) =>
        current.map((row) =>
          row.id === worksheet.id ? { ...row, isPublished } : row,
        ),
      );
      toast.success(isPublished ? "Worksheet published" : "Worksheet archived");
      router.refresh();
      return true;
    } catch {
      toast.error("Could not update worksheet status.");
      return false;
    } finally {
      setBusyId(null);
    }
  };

  const handleConfirmedAction = async () => {
    if (!confirming) return;
    const worksheet = confirming;

    if (hasStudentHistory(worksheet)) {
      if (!worksheet.isPublished) {
        setConfirming(null);
        return;
      }
      const archived = await updatePublishedState(worksheet, false);
      if (archived) setConfirming(null);
      return;
    }

    setBusyId(worksheet.id);
    try {
      const result = await deleteWorksheet(worksheet.id);
      if (!result.success) {
        toast.error(result.error || "Could not delete worksheet.");
        return;
      }

      setRows((current) => current.filter((row) => row.id !== worksheet.id));
      setConfirming(null);
      toast.success("Worksheet deleted. Uploaded files were left in storage.");
      router.refresh();
    } catch {
      toast.error("Could not delete worksheet.");
    } finally {
      setBusyId(null);
    }
  };

  const openDocument = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const renderMoreMenu = (worksheet: WorksheetRow) => {
    const questionsUrl = safeDocumentUrl(worksheet.pdfUrl);
    const answersUrl = safeDocumentUrl(worksheet.pdfAnswerUrl);

    return (
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="outline"
              size="icon"
              aria-label={`More actions for ${worksheet.title}`}
              disabled={busyId === worksheet.id}
            />
          }
        >
          {busyId === worksheet.id ? (
            <Loader2 className="animate-spin" />
          ) : (
            <MoreHorizontal />
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuLabel>
            {worksheet.type === "PDF_WORKSHEET"
              ? "PDF worksheet"
              : "Generated worksheet"}
          </DropdownMenuLabel>
          {worksheet.type === "PDF_WORKSHEET" ? (
            <>
              <DropdownMenuItem
                disabled={!questionsUrl}
                onClick={() => questionsUrl && openDocument(questionsUrl)}
              >
                <ExternalLink /> Open Questions PDF
              </DropdownMenuItem>
              {answersUrl && (
                <DropdownMenuItem onClick={() => openDocument(answersUrl)}>
                  <FileText /> View Solutions
                </DropdownMenuItem>
              )}
            </>
          ) : (
            <DropdownMenuItem
              render={
                <Link href={`/admin/worksheets/${worksheet.id}/print`} />
              }
            >
              <Printer /> Print Worksheet
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() =>
              void updatePublishedState(worksheet, !worksheet.isPublished)
            }
          >
            {worksheet.isPublished ? <Archive /> : <CheckCircle2 />}
            {worksheet.isPublished ? "Unpublish / archive" : "Publish"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setConfirming(worksheet)}
          >
            {hasStudentHistory(worksheet) ? <Archive /> : <Trash2 />}
            {hasStudentHistory(worksheet) ? "Archive safely" : "Delete"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  const primaryDocumentAction = (worksheet: WorksheetRow) => {
    if (worksheet.type === "PDF_WORKSHEET") {
      const questionsUrl = safeDocumentUrl(worksheet.pdfUrl);
      return (
        <Button
          variant="outline"
          disabled={!questionsUrl || busyId === worksheet.id}
          onClick={() => questionsUrl && openDocument(questionsUrl)}
        >
          <ExternalLink />
          Open Questions PDF
        </Button>
      );
    }

    return (
      <Button
        variant="outline"
        render={<Link href={`/admin/worksheets/${worksheet.id}/print`} />}
      >
        <Printer />
        Print Worksheet
      </Button>
    );
  };

  const hasActiveFilters =
    search.trim() ||
    typeFilter !== "all" ||
    statusFilter !== "all" ||
    subjectFilter !== "all";

  return (
    <div className="space-y-6">
      <section
        aria-label="Worksheet summary"
        className="grid overflow-hidden rounded-xl border bg-card shadow-sm sm:grid-cols-2 lg:grid-cols-5"
      >
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="border-t px-4 py-4 first:border-t-0 sm:border-t-0 sm:even:border-l sm:[&:nth-child(n+3)]:border-t lg:border-t-0 lg:border-l lg:first:border-l-0"
          >
            <p className="text-xs font-medium text-muted-foreground">
              {stat.label}
            </p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">
              {stat.value}
            </p>
          </div>
        ))}
      </section>

      <section className="rounded-xl border bg-card p-3 shadow-sm">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(240px,1fr)_180px_180px_220px]">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search title, subject, or topic"
              className="pl-9"
              aria-label="Search worksheets"
            />
          </div>
          <Select
            value={typeFilter}
            onValueChange={(value) =>
              setTypeFilter((value || "all") as WorksheetTypeFilter)
            }
          >
            <SelectTrigger
              aria-label="Filter by worksheet type"
              className="w-full"
            >
              <SelectValue>
                {typeFilter === "all"
                  ? "All types"
                  : typeFilter === "generated"
                    ? "Generated"
                    : "PDF"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="generated">Generated</SelectItem>
              <SelectItem value="pdf">PDF</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={statusFilter}
            onValueChange={(value) =>
              setStatusFilter((value || "all") as WorksheetStatusFilter)
            }
          >
            <SelectTrigger
              aria-label="Filter by publish status"
              className="w-full"
            >
              <SelectValue>
                {statusFilter === "all"
                  ? "All statuses"
                  : statusFilter === "published"
                    ? "Published"
                    : "Draft"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={subjectFilter}
            onValueChange={(value) => setSubjectFilter(value || "all")}
          >
            <SelectTrigger
              aria-label="Filter by subject"
              className="w-full"
            >
              <SelectValue placeholder="All subjects">
                {subjectFilter === "all"
                  ? "All subjects"
                  : subjects.find((subject) => subject.id === subjectFilter)
                      ?.name}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All subjects</SelectItem>
              {subjects.map((subject) => (
                <SelectItem key={subject.id} value={subject.id}>
                  {subject.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </section>

      {filteredWorksheets.length === 0 ? (
        <section className="rounded-xl border border-dashed bg-card px-6 py-16 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted">
            <FileQuestion className="size-6 text-muted-foreground" />
          </div>
          <h2 className="mt-4 text-lg font-semibold">
            {hasActiveFilters ? "No matching worksheets" : "No worksheets yet"}
          </h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            {hasActiveFilters
              ? "Adjust the search or filters to see more worksheets."
              : "Create a generated worksheet or upload a PDF worksheet to get started."}
          </p>
          {!hasActiveFilters && (
            <Button
              className="mt-5"
              render={<Link href="/admin/worksheets/create" />}
            >
              Create Worksheet
            </Button>
          )}
        </section>
      ) : (
        <>
          <section className="hidden overflow-hidden rounded-xl border bg-card shadow-sm xl:block">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b bg-muted/50 text-xs text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Worksheet</th>
                    <th className="px-4 py-3 font-medium">Subject</th>
                    <th className="px-4 py-3 font-medium">Content</th>
                    <th className="px-4 py-3 font-medium">Reach</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Updated</th>
                    <th className="px-4 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredWorksheets.map((worksheet) => (
                    <tr key={worksheet.id} className="hover:bg-muted/30">
                      <td className="max-w-72 px-4 py-4">
                        <p className="truncate font-medium">{worksheet.title}</p>
                        <div className="mt-1.5">
                          <WorksheetTypeBadge type={worksheet.type} />
                        </div>
                      </td>
                      <td className="max-w-60 px-4 py-4 text-muted-foreground">
                        <p className="truncate text-foreground">
                          {worksheet.subject.name}
                        </p>
                        <p className="mt-0.5 truncate text-xs">
                          {worksheet.topic?.topicName ||
                            worksheet.subject.qualification.title}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        {worksheet.type === "PDF_WORKSHEET"
                          ? "Questions PDF"
                          : `${worksheet._count.questions} questions`}
                      </td>
                      <td className="px-4 py-4 text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5">
                          <Users className="size-3.5" />
                          {worksheet._count.assignments} assigned
                        </span>
                        {worksheet._count.attempts > 0 && (
                          <p className="mt-1 text-xs">
                            {worksheet._count.attempts} historical attempts
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge published={worksheet.isPublished} />
                      </td>
                      <td className="px-4 py-4 text-muted-foreground">
                        {formatDate(worksheet.updatedAt)}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant={
                              worksheet.isPublished ? "secondary" : "default"
                            }
                            disabled={busyId === worksheet.id}
                            onClick={() =>
                              void updatePublishedState(
                                worksheet,
                                !worksheet.isPublished,
                              )
                            }
                          >
                            {busyId === worksheet.id ? (
                              <Loader2 className="animate-spin" />
                            ) : worksheet.isPublished ? (
                              <Archive />
                            ) : (
                              <CheckCircle2 />
                            )}
                            {worksheet.isPublished ? "Unpublish" : "Publish"}
                          </Button>
                          {renderMoreMenu(worksheet)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="grid gap-4 xl:hidden sm:grid-cols-2">
            {filteredWorksheets.map((worksheet) => (
              <article
                key={worksheet.id}
                className="flex flex-col rounded-xl border bg-card p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="font-semibold leading-snug">
                      {worksheet.title}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {worksheet.subject.name}
                      {worksheet.topic
                        ? ` · ${worksheet.topic.topicName}`
                        : ""}
                    </p>
                  </div>
                  {renderMoreMenu(worksheet)}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <WorksheetTypeBadge type={worksheet.type} />
                  <StatusBadge published={worksheet.isPublished} />
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 border-y py-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Content</p>
                    <p className="mt-1 font-medium">
                      {worksheet.type === "PDF_WORKSHEET"
                        ? "Questions PDF"
                        : `${worksheet._count.questions} questions`}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Assignments</p>
                    <p className="mt-1 font-medium">
                      {worksheet._count.assignments} students
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CalendarDays className="size-3.5" />
                  Updated {formatDate(worksheet.updatedAt)}
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {primaryDocumentAction(worksheet)}
                  <Button
                    variant={
                      worksheet.isPublished ? "secondary" : "default"
                    }
                    disabled={busyId === worksheet.id}
                    onClick={() =>
                      void updatePublishedState(
                        worksheet,
                        !worksheet.isPublished,
                      )
                    }
                  >
                    {busyId === worksheet.id ? (
                      <Loader2 className="animate-spin" />
                    ) : worksheet.isPublished ? (
                      <Archive />
                    ) : (
                      <CheckCircle2 />
                    )}
                    {worksheet.isPublished ? "Unpublish" : "Publish"}
                  </Button>
                </div>
              </article>
            ))}
          </section>
        </>
      )}

      <Dialog
        open={Boolean(confirming)}
        onOpenChange={(open) => {
          if (!open && !busyId) setConfirming(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirming && hasStudentHistory(confirming)
                ? "Archive this worksheet?"
                : "Delete this worksheet permanently?"}
            </DialogTitle>
            <DialogDescription>
              {confirming && hasStudentHistory(confirming)
                ? "This worksheet has student activity or assignments. Archive it instead of deleting."
                : "This removes the worksheet record and its generated questions. This action cannot be undone."}
            </DialogDescription>
          </DialogHeader>

          {confirming && (
            <div className="rounded-lg border bg-muted/40 p-3">
              <p className="font-medium">{confirming.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {confirming.type === "PDF_WORKSHEET"
                  ? "PDF Worksheet"
                  : "Generated MCQ Worksheet"}
              </p>
              <dl className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                <div>
                  <dt className="text-muted-foreground">Assignments</dt>
                  <dd className="mt-1 font-semibold">
                    {confirming._count.assignments}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Attempts</dt>
                  <dd className="mt-1 font-semibold">
                    {confirming._count.attempts}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Mistakes</dt>
                  <dd className="mt-1 font-semibold">
                    {confirming._count.mistakes}
                  </dd>
                </div>
              </dl>
            </div>
          )}

          {confirming && !hasStudentHistory(confirming) && (
            <p className="text-xs text-muted-foreground">
              Uploaded question and solution PDF files will remain in storage;
              this action does not delete them.
            </p>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              disabled={busyId === confirming?.id}
              onClick={() => setConfirming(null)}
            >
              Cancel
            </Button>
            {confirming &&
              (!hasStudentHistory(confirming) || confirming.isPublished) && (
                <Button
                  variant={
                    hasStudentHistory(confirming) ? "secondary" : "destructive"
                  }
                  disabled={busyId === confirming.id}
                  onClick={() => void handleConfirmedAction()}
                >
                  {busyId === confirming.id ? (
                    <Loader2 className="animate-spin" />
                  ) : hasStudentHistory(confirming) ? (
                    <Archive />
                  ) : (
                    <Trash2 />
                  )}
                  {hasStudentHistory(confirming)
                    ? "Archive worksheet"
                    : "Delete permanently"}
                </Button>
              )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
