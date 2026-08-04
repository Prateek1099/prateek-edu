"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpenCheck,
  Eye,
  EyeOff,
  FileQuestion,
  FilterX,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import { useAdminBoard } from "@/components/AdminBoardContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

import {
  createTopicalQuestion,
  deleteTopicalQuestion,
  toggleTopicalQuestionPublished,
  updateTopicalQuestion,
} from "./actions";

type TopicOption = { id: string; topicName: string };

type SubjectOption = {
  id: string;
  name: string;
  code: string | null;
  boardName: string;
  boardTitle: string;
  qualificationId: string;
  qualificationTitle: string;
  topics: TopicOption[];
};

type TopicalRow = {
  id: string;
  title: string;
  description: string | null;
  subjectId: string;
  topicId: string | null;
  questionsPdfUrl: string;
  answersPdfUrl: string | null;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
  subject: {
    id: string;
    name: string;
    code: string | null;
    qualification: {
      id: string;
      title: string;
      board: { id: string; name: string; title: string };
    };
  };
  topic: TopicOption | null;
};

const ALL = "all";
const NO_TOPIC = "none";
const MAX_PDF_BYTES = 25 * 1024 * 1024;

function resourceProxyUrl(id: string, document: "questions" | "solutions") {
  return `/api/protected/pdf?topicalId=${encodeURIComponent(id)}&document=${document}`;
}

export default function AdminTopicalQuestionsClient({
  resources,
  subjects,
}: {
  resources: TopicalRow[];
  subjects: SubjectOption[];
}) {
  const router = useRouter();
  const { selectedBoard } = useAdminBoard();
  const [search, setSearch] = useState("");
  const [qualificationFilter, setQualificationFilter] = useState(ALL);
  const [subjectFilter, setSubjectFilter] = useState(ALL);
  const [topicFilter, setTopicFilter] = useState(ALL);
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "draft">("all");
  const [editorOpen, setEditorOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<TopicalRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const boardSubjects = useMemo(
    () => subjects.filter((subject) => selectedBoard === ALL || subject.boardName === selectedBoard),
    [selectedBoard, subjects],
  );
  const qualificationOptions = useMemo(() => {
    const byId = new Map<string, string>();
    boardSubjects.forEach((subject) => byId.set(subject.qualificationId, subject.qualificationTitle));
    return Array.from(byId, ([id, title]) => ({ id, title }));
  }, [boardSubjects]);
  const filterSubjects = useMemo(
    () => boardSubjects.filter((subject) => qualificationFilter === ALL || subject.qualificationId === qualificationFilter),
    [boardSubjects, qualificationFilter],
  );
  const filterTopics = useMemo(() => {
    if (subjectFilter === ALL) return [];
    return subjects.find((subject) => subject.id === subjectFilter)?.topics ?? [];
  }, [subjectFilter, subjects]);

  const filteredResources = useMemo(() => {
    const query = search.trim().toLowerCase();
    return resources.filter((resource) => {
      if (selectedBoard !== ALL && resource.subject.qualification.board.name !== selectedBoard) return false;
      if (qualificationFilter !== ALL && resource.subject.qualification.id !== qualificationFilter) return false;
      if (subjectFilter !== ALL && resource.subjectId !== subjectFilter) return false;
      if (topicFilter !== ALL && resource.topicId !== topicFilter) return false;
      if (statusFilter === "published" && !resource.isPublished) return false;
      if (statusFilter === "draft" && resource.isPublished) return false;
      if (!query) return true;
      return `${resource.title} ${resource.description ?? ""} ${resource.subject.name} ${resource.subject.code ?? ""} ${resource.topic?.topicName ?? ""}`
        .toLowerCase()
        .includes(query);
    });
  }, [qualificationFilter, resources, search, selectedBoard, statusFilter, subjectFilter, topicFilter]);

  const clearFilters = () => {
    setSearch("");
    setQualificationFilter(ALL);
    setSubjectFilter(ALL);
    setTopicFilter(ALL);
    setStatusFilter("all");
  };

  const openCreate = () => {
    setSelected(null);
    setEditorOpen(true);
  };

  const openEdit = (resource: TopicalRow) => {
    setSelected(resource);
    setEditorOpen(true);
  };

  const togglePublished = async (resource: TopicalRow) => {
    setBusyId(resource.id);
    const result = await toggleTopicalQuestionPublished(resource.id);
    setBusyId(null);
    if (!result.success) return toast.error(result.error);
    toast.success(resource.isPublished ? "Moved to draft" : "Published for students");
    router.refresh();
  };

  const confirmDelete = async () => {
    if (!selected) return;
    setBusy(true);
    const result = await deleteTopicalQuestion(selected.id);
    setBusy(false);
    if (!result.success) return toast.error(result.error);
    toast.success("Topical resource deleted");
    setDeleteOpen(false);
    setSelected(null);
    router.refresh();
  };

  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-primary">
            <FileQuestion className="size-4" />
            Student resources
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Topical Questions</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
            Publish chapter-wise question packs with an optional answers or mark-scheme PDF.
          </p>
        </div>
        <Button type="button" size="lg" className="h-11 gap-2" onClick={openCreate} disabled={subjects.length === 0}>
          <Plus className="size-4" /> Create topical resource
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Resource library</CardTitle>
          <CardDescription>
            The global board selector also filters this page. Narrow results further below.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <div className="relative xl:col-span-2">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search title, subject, or topic…"
                className="h-10 pl-9"
                aria-label="Search topical questions"
              />
            </div>
            <Select
              value={qualificationFilter}
              onValueChange={(value) => {
                setQualificationFilter(value ?? ALL);
                setSubjectFilter(ALL);
                setTopicFilter(ALL);
              }}
            >
              <SelectTrigger className="h-10 w-full"><SelectValue placeholder="All qualifications" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All qualifications</SelectItem>
                {qualificationOptions.map((option) => <SelectItem key={option.id} value={option.id}>{option.title}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select
              value={subjectFilter}
              onValueChange={(value) => {
                setSubjectFilter(value ?? ALL);
                setTopicFilter(ALL);
              }}
            >
              <SelectTrigger className="h-10 w-full"><SelectValue placeholder="All subjects" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All subjects</SelectItem>
                {filterSubjects.map((subject) => (
                  <SelectItem key={subject.id} value={subject.id}>{subject.name}{subject.code ? ` (${subject.code})` : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter((value ?? "all") as typeof statusFilter)}>
              <SelectTrigger className="h-10 w-full"><SelectValue placeholder="All statuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {subjectFilter !== ALL && filterTopics.length > 0 && (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Select value={topicFilter} onValueChange={(value) => setTopicFilter(value ?? ALL)}>
                <SelectTrigger className="h-10 w-full sm:max-w-sm"><SelectValue placeholder="All topics" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All topics</SelectItem>
                  {filterTopics.map((topic) => <SelectItem key={topic.id} value={topic.id}>{topic.topicName}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button type="button" variant="ghost" className="h-10 gap-2 sm:w-auto" onClick={clearFilters}>
                <FilterX className="size-4" /> Clear filters
              </Button>
            </div>
          )}
          {subjectFilter === ALL && (search || qualificationFilter !== ALL || statusFilter !== "all") && (
            <Button type="button" variant="ghost" className="h-10 gap-2" onClick={clearFilters}>
              <FilterX className="size-4" /> Clear filters
            </Button>
          )}
        </CardContent>

        <div className="hidden overflow-x-auto border-t md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Resource</TableHead>
                <TableHead>Subject & topic</TableHead>
                <TableHead>Documents</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredResources.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="h-36 text-center text-muted-foreground">No topical resources match these filters.</TableCell></TableRow>
              ) : filteredResources.map((resource) => (
                <TableRow key={resource.id}>
                  <TableCell className="max-w-sm">
                    <p className="font-medium text-foreground">{resource.title}</p>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{resource.description || "No description"}</p>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm font-medium">{resource.subject.name}{resource.subject.code ? ` (${resource.subject.code})` : ""}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{resource.topic?.topicName || "Whole subject"}</p>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      <a href={resourceProxyUrl(resource.id, "questions")} target="_blank" rel="noreferrer" className="text-xs font-medium text-primary hover:underline">Questions PDF</a>
                      {resource.answersPdfUrl && <a href={resourceProxyUrl(resource.id, "solutions")} target="_blank" rel="noreferrer" className="text-xs font-medium text-primary hover:underline">Solutions PDF</a>}
                    </div>
                  </TableCell>
                  <TableCell><Badge variant={resource.isPublished ? "default" : "secondary"}>{resource.isPublished ? "Published" : "Draft"}</Badge></TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button type="button" variant="ghost" size="icon" onClick={() => void togglePublished(resource)} disabled={busyId === resource.id} aria-label={resource.isPublished ? `Unpublish ${resource.title}` : `Publish ${resource.title}`}>
                        {resource.isPublished ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </Button>
                      <Button type="button" variant="ghost" size="icon" onClick={() => openEdit(resource)} aria-label={`Edit ${resource.title}`}><Pencil className="size-4" /></Button>
                      <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => { setSelected(resource); setDeleteOpen(true); }} aria-label={`Delete ${resource.title}`}><Trash2 className="size-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="grid gap-3 border-t p-4 md:hidden">
          {filteredResources.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">No topical resources match these filters.</div>
          ) : filteredResources.map((resource) => (
            <article key={resource.id} className="rounded-xl bg-muted/30 p-4 ring-1 ring-foreground/10">
              <div className="flex items-start justify-between gap-3">
                <div><h2 className="font-semibold">{resource.title}</h2><p className="mt-1 text-xs text-muted-foreground">{resource.subject.name} · {resource.topic?.topicName || "Whole subject"}</p></div>
                <Badge variant={resource.isPublished ? "default" : "secondary"}>{resource.isPublished ? "Published" : "Draft"}</Badge>
              </div>
              {resource.description && <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted-foreground">{resource.description}</p>}
              <div className="mt-4 grid grid-cols-3 gap-2">
                <Button type="button" variant="outline" className="h-10" onClick={() => void togglePublished(resource)} disabled={busyId === resource.id}>{resource.isPublished ? <EyeOff className="size-4" /> : <Eye className="size-4" />}<span className="sr-only">Toggle publish</span></Button>
                <Button type="button" variant="outline" className="h-10" onClick={() => openEdit(resource)}><Pencil className="size-4" /><span className="sr-only">Edit</span></Button>
                <Button type="button" variant="destructive" className="h-10" onClick={() => { setSelected(resource); setDeleteOpen(true); }}><Trash2 className="size-4" /><span className="sr-only">Delete</span></Button>
              </div>
            </article>
          ))}
        </div>
      </Card>

      {editorOpen && (
        <TopicalEditorDialog
          key={selected?.id ?? "new-topical-resource"}
          open={editorOpen}
          onOpenChange={setEditorOpen}
          selected={selected}
          subjects={boardSubjects.length > 0 ? boardSubjects : subjects}
          onSaved={() => { setEditorOpen(false); setSelected(null); router.refresh(); }}
        />
      )}

      <Dialog open={deleteOpen} onOpenChange={(open) => { if (!busy) setDeleteOpen(open); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete topical resource</DialogTitle>
            <DialogDescription>
              Delete <span className="font-medium text-foreground">{selected?.title}</span>? The database record will be removed and this cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteOpen(false)} disabled={busy}>Cancel</Button>
            <Button type="button" variant="destructive" onClick={() => void confirmDelete()} disabled={busy}>{busy ? "Deleting…" : "Delete resource"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TopicalEditorDialog({
  open,
  onOpenChange,
  selected,
  subjects,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selected: TopicalRow | null;
  subjects: SubjectOption[];
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(selected?.title ?? "");
  const [description, setDescription] = useState(selected?.description ?? "");
  const [subjectId, setSubjectId] = useState(selected?.subjectId ?? subjects[0]?.id ?? "");
  const [topicId, setTopicId] = useState(selected?.topicId ?? NO_TOPIC);
  const questionsUrl = selected?.questionsPdfUrl ?? "";
  const [answersUrl, setAnswersUrl] = useState(selected?.answersPdfUrl ?? "");
  const [questionsFile, setQuestionsFile] = useState<File | null>(null);
  const [answersFile, setAnswersFile] = useState<File | null>(null);
  const [published, setPublished] = useState(selected?.isPublished ?? false);
  const [saving, setSaving] = useState(false);

  const topics = subjects.find((subject) => subject.id === subjectId)?.topics ?? [];

  const validateFile = (file: File) => {
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      throw new Error("Choose a PDF file.");
    }
    if (file.size > MAX_PDF_BYTES) throw new Error("PDF files must be 25 MB or smaller.");
  };

  const uploadPdf = async (file: File, kind: "questions" | "solutions") => {
    validateFile(file);
    const filename = `topical-questions/${kind}/${Date.now()}-${file.name}`;
    const response = await fetch(`/api/upload?filename=${encodeURIComponent(filename)}`, { method: "POST", body: file });
    const payload = (await response.json()) as { url?: string; error?: string };
    if (!response.ok || !payload.url) throw new Error(payload.error || "PDF upload failed.");
    return payload.url;
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return toast.error("Add a title");
    if (!subjectId) return toast.error("Choose a subject");
    if (!questionsFile && !questionsUrl) return toast.error("Upload the questions PDF");

    setSaving(true);
    try {
      let finalQuestionsUrl = questionsUrl;
      let finalAnswersUrl = answersUrl || null;
      if (questionsFile) {
        toast("Uploading questions PDF…");
        finalQuestionsUrl = await uploadPdf(questionsFile, "questions");
      }
      if (answersFile) {
        toast("Uploading solutions PDF…");
        finalAnswersUrl = await uploadPdf(answersFile, "solutions");
      }

      const input = {
        title,
        description: description.trim() || null,
        subjectId,
        topicId: topicId === NO_TOPIC ? null : topicId,
        questionsPdfUrl: finalQuestionsUrl,
        answersPdfUrl: finalAnswersUrl,
        isPublished: published,
      };
      const result = selected
        ? await updateTopicalQuestion(selected.id, input)
        : await createTopicalQuestion(input);
      if (!result.success) throw new Error(result.error);

      toast.success(selected ? "Topical resource updated" : "Topical resource created");
      onSaved();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Unable to save topical resource.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!saving) onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="max-h-[94vh] overflow-y-auto p-0 sm:max-w-4xl">
        <DialogHeader>
          <div className="border-b px-6 py-5">
            <DialogTitle>{selected ? "Edit topical resource" : "Create topical resource"}</DialogTitle>
            <DialogDescription className="mt-1">Attach a required questions PDF and an optional answers or mark-scheme PDF.</DialogDescription>
          </div>
        </DialogHeader>
        <form onSubmit={submit}>
          <div className="space-y-6 px-6 py-5">
            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="topical-subject">Subject</Label>
                <Select value={subjectId} onValueChange={(value) => { setSubjectId(value ?? ""); setTopicId(NO_TOPIC); }}>
                  <SelectTrigger id="topical-subject" className="h-11 w-full"><SelectValue placeholder="Choose subject" /></SelectTrigger>
                  <SelectContent className="max-h-72">
                    {subjects.map((subject) => (
                      <SelectItem key={subject.id} value={subject.id}>{subject.name}{subject.code ? ` (${subject.code})` : ""} · {subject.qualificationTitle}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="topical-topic">Topic / chapter</Label>
                <Select value={topicId} onValueChange={(value) => setTopicId(value ?? NO_TOPIC)}>
                  <SelectTrigger id="topical-topic" className="h-11 w-full"><SelectValue placeholder="Whole subject" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_TOPIC}>Whole subject</SelectItem>
                    {topics.map((topic) => <SelectItem key={topic.id} value={topic.id}>{topic.topicName}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="topical-title">Title</Label>
              <Input id="topical-title" className="h-11" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Chapter 3: Logic Gates – Topical Questions" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="topical-description">Description <span className="font-normal text-muted-foreground">(optional)</span></Label>
              <Textarea id="topical-description" value={description} onChange={(event) => setDescription(event.target.value)} className="min-h-28 resize-y" placeholder="Briefly explain what this question pack covers." />
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="rounded-xl bg-muted/30 p-4 ring-1 ring-foreground/10">
                <Label htmlFor="topical-questions-pdf" className="flex items-center gap-2"><FileQuestion className="size-4 text-primary" /> Questions PDF <span className="text-destructive">*</span></Label>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">The question-only document students open first. PDF, up to 25 MB.</p>
                <Input id="topical-questions-pdf" type="file" accept="application/pdf,.pdf" className="mt-4" onChange={(event) => setQuestionsFile(event.target.files?.[0] ?? null)} />
                <p className="mt-2 text-xs font-medium">{questionsFile?.name || (questionsUrl ? "Questions PDF attached" : "No file selected")}</p>
                {selected && questionsUrl && <a href={resourceProxyUrl(selected.id, "questions")} target="_blank" rel="noreferrer" className="mt-3 inline-flex text-xs font-semibold text-primary hover:underline">Open current questions</a>}
              </div>

              <div className="rounded-xl bg-muted/30 p-4 ring-1 ring-foreground/10">
                <Label htmlFor="topical-answers-pdf" className="flex items-center gap-2"><BookOpenCheck className="size-4 text-emerald-600" /> Answers / solutions PDF</Label>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">Optional answer key or mark scheme. PDF, up to 25 MB.</p>
                <Input id="topical-answers-pdf" type="file" accept="application/pdf,.pdf" className="mt-4" onChange={(event) => setAnswersFile(event.target.files?.[0] ?? null)} />
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <p className="text-xs font-medium">{answersFile?.name || (answersUrl ? "Solutions PDF attached" : "No file selected")}</p>
                  {answersUrl && <Button type="button" variant="link" size="sm" className="h-auto p-0 text-destructive" onClick={() => { setAnswersUrl(""); setAnswersFile(null); }}>Remove</Button>}
                </div>
                {selected && answersUrl && <a href={resourceProxyUrl(selected.id, "solutions")} target="_blank" rel="noreferrer" className="mt-3 inline-flex text-xs font-semibold text-primary hover:underline">Open current solutions</a>}
              </div>
            </div>

            <label className="flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border bg-card px-4 py-3">
              <input type="checkbox" checked={published} onChange={(event) => setPublished(event.target.checked)} className="size-4 accent-primary" />
              <span><span className="block font-medium">Publish for students</span><span className="mt-0.5 block text-xs text-muted-foreground">Leave unchecked to save as a draft visible only to admins.</span></span>
            </label>
          </div>
          <DialogFooter className="sticky bottom-0 border-t bg-background/95 px-6 py-4 backdrop-blur">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving} className="gap-2"><Upload className="size-4" />{saving ? "Saving…" : selected ? "Save changes" : "Create resource"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
