"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Archive, ArrowLeft, Copy, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { BANK_QUESTION_TYPE_LABELS } from "@/lib/bank-questions";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  calculateWorkspacePaperTemplateMarks,
} from "@/lib/paper-builder/workspace-paper-template-rules";
import type {
  ManagedWorkspacePaperTemplate,
  WorkspacePaperTemplateInput,
  WorkspacePaperTemplateRowInput,
  WorkspacePaperTemplateStatus,
} from "@/lib/paper-builder/workspace-paper-template-types";
import { PAPER_DIFFICULTIES } from "@/lib/paper-builder/types";
import { TEACHER_GLOBAL_PAPER_QUESTION_TYPES } from "@/lib/teacher-paper-builder-policy";
import { cn } from "@/lib/utils";

import {
  archiveWorkspacePaperTemplate,
  createWorkspacePaperTemplate,
  duplicateWorkspacePaperTemplate,
  restoreWorkspacePaperTemplate,
  updateWorkspacePaperTemplate,
} from "./actions";

type Props = {
  status: WorkspacePaperTemplateStatus;
  templates: ManagedWorkspacePaperTemplate[];
  subjects: Array<{ id: string; label: string }>;
  topics: Array<{ id: string; subjectId: string; name: string; sortOrder: number }>;
  headerTemplates: Array<{ id: string; name: string }>;
};

type Draft = Omit<WorkspacePaperTemplateInput, "targetMarks">;

function blankRow(index: number): WorkspacePaperTemplateRowInput {
  return {
    sectionLabel: `Section ${String.fromCharCode(65 + index)}`,
    questionType: "MCQ",
    questionCount: 5,
    marksPerQuestion: 1,
    difficulty: "any",
  };
}

function blankDraft(subjectId = ""): Draft {
  return {
    name: "",
    description: "",
    subjectId,
    topicIds: [],
    rows: [blankRow(0)],
    preferredHeaderTemplateId: null,
  };
}

function draftFromTemplate(template: ManagedWorkspacePaperTemplate): Draft {
  return {
    name: template.name,
    description: template.description ?? "",
    subjectId: template.subjectId,
    topicIds: template.topics.map((topic) => topic.id),
    rows: template.rows.map((row) => ({
      sectionLabel: row.sectionLabel,
      questionType: row.questionType,
      questionCount: row.questionCount,
      marksPerQuestion: row.marksPerQuestion,
      difficulty: row.difficulty,
    })),
    preferredHeaderTemplateId: template.preferredHeaderTemplate?.id ?? null,
  };
}

export default function TemplatesManagerClient({
  status,
  templates,
  subjects,
  topics,
  headerTemplates,
}: Props) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(() => blankDraft(subjects.length === 1 ? subjects[0].id : ""));
  const [saving, setSaving] = useState(false);
  const [changingId, setChangingId] = useState<string | null>(null);
  const availableTopics = useMemo(
    () => topics.filter((topic) => topic.subjectId === draft.subjectId),
    [draft.subjectId, topics],
  );
  const targetMarks = calculateWorkspacePaperTemplateMarks(draft.rows);

  const reset = () => {
    setEditingId(null);
    setDraft(blankDraft(subjects.length === 1 ? subjects[0].id : ""));
  };

  const updateRow = (index: number, patch: Partial<WorkspacePaperTemplateRowInput>) => {
    setDraft((current) => ({
      ...current,
      rows: current.rows.map((row, rowIndex) => rowIndex === index ? { ...row, ...patch } : row),
    }));
  };

  const submit = async () => {
    setSaving(true);
    try {
      const input: WorkspacePaperTemplateInput = { ...draft, targetMarks };
      const result = editingId
        ? await updateWorkspacePaperTemplate(editingId, input)
        : await createWorkspacePaperTemplate(input);
      if (!result.success) return toast.error(result.error);
      toast.success(result.message);
      reset();
      router.refresh();
    } catch {
      toast.error("Could not save the paper template.");
    } finally {
      setSaving(false);
    }
  };

  const duplicate = async (id: string) => {
    setChangingId(id);
    try {
      const result = await duplicateWorkspacePaperTemplate(id);
      if (!result.success) return toast.error(result.error);
      toast.success(result.message);
      router.refresh();
    } finally {
      setChangingId(null);
    }
  };

  const archive = async (template: ManagedWorkspacePaperTemplate) => {
    if (!window.confirm(`Archive paper template “${template.name}”?`)) return;
    setChangingId(template.id);
    try {
      const result = await archiveWorkspacePaperTemplate(template.id);
      if (!result.success) return toast.error(result.error);
      if (editingId === template.id) reset();
      toast.success(result.message);
      router.refresh();
    } finally {
      setChangingId(null);
    }
  };

  const restore = async (template: ManagedWorkspacePaperTemplate) => {
    setChangingId(template.id);
    try {
      const result = await restoreWorkspacePaperTemplate(template.id);
      if (!result.success) return toast.error(result.error);
      toast.success(result.message);
      router.refresh();
    } finally {
      setChangingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/workspace/paper-builder" className={buttonVariants({ variant: "outline" })}>
          <ArrowLeft className="size-4" /> Back to Paper Builder
        </Link>
        <nav className="flex rounded-xl border bg-muted/30 p-1" aria-label="Paper template status">
          {(["active", "archived"] as const).map((item) => (
            <Link
              key={item}
              href={`/workspace/paper-builder/templates?status=${item}`}
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

      {status === "active" && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? "Edit simple paper template" : "Create simple paper template"}</CardTitle>
            <CardDescription>
              Save the subject, topics, section rules, calculated marks, and an optional preferred header.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Template name">
                <Input value={draft.name} maxLength={200} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} placeholder="Class 12 SQL unit test" />
              </Field>
              <Field label="Assigned subject">
                <Select value={draft.subjectId} onValueChange={(value) => setDraft((current) => ({ ...current, subjectId: value || "", topicIds: [] }))}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Choose subject">{subjects.find((subject) => subject.id === draft.subjectId)?.label}</SelectValue></SelectTrigger>
                  <SelectContent>{subjects.map((subject) => <SelectItem key={subject.id} value={subject.id}>{subject.label}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Description (optional)" className="md:col-span-2">
                <Textarea value={draft.description} maxLength={1000} rows={2} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} />
              </Field>
              <Field label="Preferred header template (optional)" className="md:col-span-2">
                <Select value={draft.preferredHeaderTemplateId ?? "none"} onValueChange={(value) => setDraft((current) => ({ ...current, preferredHeaderTemplateId: !value || value === "none" ? null : value }))}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No preferred header</SelectItem>
                    {headerTemplates.map((template) => <SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <Field label="Topics / chapters">
              {!draft.subjectId ? (
                <Empty message="Choose an assigned subject first." />
              ) : availableTopics.length === 0 ? (
                <Empty message="No topics are available for this subject." />
              ) : (
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {availableTopics.map((topic) => (
                    <label key={topic.id} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 text-sm font-medium">
                      <Checkbox
                        checked={draft.topicIds.includes(topic.id)}
                        onCheckedChange={() => setDraft((current) => ({
                          ...current,
                          topicIds: current.topicIds.includes(topic.id)
                            ? current.topicIds.filter((id) => id !== topic.id)
                            : [...current.topicIds, topic.id],
                        }))}
                      />
                      {topic.name}
                    </label>
                  ))}
                </div>
              )}
            </Field>

            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label>Section rules</Label>
                <Button type="button" size="sm" variant="outline" onClick={() => setDraft((current) => ({ ...current, rows: [...current.rows, blankRow(current.rows.length)] }))}>
                  <Plus className="size-4" /> Add section
                </Button>
              </div>
              {draft.rows.map((row, index) => (
                <div key={index} className="grid gap-3 rounded-xl border bg-muted/15 p-3 md:grid-cols-2 xl:grid-cols-[1.2fr_1.4fr_0.75fr_0.75fr_1fr_auto] xl:items-end">
                  <Field label="Section label"><Input value={row.sectionLabel} maxLength={100} onChange={(event) => updateRow(index, { sectionLabel: event.target.value })} /></Field>
                  <Field label="Question type">
                    <Select value={row.questionType} onValueChange={(value) => updateRow(index, { questionType: (value || "MCQ") as WorkspacePaperTemplateRowInput["questionType"] })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{TEACHER_GLOBAL_PAPER_QUESTION_TYPES.map((type) => <SelectItem key={type} value={type}>{BANK_QUESTION_TYPE_LABELS[type]}</SelectItem>)}</SelectContent>
                    </Select>
                  </Field>
                  <Field label="Questions"><Input type="number" min={1} max={100} value={row.questionCount} onChange={(event) => updateRow(index, { questionCount: Number(event.target.value) })} /></Field>
                  <Field label="Marks each"><Input type="number" min={1} max={100} value={row.marksPerQuestion} onChange={(event) => updateRow(index, { marksPerQuestion: Number(event.target.value) })} /></Field>
                  <Field label="Difficulty">
                    <Select value={row.difficulty} onValueChange={(value) => updateRow(index, { difficulty: (value || "any") as WorkspacePaperTemplateRowInput["difficulty"] })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{PAPER_DIFFICULTIES.map((difficulty) => <SelectItem key={difficulty} value={difficulty} className="capitalize">{difficulty === "any" ? "Mixed" : difficulty}</SelectItem>)}</SelectContent>
                    </Select>
                  </Field>
                  <Button type="button" variant="ghost" size="icon" aria-label={`Remove section ${index + 1}`} disabled={draft.rows.length === 1} onClick={() => setDraft((current) => ({ ...current, rows: current.rows.filter((_, rowIndex) => rowIndex !== index) }))}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
              <p className="font-semibold">Calculated target: {targetMarks} marks</p>
              <Badge>Rules only · no question IDs</Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={submit} disabled={saving || !draft.name.trim()}>
                {editingId ? <Pencil className="size-4" /> : <Plus className="size-4" />}
                {saving ? "Saving…" : editingId ? "Update template" : "Create template"}
              </Button>
              {editingId && <Button type="button" variant="outline" onClick={reset} disabled={saving}>Cancel edit</Button>}
            </div>
          </CardContent>
        </Card>
      )}

      <section className="space-y-3">
        <div>
          <h2 className="text-xl font-semibold capitalize">{status} templates</h2>
          <p className="text-sm text-muted-foreground">
            {status === "active" ? "Apply a template to start a fresh browser-session paper draft." : "Restore a template before using it in Paper Builder."}
          </p>
        </div>
        {templates.length === 0 ? (
          <Empty message={status === "active" ? "No simple paper templates yet." : "No archived simple paper templates."} />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {templates.map((template) => (
              <Card key={template.id}>
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <CardDescription>{template.subjectName}</CardDescription>
                    </div>
                    <Badge variant={template.staleReason ? "destructive" : template.archivedAt ? "outline" : "secondary"}>
                      {template.staleReason ? "Unavailable" : template.archivedAt ? "Archived" : "Active"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  {template.description && <p className="text-muted-foreground">{template.description}</p>}
                  {template.staleReason && <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-amber-900 dark:text-amber-200">{template.staleReason}</p>}
                  <dl className="grid gap-2 sm:grid-cols-2">
                    <div><dt className="text-muted-foreground">Topics</dt><dd className="font-medium">{template.topicCount}</dd></div>
                    <div><dt className="text-muted-foreground">Sections</dt><dd className="font-medium">{template.rowCount}</dd></div>
                    <div><dt className="text-muted-foreground">Target marks</dt><dd className="font-medium">{template.targetMarks}</dd></div>
                    <div><dt className="text-muted-foreground">Header</dt><dd className="font-medium">{template.preferredHeaderTemplateName ?? "None"}</dd></div>
                    <div><dt className="text-muted-foreground">Created</dt><dd className="font-medium">{template.createdAt.slice(0, 10)}</dd></div>
                    <div><dt className="text-muted-foreground">Updated</dt><dd className="font-medium">{template.updatedAt.slice(0, 10)}</dd></div>
                  </dl>
                  <div className="flex flex-wrap gap-2">
                    {status === "active" ? (
                      <>
                        <Link href={`/workspace/paper-builder?template=${encodeURIComponent(template.id)}`} aria-disabled={Boolean(template.staleReason)} className={cn(buttonVariants({ size: "sm" }), template.staleReason && "pointer-events-none opacity-50")}>Apply</Link>
                        <Button type="button" size="sm" variant="outline" disabled={Boolean(template.staleReason)} onClick={() => { setEditingId(template.id); setDraft(draftFromTemplate(template)); window.scrollTo({ top: 0, behavior: "smooth" }); }}><Pencil className="size-4" /> Edit</Button>
                        <Button type="button" size="sm" variant="outline" disabled={changingId === template.id || Boolean(template.staleReason)} onClick={() => duplicate(template.id)}><Copy className="size-4" /> Duplicate</Button>
                        <Button type="button" size="sm" variant="outline" disabled={changingId === template.id} onClick={() => archive(template)}><Archive className="size-4" /> Archive</Button>
                      </>
                    ) : (
                      <Button type="button" size="sm" variant="outline" disabled={changingId === template.id || Boolean(template.staleReason)} onClick={() => restore(template)}><RotateCcw className="size-4" /> Restore</Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Field({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return <div className={cn("space-y-2", className)}><Label>{label}</Label>{children}</div>;
}

function Empty({ message }: { message: string }) {
  return <div className="rounded-xl border border-dashed bg-muted/20 p-8 text-center text-sm text-muted-foreground">{message}</div>;
}
