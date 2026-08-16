"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  CircleAlert,
  Copy,
  ExternalLink,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { BANK_QUESTION_TYPE_LABELS } from "@/lib/bank-questions";
import { calculateBlueprintPaperMarks } from "@/lib/paper-builder/blueprint-rules";
import type { ManagedBlueprintTemplate } from "@/lib/paper-builder/blueprint-template-types";
import type { BlueprintChapterDraft, BlueprintPaperDraft, BlueprintRowDraft } from "@/lib/paper-builder/blueprint-types";
import { PAPER_DIFFICULTIES, PAPER_QUESTION_TYPES, type PaperBuilderSubject, type PaperBuilderTopic, type PaperDetails } from "@/lib/paper-builder/types";
import { cn } from "@/lib/utils";

import { deletePaperBlueprintTemplate, duplicatePaperBlueprintTemplate, updatePaperBlueprintTemplate } from "../template-actions";

type Props = {
  templates: ManagedBlueprintTemplate[];
  subjects: PaperBuilderSubject[];
  topics: PaperBuilderTopic[];
};

type EditorState = {
  id: string;
  name: string;
  description: string;
  includeHeaderDefaults: boolean;
  draft: BlueprintPaperDraft;
};

const emptyHeader: PaperDetails = {
  institutionName: "VEXA",
  examLabel: "Class Test",
  title: "",
  courseLine: "",
  topicLine: "",
  durationMinutes: 30,
  dateText: "",
  classText: "",
  showStudentName: true,
  showRollNumber: true,
  instructions: "Attempt all questions.",
};

function clientId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function editorFromTemplate(template: ManagedBlueprintTemplate): EditorState {
  const chapters = [...template.chapters].sort((left, right) => left.sortOrder - right.sortOrder).map((chapter) => ({
    id: clientId("chapter"),
    topicId: chapter.topicId,
    topicName: chapter.topicName,
    sortOrder: chapter.sortOrder,
    rows: [...chapter.rows].sort((left, right) => left.sortOrder - right.sortOrder).map((row) => ({
      id: clientId("row"),
      topicId: chapter.topicId,
      sectionLabel: row.sectionLabel,
      questionType: row.questionType,
      questionCount: row.questionCount,
      marksPerQuestion: row.marksPerQuestion,
      difficulty: row.difficulty,
    })),
  }));
  return {
    id: template.id,
    name: template.name,
    description: template.description ?? "",
    includeHeaderDefaults: template.includeHeaderDefaults,
    draft: {
      version: 1,
      details: template.headerDefaults ?? emptyHeader,
      boardId: template.boardId,
      qualificationId: template.qualificationId,
      subjectId: template.subjectId,
      targetMarks: calculateBlueprintPaperMarks(chapters),
      chapters,
    },
  };
}

export default function TemplatesManagerClient({ templates, subjects, topics }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [boardFilter, setBoardFilter] = useState("");
  const [qualificationFilter, setQualificationFilter] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [deleting, setDeleting] = useState<ManagedBlueprintTemplate | null>(null);

  const boards = useMemo(() => uniqueBy(subjects.map((subject) => ({ id: subject.boardId, label: subject.boardTitle }))), [subjects]);
  const qualifications = useMemo(() => uniqueBy(subjects.filter((subject) => !boardFilter || subject.boardId === boardFilter).map((subject) => ({ id: subject.qualificationId, label: subject.qualificationTitle }))), [boardFilter, subjects]);
  const filteredSubjects = subjects.filter((subject) => (!boardFilter || subject.boardId === boardFilter) && (!qualificationFilter || subject.qualificationId === qualificationFilter));
  const visibleTemplates = templates.filter((template) => (
    (!boardFilter || template.boardId === boardFilter) &&
    (!qualificationFilter || template.qualificationId === qualificationFilter) &&
    (!subjectFilter || template.subjectId === subjectFilter)
  ));

  const runMutation = (work: () => Promise<{ success: boolean; message?: string; error?: string }>, after: () => void) => {
    startTransition(async () => {
      try {
        const result = await work();
        if (!result.success) {
          toast.error(result.error ?? "The template could not be changed.");
          return;
        }
        toast.success(result.message ?? "Template updated.");
        after();
        router.refresh();
      } catch {
        toast.error("The template changed in another session or could not be updated. Refresh and try again.");
      }
    });
  };

  const saveEditor = () => {
    if (!editor) return;
    const totalMarks = calculateBlueprintPaperMarks(editor.draft.chapters);
    runMutation(() => updatePaperBlueprintTemplate({
      id: editor.id,
      name: editor.name,
      description: editor.description,
      includeHeaderDefaults: editor.includeHeaderDefaults,
      draft: { ...editor.draft, targetMarks: totalMarks },
    }), () => setEditor(null));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Filter templates</CardTitle>
          <CardDescription>Find patterns by their saved academic scope.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <NativeSelect label="Board" value={boardFilter} onChange={(value) => { setBoardFilter(value); setQualificationFilter(""); setSubjectFilter(""); }} options={boards} allLabel="All boards" />
          <NativeSelect label="Qualification / class" value={qualificationFilter} onChange={(value) => { setQualificationFilter(value); setSubjectFilter(""); }} options={qualifications} allLabel="All qualifications" />
          <NativeSelect label="Subject" value={subjectFilter} onChange={setSubjectFilter} options={filteredSubjects.map((subject) => ({ id: subject.id, label: subject.name }))} allLabel="All subjects" />
        </CardContent>
      </Card>

      {visibleTemplates.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-10 text-center">
          <h2 className="font-semibold">No saved blueprint templates found</h2>
          <p className="mt-2 text-sm text-muted-foreground">Clear the filters or save a pattern from Blueprint Builder.</p>
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {visibleTemplates.map((template) => (
            <Card key={template.id} className={cn(template.staleReason && "border-amber-500/50")}>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="break-words">{template.name}</CardTitle>
                    <CardDescription className="mt-1">{template.description || "No description"}</CardDescription>
                  </div>
                  <Badge variant={template.staleReason ? "destructive" : "secondary"}>{template.totalMarks} marks</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2 text-sm sm:grid-cols-2">
                  <Summary label="Academic scope" value={`${template.boardTitle} · ${template.qualificationTitle} · ${template.subjectName}`} />
                  <Summary label="Pattern" value={`${template.chapterCount} chapter${template.chapterCount === 1 ? "" : "s"} · ${template.rowCount} row${template.rowCount === 1 ? "" : "s"}`} />
                  <Summary label="Created" value={formatDate(template.createdAt)} />
                  <Summary label="Updated" value={formatDate(template.updatedAt)} />
                </div>
                {template.staleReason && (
                  <div className="flex gap-2 rounded-xl bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-200">
                    <CircleAlert className="mt-0.5 size-4 shrink-0" />
                    <span>{template.staleReason} Update the template before using it.</span>
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  {template.staleReason ? (
                    <Button type="button" variant="outline" disabled><ExternalLink className="size-4" /> Open in Builder</Button>
                  ) : (
                    <Link href={`/admin/paper-builder/blueprint?templateId=${encodeURIComponent(template.id)}`} className={buttonVariants({ variant: "outline" })}>
                      <ExternalLink className="size-4" /> Open in Builder
                    </Link>
                  )}
                  <Button type="button" variant="outline" onClick={() => setEditor(editorFromTemplate(template))}><Pencil className="size-4" /> Edit</Button>
                  <Button type="button" variant="outline" disabled={pending || Boolean(template.staleReason)} onClick={() => runMutation(() => duplicatePaperBlueprintTemplate(template.id), () => undefined)}><Copy className="size-4" /> Duplicate</Button>
                  <Button type="button" variant="destructive" disabled={pending} onClick={() => setDeleting(template)}><Trash2 className="size-4" /> Delete</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <TemplateEditorDialog editor={editor} subjects={subjects} topics={topics} pending={pending} onChange={setEditor} onSave={saveEditor} />

      <Dialog open={Boolean(deleting)} onOpenChange={(open) => { if (!open && !pending) setDeleting(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Delete blueprint template</DialogTitle>
            <DialogDescription>
              Delete “{deleting?.name}”? This removes only the saved blueprint pattern and its chapter/row settings. It will not delete Question Bank questions, selected questions, generated papers, or any student data.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" disabled={pending} onClick={() => setDeleting(null)}>Cancel</Button>
            <Button type="button" variant="destructive" disabled={!deleting || pending} onClick={() => deleting && runMutation(() => deletePaperBlueprintTemplate(deleting.id), () => setDeleting(null))}>
              <Trash2 className="size-4" /> {pending ? "Deleting…" : "Delete pattern only"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TemplateEditorDialog({ editor, subjects, topics, pending, onChange, onSave }: {
  editor: EditorState | null;
  subjects: PaperBuilderSubject[];
  topics: PaperBuilderTopic[];
  pending: boolean;
  onChange: (editor: EditorState | null) => void;
  onSave: () => void;
}) {
  if (!editor) return null;
  const draft = editor.draft;
  const boardOptions = uniqueBy(subjects.map((subject) => ({ id: subject.boardId, label: subject.boardTitle })));
  const qualificationOptions = uniqueBy(subjects.filter((subject) => subject.boardId === draft.boardId).map((subject) => ({ id: subject.qualificationId, label: subject.qualificationTitle })));
  const subjectOptions = subjects.filter((subject) => subject.qualificationId === draft.qualificationId).map((subject) => ({ id: subject.id, label: subject.name }));
  const topicOptions = topics.filter((topic) => topic.subjectId === draft.subjectId);
  const unusedTopics = topicOptions.filter((topic) => !draft.chapters.some((chapter) => chapter.topicId === topic.id));
  const totalMarks = calculateBlueprintPaperMarks(draft.chapters);

  const patchEditor = (patch: Partial<EditorState>) => onChange({ ...editor, ...patch });
  const patchDraft = (patch: Partial<BlueprintPaperDraft>) => patchEditor({ draft: { ...draft, ...patch } });
  const patchHeader = <K extends keyof PaperDetails>(key: K, value: PaperDetails[K]) => patchDraft({ details: { ...draft.details, [key]: value } });
  const updateChapters = (chapters: BlueprintChapterDraft[]) => patchDraft({ chapters: chapters.map((chapter, index) => ({ ...chapter, sortOrder: index })), targetMarks: calculateBlueprintPaperMarks(chapters) });
  const addChapter = (topicId: string) => {
    const topic = topicOptions.find((item) => item.id === topicId);
    if (!topic) return;
    updateChapters([...draft.chapters, {
      id: clientId("chapter"),
      topicId: topic.id,
      topicName: topic.name,
      sortOrder: draft.chapters.length,
      rows: [{ id: clientId("row"), topicId: topic.id, sectionLabel: `Section ${String.fromCharCode(65 + Math.min(draft.chapters.length, 25))}`, questionType: "MCQ", questionCount: 1, marksPerQuestion: 1, difficulty: "any" }],
    }]);
  };
  const updateRows = (chapterId: string, rows: BlueprintRowDraft[]) => updateChapters(draft.chapters.map((chapter) => chapter.id === chapterId ? { ...chapter, rows } : chapter));

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !pending) onChange(null); }}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>Edit blueprint template</DialogTitle>
          <DialogDescription>Update reusable metadata, header defaults, academic scope, chapters, and pattern rows. Selected questions are never stored.</DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Template name"><Input value={editor.name} maxLength={200} onChange={(event) => patchEditor({ name: event.target.value })} /></Field>
            <Field label="Description"><Input value={editor.description} maxLength={1000} onChange={(event) => patchEditor({ description: event.target.value })} /></Field>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <NativeSelect label="Board" value={draft.boardId} onChange={(boardId) => patchDraft({ boardId, qualificationId: "", subjectId: "", chapters: [] })} options={boardOptions} placeholder="Choose board" />
            <NativeSelect label="Qualification / class" value={draft.qualificationId} onChange={(qualificationId) => patchDraft({ qualificationId, subjectId: "", chapters: [] })} options={qualificationOptions} placeholder="Choose qualification" />
            <NativeSelect label="Subject" value={draft.subjectId} onChange={(subjectId) => patchDraft({ subjectId, chapters: [] })} options={subjectOptions} placeholder="Choose subject" />
          </div>

          <section className="space-y-3 rounded-2xl border p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div><h3 className="font-semibold">Chapter pattern</h3><p className="text-xs text-muted-foreground">Calculated total: {totalMarks} marks</p></div>
              <NativeSelect label="Add chapter" value="" onChange={addChapter} options={unusedTopics.map((topic) => ({ id: topic.id, label: topic.name }))} placeholder={draft.subjectId ? "Choose topic" : "Choose subject first"} />
            </div>
            {draft.chapters.length === 0 && <p className="rounded-xl border border-dashed p-5 text-center text-sm text-muted-foreground">Add at least one chapter.</p>}
            {draft.chapters.map((chapter, chapterIndex) => (
              <div key={chapter.id} className="space-y-3 rounded-xl bg-muted/40 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div><p className="font-medium">{chapter.topicName}</p><p className="text-xs text-muted-foreground">Chapter {chapterIndex + 1}</p></div>
                  <div className="flex gap-1">
                    <IconButton label="Move chapter up" disabled={chapterIndex === 0} onClick={() => updateChapters(moveItem(draft.chapters, chapterIndex, chapterIndex - 1))}><ArrowUp /></IconButton>
                    <IconButton label="Move chapter down" disabled={chapterIndex === draft.chapters.length - 1} onClick={() => updateChapters(moveItem(draft.chapters, chapterIndex, chapterIndex + 1))}><ArrowDown /></IconButton>
                    <IconButton label="Remove chapter" onClick={() => updateChapters(draft.chapters.filter((item) => item.id !== chapter.id))}><Trash2 /></IconButton>
                  </div>
                </div>
                {chapter.rows.map((row, rowIndex) => (
                  <div key={row.id} className="grid gap-2 rounded-xl border bg-background p-3 md:grid-cols-[1.2fr_1.2fr_.7fr_.7fr_.8fr_auto] md:items-end">
                    <Field label="Section label"><Input value={row.sectionLabel} maxLength={100} onChange={(event) => updateRows(chapter.id, chapter.rows.map((item) => item.id === row.id ? { ...item, sectionLabel: event.target.value } : item))} /></Field>
                    <NativeSelect label="Question type" value={row.questionType} onChange={(questionType) => updateRows(chapter.id, chapter.rows.map((item) => item.id === row.id ? { ...item, questionType: questionType as BlueprintRowDraft["questionType"] } : item))} options={PAPER_QUESTION_TYPES.map((type) => ({ id: type, label: BANK_QUESTION_TYPE_LABELS[type] }))} />
                    <NumberField label="Questions" value={row.questionCount} onChange={(questionCount) => updateRows(chapter.id, chapter.rows.map((item) => item.id === row.id ? { ...item, questionCount } : item))} />
                    <NumberField label="Marks each" value={row.marksPerQuestion} onChange={(marksPerQuestion) => updateRows(chapter.id, chapter.rows.map((item) => item.id === row.id ? { ...item, marksPerQuestion } : item))} />
                    <NativeSelect label="Difficulty" value={row.difficulty} onChange={(difficulty) => updateRows(chapter.id, chapter.rows.map((item) => item.id === row.id ? { ...item, difficulty: difficulty as BlueprintRowDraft["difficulty"] } : item))} options={PAPER_DIFFICULTIES.map((difficulty) => ({ id: difficulty, label: difficulty === "any" ? "Any" : `${difficulty[0].toUpperCase()}${difficulty.slice(1)}` }))} />
                    <div className="flex gap-1">
                      <IconButton label="Move row up" disabled={rowIndex === 0} onClick={() => updateRows(chapter.id, moveItem(chapter.rows, rowIndex, rowIndex - 1))}><ArrowUp /></IconButton>
                      <IconButton label="Move row down" disabled={rowIndex === chapter.rows.length - 1} onClick={() => updateRows(chapter.id, moveItem(chapter.rows, rowIndex, rowIndex + 1))}><ArrowDown /></IconButton>
                      <IconButton label="Remove row" onClick={() => updateRows(chapter.id, chapter.rows.filter((item) => item.id !== row.id))}><Trash2 /></IconButton>
                    </div>
                  </div>
                ))}
                <Button type="button" size="sm" variant="outline" onClick={() => updateRows(chapter.id, [...chapter.rows, { id: clientId("row"), topicId: chapter.topicId, sectionLabel: `Section ${String.fromCharCode(65 + Math.min(chapter.rows.length, 25))}`, questionType: "MCQ", questionCount: 1, marksPerQuestion: 1, difficulty: "any" }])}><Plus className="size-4" /> Add row</Button>
              </div>
            ))}
          </section>

          <label className="flex items-start gap-3 rounded-xl border p-3">
            <Checkbox checked={editor.includeHeaderDefaults} onCheckedChange={(checked) => patchEditor({ includeHeaderDefaults: checked === true })} />
            <span><span className="block text-sm font-medium">Include optional header snapshot</span><span className="text-xs text-muted-foreground">Paper Header Templates remain separate.</span></span>
          </label>
          {editor.includeHeaderDefaults && (
            <div className="grid gap-4 rounded-2xl border p-4 md:grid-cols-2">
              <Field label="Institution"><Input value={draft.details.institutionName} onChange={(event) => patchHeader("institutionName", event.target.value)} /></Field>
              <Field label="Exam label"><Input value={draft.details.examLabel} onChange={(event) => patchHeader("examLabel", event.target.value)} /></Field>
              <Field label="Course line"><Input value={draft.details.courseLine} onChange={(event) => patchHeader("courseLine", event.target.value)} /></Field>
              <Field label="Optional title"><Input value={draft.details.title} onChange={(event) => patchHeader("title", event.target.value)} /></Field>
              <Field label="Optional topic line"><Input value={draft.details.topicLine} onChange={(event) => patchHeader("topicLine", event.target.value)} /></Field>
              <NumberField label="Duration (minutes)" value={draft.details.durationMinutes} onChange={(durationMinutes) => patchHeader("durationMinutes", durationMinutes)} />
              <Field label="Date"><Input value={draft.details.dateText} onChange={(event) => patchHeader("dateText", event.target.value)} /></Field>
              <Field label="Class"><Input value={draft.details.classText} onChange={(event) => patchHeader("classText", event.target.value)} /></Field>
              <Field label="Instructions" className="md:col-span-2"><Textarea rows={3} value={draft.details.instructions} onChange={(event) => patchHeader("instructions", event.target.value)} /></Field>
              <label className="flex items-center gap-2 text-sm"><Checkbox checked={draft.details.showStudentName} onCheckedChange={(checked) => patchHeader("showStudentName", checked === true)} /> Show student name</label>
              <label className="flex items-center gap-2 text-sm"><Checkbox checked={draft.details.showRollNumber} onCheckedChange={(checked) => patchHeader("showRollNumber", checked === true)} /> Show roll number</label>
            </div>
          )}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" disabled={pending} onClick={() => onChange(null)}>Cancel</Button>
            <Button type="button" disabled={pending || !editor.name.trim() || draft.chapters.length === 0} onClick={onSave}>{pending ? "Saving…" : `Save ${totalMarks}-mark template`}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return <label className={cn("block space-y-1.5", className)}><span className="block text-sm font-medium leading-none">{label}</span>{children}</label>;
}

function NativeSelect({ label, value, onChange, options, allLabel, placeholder }: { label: string; value: string; onChange: (value: string) => void; options: Array<{ id: string; label: string }>; allLabel?: string; placeholder?: string }) {
  return <Field label={label}><select aria-label={label} className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50" value={value} onChange={(event) => onChange(event.target.value)}><option value="">{allLabel ?? placeholder ?? `Choose ${label.toLowerCase()}`}</option>{options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></Field>;
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return <Field label={label}><Input type="number" min={1} max={100} value={value} onChange={(event) => onChange(Number(event.target.value))} /></Field>;
}

function Summary({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 leading-5">{value}</p></div>;
}

function IconButton({ label, disabled, onClick, children }: { label: string; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return <Button type="button" size="icon-sm" variant="ghost" aria-label={label} title={label} disabled={disabled} onClick={onClick}>{children}</Button>;
}

function uniqueBy(items: Array<{ id: string; label: string }>) {
  return [...new Map(items.map((item) => [item.id, item])).values()];
}

function moveItem<T>(items: T[], from: number, to: number) {
  if (to < 0 || to >= items.length) return items;
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
