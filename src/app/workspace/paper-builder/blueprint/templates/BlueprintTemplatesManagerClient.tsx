"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Archive,
  ArrowDown,
  ArrowUp,
  Copy,
  ExternalLink,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { BANK_QUESTION_TYPE_LABELS } from "@/lib/bank-questions";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { calculateBlueprintPaperMarks } from "@/lib/paper-builder/blueprint-rules";
import type { BlueprintChapterDraft, BlueprintRowDraft } from "@/lib/paper-builder/blueprint-types";
import type {
  ManagedWorkspaceBlueprintTemplate,
  WorkspaceBlueprintTemplateInput,
  WorkspaceBlueprintTemplateStatus,
} from "@/lib/paper-builder/workspace-blueprint-template-types";
import { PAPER_DIFFICULTIES } from "@/lib/paper-builder/types";
import { TEACHER_GLOBAL_PAPER_QUESTION_TYPES } from "@/lib/teacher-paper-builder-policy";
import { cn } from "@/lib/utils";

import {
  archiveTeacherBlueprintTemplate,
  duplicateTeacherBlueprintTemplate,
  restoreTeacherBlueprintTemplate,
  updateTeacherBlueprintTemplate,
} from "./actions";

type SubjectOption = {
  id: string;
  name: string;
  label: string;
  boardId: string;
  boardTitle: string;
  qualificationId: string;
  qualificationTitle: string;
};

type TopicOption = { id: string; subjectId: string; name: string; sortOrder: number };

type Props = {
  status: WorkspaceBlueprintTemplateStatus;
  templates: ManagedWorkspaceBlueprintTemplate[];
  subjects: SubjectOption[];
  topics: TopicOption[];
  headerTemplates: Array<{ id: string; name: string }>;
};

type Editor = {
  id: string;
  name: string;
  description: string;
  subjectId: string;
  preferredHeaderTemplateId: string | null;
  chapters: BlueprintChapterDraft[];
};

const defaultDetails = {
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

function editorFromTemplate(template: ManagedWorkspaceBlueprintTemplate): Editor {
  return {
    id: template.id,
    name: template.name,
    description: template.description ?? "",
    subjectId: template.subjectId,
    preferredHeaderTemplateId: template.preferredHeaderTemplateId,
    chapters: template.chapters.map((chapter) => ({
      id: clientId("chapter"),
      topicId: chapter.topicId,
      topicName: chapter.topicName,
      sortOrder: chapter.sortOrder,
      rows: chapter.rows.map((row) => ({
        id: clientId("row"),
        topicId: chapter.topicId,
        sectionLabel: row.sectionLabel,
        questionType: row.questionType,
        questionCount: row.questionCount,
        marksPerQuestion: row.marksPerQuestion,
        difficulty: row.difficulty,
      })),
    })),
  };
}

export default function BlueprintTemplatesManagerClient({
  status,
  templates,
  subjects,
  topics,
  headerTemplates,
}: Props) {
  const router = useRouter();
  const [editor, setEditor] = useState<Editor | null>(null);
  const [pending, setPending] = useState(false);
  const availableTopics = useMemo(
    () => topics.filter((topic) => topic.subjectId === editor?.subjectId),
    [editor?.subjectId, topics],
  );

  const runMutation = async (
    mutation: () => Promise<{ success: boolean; error?: string; message?: string }>,
    success?: () => void,
  ) => {
    setPending(true);
    try {
      const result = await mutation();
      if (!result.success) return toast.error(result.error ?? "Could not update the chapter pattern.");
      toast.success(result.message ?? "Chapter pattern updated.");
      success?.();
      router.refresh();
    } catch {
      toast.error("Could not update the chapter pattern.");
    } finally {
      setPending(false);
    }
  };

  const saveEditor = () => {
    if (!editor) return;
    const subject = subjects.find((item) => item.id === editor.subjectId);
    if (!subject) return toast.error("Choose an assigned subject.");
    const targetMarks = calculateBlueprintPaperMarks(editor.chapters);
    const input: WorkspaceBlueprintTemplateInput & { id: string } = {
      id: editor.id,
      name: editor.name,
      description: editor.description,
      includeHeaderDefaults: Boolean(editor.preferredHeaderTemplateId),
      preferredHeaderTemplateId: editor.preferredHeaderTemplateId,
      draft: {
        version: 1,
        details: {
          ...defaultDetails,
          courseLine: `${subject.name} · ${subject.qualificationTitle} · ${subject.boardTitle}`,
          topicLine: editor.chapters.map((chapter) => chapter.topicName).join(" · "),
        },
        boardId: subject.boardId,
        qualificationId: subject.qualificationId,
        subjectId: subject.id,
        targetMarks,
        chapters: editor.chapters,
      },
    };
    runMutation(() => updateTeacherBlueprintTemplate(input), () => setEditor(null));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/workspace/paper-builder/blueprint" className={buttonVariants({ variant: "outline" })}>
          <ExternalLink className="size-4" /> Open Chapter-wise Paper
        </Link>
        <nav className="flex rounded-xl border bg-muted/30 p-1" aria-label="Saved chapter pattern status">
          {(["active", "archived"] as const).map((item) => (
            <Link
              key={item}
              href={`/workspace/paper-builder/blueprint/templates?status=${item}`}
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-semibold capitalize",
                status === item ? "bg-background shadow-sm" : "text-muted-foreground",
              )}
            >
              {item}
            </Link>
          ))}
        </nav>
      </div>

      <details className="rounded-xl border bg-muted/20">
        <summary className="min-h-11 cursor-pointer px-4 py-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
          How section labels work
        </summary>
        <p className="border-t px-4 py-3 text-sm text-muted-foreground">
          Use the same section label, question type and marks when a section continues across chapters.
        </p>
      </details>

      {templates.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-10 text-center">
          <h2 className="font-semibold">
            {status === "active" ? "No saved chapter patterns yet" : "No archived chapter patterns"}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {status === "active"
              ? "Build a pattern in Chapter-wise Paper, then save it for later."
              : "Archived chapter patterns appear here and can be restored."}
          </p>
        </div>
      ) : (
        <div className="divide-y overflow-hidden rounded-2xl border bg-card">
          {templates.map((template) => (
            <article key={template.id} className={cn("space-y-4 p-4 sm:p-5", template.staleReason && "bg-amber-500/5")}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="break-words text-base font-semibold">{template.name}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {template.subjectName} · {template.qualificationTitle} · {template.boardTitle}
                    </p>
                  </div>
                  <Badge variant={template.staleReason ? "destructive" : template.archivedAt ? "outline" : "secondary"}>
                    {template.staleReason ? "Unavailable" : template.archivedAt ? "Archived" : "Active"}
                  </Badge>
                </div>
              <div className="space-y-4 text-sm">
                {template.description && <p className="text-muted-foreground">{template.description}</p>}
                {template.staleReason && (
                  <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-amber-900 dark:text-amber-200">
                    {template.staleReason}
                  </p>
                )}
                <dl className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  <Summary label="Chapters" value={template.chapters.map((chapter) => chapter.topicName).join(" · ")} />
                  <Summary label="Structure" value={`${template.rowCount} sections · ${template.chapters.reduce((total, chapter) => total + chapter.rows.reduce((rowTotal, row) => rowTotal + row.questionCount, 0), 0)} questions`} />
                  <Summary label="Total marks" value={String(template.totalMarks)} />
                  <Summary label="Updated" value={template.updatedAt.slice(0, 10)} />
                </dl>
                <div className="flex flex-wrap gap-2">
                  {status === "active" ? (
                    <>
                      <Link
                        href={`/workspace/paper-builder/blueprint?templateId=${encodeURIComponent(template.id)}`}
                        aria-disabled={Boolean(template.staleReason)}
                        className={cn(buttonVariants({ size: "sm" }), template.staleReason && "pointer-events-none opacity-50")}
                      >
                        <ExternalLink className="size-4" /> Use pattern
                      </Link>
                      <Button type="button" size="sm" variant="outline" disabled={pending || Boolean(template.staleReason)} onClick={() => setEditor(editorFromTemplate(template))}>
                        <Pencil className="size-4" /> Edit
                      </Button>
                      <Button type="button" size="sm" variant="outline" disabled={pending || Boolean(template.staleReason)} onClick={() => runMutation(() => duplicateTeacherBlueprintTemplate(template.id))}>
                        <Copy className="size-4" /> Duplicate
                      </Button>
                      <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => {
                        if (window.confirm(`Archive chapter pattern “${template.name}”?`)) {
                          runMutation(() => archiveTeacherBlueprintTemplate(template.id));
                        }
                      }}>
                        <Archive className="size-4" /> Archive
                      </Button>
                    </>
                  ) : (
                    <Button type="button" size="sm" variant="outline" disabled={pending || Boolean(template.staleReason)} onClick={() => runMutation(() => restoreTeacherBlueprintTemplate(template.id))}>
                      <RotateCcw className="size-4" /> Restore
                    </Button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {editor && (
        <TemplateEditor
          editor={editor}
          subjects={subjects}
          topics={availableTopics}
          headerTemplates={headerTemplates}
          pending={pending}
          onChange={setEditor}
          onCancel={() => setEditor(null)}
          onSave={saveEditor}
        />
      )}
    </div>
  );
}

function TemplateEditor({
  editor,
  subjects,
  topics,
  headerTemplates,
  pending,
  onChange,
  onCancel,
  onSave,
}: {
  editor: Editor;
  subjects: SubjectOption[];
  topics: TopicOption[];
  headerTemplates: Array<{ id: string; name: string }>;
  pending: boolean;
  onChange: (editor: Editor) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  const totalMarks = calculateBlueprintPaperMarks(editor.chapters);
  const unusedTopics = topics.filter((topic) => !editor.chapters.some((chapter) => chapter.topicId === topic.id));
  const updateChapters = (chapters: BlueprintChapterDraft[]) => onChange({
    ...editor,
    chapters: chapters.map((chapter, sortOrder) => ({ ...chapter, sortOrder })),
  });
  const updateRows = (chapterId: string, rows: BlueprintRowDraft[]) => updateChapters(
    editor.chapters.map((chapter) => chapter.id === chapterId ? { ...chapter, rows } : chapter),
  );
  const addTopic = (topicId: string) => {
    const topic = topics.find((item) => item.id === topicId);
    if (!topic) return;
    updateChapters([...editor.chapters, {
      id: clientId("chapter"),
      topicId: topic.id,
      topicName: topic.name,
      sortOrder: editor.chapters.length,
      rows: [{
        id: clientId("row"),
        topicId: topic.id,
        sectionLabel: "Section A",
        questionType: "MCQ",
        questionCount: 1,
        marksPerQuestion: 1,
        difficulty: "any",
      }],
    }]);
  };

  return (
    <Card className="border-primary/30">
      <CardHeader>
        <CardTitle>Edit chapter pattern</CardTitle>
        <CardDescription>
          Update the reusable chapter and marks plan. It does not change any saved paper.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Pattern name"><Input value={editor.name} maxLength={200} onChange={(event) => onChange({ ...editor, name: event.target.value })} /></Field>
          <Field label="Assigned subject">
            <Select value={editor.subjectId} onValueChange={(subjectId) => onChange({ ...editor, subjectId: subjectId || "", chapters: [] })}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>{subjects.map((subject) => <SelectItem key={subject.id} value={subject.id}>{subject.label}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Description (optional)" className="md:col-span-2"><Textarea rows={2} maxLength={1000} value={editor.description} onChange={(event) => onChange({ ...editor, description: event.target.value })} /></Field>
          <Field label="Preferred paper header (optional)" className="md:col-span-2">
            <Select value={editor.preferredHeaderTemplateId ?? "none"} onValueChange={(value) => onChange({ ...editor, preferredHeaderTemplateId: !value || value === "none" ? null : value })}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="none">No preferred header</SelectItem>{headerTemplates.map((template) => <SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><h3 className="font-semibold">Chapter marks plan</h3><p className="text-sm text-muted-foreground">Calculated total: {totalMarks} marks</p></div>
          <Field label="Add topic">
            <Select value="" onValueChange={(value) => { if (value) addTopic(value); }} disabled={unusedTopics.length === 0}>
              <SelectTrigger className="w-64 max-w-full"><SelectValue placeholder={unusedTopics.length ? "Choose topic" : "All topics added"} /></SelectTrigger>
              <SelectContent>{unusedTopics.map((topic) => <SelectItem key={topic.id} value={topic.id}>{topic.name}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
        </div>

        {editor.chapters.length === 0 && <Empty message="Add at least one chapter and one question section." />}
        {editor.chapters.map((chapter, chapterIndex) => (
          <div key={chapter.id} className="space-y-3 rounded-xl border bg-muted/15 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div><p className="font-semibold">{chapter.topicName}</p><p className="text-xs text-muted-foreground">Topic {chapterIndex + 1}</p></div>
              <div className="flex gap-1">
                <IconButton label="Move topic up" disabled={chapterIndex === 0} onClick={() => updateChapters(moveItem(editor.chapters, chapterIndex, chapterIndex - 1))}><ArrowUp /></IconButton>
                <IconButton label="Move topic down" disabled={chapterIndex === editor.chapters.length - 1} onClick={() => updateChapters(moveItem(editor.chapters, chapterIndex, chapterIndex + 1))}><ArrowDown /></IconButton>
                <IconButton label="Remove topic" onClick={() => updateChapters(editor.chapters.filter((item) => item.id !== chapter.id))}><Trash2 /></IconButton>
              </div>
            </div>
            {chapter.rows.map((row, rowIndex) => (
              <div key={row.id} className="grid gap-3 rounded-xl border bg-background p-3 md:grid-cols-2 xl:grid-cols-[1.2fr_1.3fr_.7fr_.7fr_.9fr_auto] xl:items-end">
                <Field label="Section label"><Input value={row.sectionLabel} maxLength={100} onChange={(event) => updateRows(chapter.id, chapter.rows.map((item) => item.id === row.id ? { ...item, sectionLabel: event.target.value } : item))} /></Field>
                <Field label="Question type"><Select value={row.questionType} onValueChange={(questionType) => updateRows(chapter.id, chapter.rows.map((item) => item.id === row.id ? { ...item, questionType: questionType as BlueprintRowDraft["questionType"] } : item))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{TEACHER_GLOBAL_PAPER_QUESTION_TYPES.map((type) => <SelectItem key={type} value={type}>{BANK_QUESTION_TYPE_LABELS[type]}</SelectItem>)}</SelectContent></Select></Field>
                <NumberField label="Questions" value={row.questionCount} onChange={(questionCount) => updateRows(chapter.id, chapter.rows.map((item) => item.id === row.id ? { ...item, questionCount } : item))} />
                <NumberField label="Marks each" value={row.marksPerQuestion} onChange={(marksPerQuestion) => updateRows(chapter.id, chapter.rows.map((item) => item.id === row.id ? { ...item, marksPerQuestion } : item))} />
                <Field label="Difficulty"><Select value={row.difficulty} onValueChange={(difficulty) => updateRows(chapter.id, chapter.rows.map((item) => item.id === row.id ? { ...item, difficulty: difficulty as BlueprintRowDraft["difficulty"] } : item))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{PAPER_DIFFICULTIES.map((difficulty) => <SelectItem key={difficulty} value={difficulty} className="capitalize">{difficulty === "any" ? "Any" : difficulty}</SelectItem>)}</SelectContent></Select></Field>
                <div className="flex gap-1">
                  <IconButton label="Move section up" disabled={rowIndex === 0} onClick={() => updateRows(chapter.id, moveItem(chapter.rows, rowIndex, rowIndex - 1))}><ArrowUp /></IconButton>
                  <IconButton label="Move section down" disabled={rowIndex === chapter.rows.length - 1} onClick={() => updateRows(chapter.id, moveItem(chapter.rows, rowIndex, rowIndex + 1))}><ArrowDown /></IconButton>
                  <IconButton label="Remove section" disabled={chapter.rows.length === 1} onClick={() => updateRows(chapter.id, chapter.rows.filter((item) => item.id !== row.id))}><Trash2 /></IconButton>
                </div>
              </div>
            ))}
            <Button type="button" size="sm" variant="outline" onClick={() => updateRows(chapter.id, [...chapter.rows, { id: clientId("row"), topicId: chapter.topicId, sectionLabel: `Section ${String.fromCharCode(65 + Math.min(chapter.rows.length, 25))}`, questionType: "MCQ", questionCount: 1, marksPerQuestion: 1, difficulty: "any" }])}>
              <Plus className="size-4" /> Add section
            </Button>
          </div>
        ))}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" disabled={pending} onClick={onCancel}>Cancel</Button>
          <Button type="button" disabled={pending || !editor.name.trim() || editor.chapters.length === 0 || totalMarks < 1} onClick={onSave}>
            {pending ? "Saving…" : `Update ${totalMarks}-mark pattern`}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Field({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return <div className={cn("space-y-2", className)}><Label>{label}</Label>{children}</div>;
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return <Field label={label}><Input type="number" min={1} max={100} value={value} onChange={(event) => onChange(Number(event.target.value))} /></Field>;
}

function Summary({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-muted-foreground">{label}</dt><dd className="font-medium">{value}</dd></div>;
}

function Empty({ message }: { message: string }) {
  return <div className="rounded-xl border border-dashed bg-muted/20 p-8 text-center text-sm text-muted-foreground">{message}</div>;
}

function IconButton({ label, disabled, onClick, children }: { label: string; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return <Button type="button" size="icon-sm" variant="ghost" aria-label={label} title={label} disabled={disabled} onClick={onClick}>{children}</Button>;
}

function moveItem<T>(items: T[], from: number, to: number) {
  if (to < 0 || to >= items.length) return items;
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}
