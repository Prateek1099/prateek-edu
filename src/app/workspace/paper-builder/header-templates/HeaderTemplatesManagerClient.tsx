"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Archive, ArrowLeft, Pencil, Plus, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type {
  PaperHeaderTemplateInput,
  WorkspacePaperHeaderTemplate,
} from "@/lib/paper-builder/types";
import { cn } from "@/lib/utils";

import {
  archiveWorkspacePaperHeaderTemplate,
  createWorkspacePaperHeaderTemplate,
  restoreWorkspacePaperHeaderTemplate,
  updateWorkspacePaperHeaderTemplate,
} from "./actions";

type Props = {
  status: "active" | "archived";
  templates: WorkspacePaperHeaderTemplate[];
};

const blankTemplate: PaperHeaderTemplateInput = {
  name: "",
  institutionName: "",
  examLabel: "Class Test",
  courseLine: "",
  defaultDuration: 30,
  defaultInstructions: "Attempt all questions.",
  showStudentName: true,
  showRollNumber: true,
  defaultClassLine: null,
  defaultTopicLine: null,
};

function inputFromTemplate(template: WorkspacePaperHeaderTemplate): PaperHeaderTemplateInput {
  return {
    name: template.name,
    institutionName: template.institutionName,
    examLabel: template.examLabel,
    courseLine: template.courseLine,
    defaultDuration: template.defaultDuration,
    defaultInstructions: template.defaultInstructions,
    showStudentName: template.showStudentName,
    showRollNumber: template.showRollNumber,
    defaultClassLine: template.defaultClassLine,
    defaultTopicLine: template.defaultTopicLine,
  };
}

export default function HeaderTemplatesManagerClient({ status, templates }: Props) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PaperHeaderTemplateInput>(blankTemplate);
  const [saving, setSaving] = useState(false);
  const [changingId, setChangingId] = useState<string | null>(null);

  const update = <K extends keyof PaperHeaderTemplateInput>(
    key: K,
    value: PaperHeaderTemplateInput[K],
  ) => setForm((current) => ({ ...current, [key]: value }));

  const resetForm = () => {
    setEditingId(null);
    setForm(blankTemplate);
  };

  const submit = async () => {
    setSaving(true);
    try {
      const result = editingId
        ? await updateWorkspacePaperHeaderTemplate(editingId, form)
        : await createWorkspacePaperHeaderTemplate(form);
      if (!result.success) return toast.error(result.error);
      toast.success(editingId ? "Header template updated." : "Header template created.");
      resetForm();
      router.refresh();
    } catch {
      toast.error("Could not save the header template.");
    } finally {
      setSaving(false);
    }
  };

  const archive = async (template: WorkspacePaperHeaderTemplate) => {
    if (!window.confirm(`Archive header template “${template.name}”?`)) return;
    setChangingId(template.id);
    try {
      const result = await archiveWorkspacePaperHeaderTemplate(template.id);
      if (!result.success) return toast.error(result.error);
      if (editingId === template.id) resetForm();
      toast.success("Header template archived.");
      router.refresh();
    } finally {
      setChangingId(null);
    }
  };

  const restore = async (template: WorkspacePaperHeaderTemplate) => {
    setChangingId(template.id);
    try {
      const result = await restoreWorkspacePaperHeaderTemplate(template.id);
      if (!result.success) return toast.error(result.error);
      toast.success("Header template restored.");
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
        <nav className="flex rounded-xl border bg-muted/30 p-1" aria-label="Header template status">
          <Link
            href="/workspace/paper-builder/header-templates?status=active"
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-semibold",
              status === "active" ? "bg-background shadow-sm" : "text-muted-foreground",
            )}
          >
            Active
          </Link>
          <Link
            href="/workspace/paper-builder/header-templates?status=archived"
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-semibold",
              status === "archived" ? "bg-background shadow-sm" : "text-muted-foreground",
            )}
          >
            Archived
          </Link>
        </nav>
      </div>

      {status === "active" && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? "Edit header template" : "Create header template"}</CardTitle>
            <CardDescription>
              Save reusable school and exam header defaults. Maximum marks always come from the generated paper.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Field label="Template name">
              <Input value={form.name} maxLength={200} onChange={(event) => update("name", event.target.value)} placeholder="Class Test header" />
            </Field>
            <Field label="Institution name">
              <Input value={form.institutionName} maxLength={200} onChange={(event) => update("institutionName", event.target.value)} placeholder="School name" />
            </Field>
            <Field label="Exam label">
              <Input value={form.examLabel} maxLength={200} onChange={(event) => update("examLabel", event.target.value)} placeholder="Class Test" />
            </Field>
            <Field label="Default duration (minutes)">
              <Input type="number" min={1} max={300} value={form.defaultDuration} onChange={(event) => update("defaultDuration", Number(event.target.value))} />
            </Field>
            <Field label="Course / class / board line" className="md:col-span-2">
              <Input value={form.courseLine} maxLength={500} onChange={(event) => update("courseLine", event.target.value)} placeholder="Informatics Practices · Class 12 · CBSE" />
            </Field>
            <Field label="Default class line">
              <Input value={form.defaultClassLine ?? ""} maxLength={200} onChange={(event) => update("defaultClassLine", event.target.value || null)} placeholder="Class 12" />
            </Field>
            <Field label="Default topic line">
              <Input value={form.defaultTopicLine ?? ""} maxLength={1000} onChange={(event) => update("defaultTopicLine", event.target.value || null)} placeholder="Optional topic or subtitle" />
            </Field>
            <Field label="Default instructions" className="md:col-span-2">
              <Textarea value={form.defaultInstructions} maxLength={3000} rows={4} onChange={(event) => update("defaultInstructions", event.target.value)} />
            </Field>
            <div className="flex flex-wrap gap-6 md:col-span-2">
              <label className="flex min-h-11 items-center gap-3 text-sm font-medium">
                <Checkbox checked={form.showStudentName} onCheckedChange={(checked) => update("showStudentName", checked === true)} />
                Show student name field
              </label>
              <label className="flex min-h-11 items-center gap-3 text-sm font-medium">
                <Checkbox checked={form.showRollNumber} onCheckedChange={(checked) => update("showRollNumber", checked === true)} />
                Show roll number field
              </label>
            </div>
            <div className="flex flex-wrap gap-2 md:col-span-2">
              <Button type="button" onClick={submit} disabled={saving || !form.name.trim() || !form.institutionName.trim() || !form.examLabel.trim()}>
                {editingId ? <Pencil className="size-4" /> : <Plus className="size-4" />}
                {saving ? "Saving…" : editingId ? "Update template" : "Create template"}
              </Button>
              {editingId && <Button type="button" variant="outline" onClick={resetForm} disabled={saving}>Cancel edit</Button>}
            </div>
          </CardContent>
        </Card>
      )}

      <section className="space-y-3">
        <div>
          <h2 className="text-xl font-semibold">{status === "archived" ? "Archived templates" : "Active templates"}</h2>
          <p className="text-sm text-muted-foreground">
            {status === "archived"
              ? "Restore a template before it can be selected in Paper Builder."
              : "Active templates are available in Teacher Paper Builder."}
          </p>
        </div>
        {templates.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            {status === "archived" ? "No archived header templates." : "No header templates yet."}
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {templates.map((template) => (
              <Card key={template.id}>
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <CardDescription>{template.institutionName}</CardDescription>
                    </div>
                    <Badge variant={template.archivedAt ? "outline" : "secondary"}>
                      {template.archivedAt ? "Archived" : "Active"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <dl className="grid gap-2 sm:grid-cols-2">
                    <div><dt className="text-muted-foreground">Exam label</dt><dd className="font-medium">{template.examLabel}</dd></div>
                    <div><dt className="text-muted-foreground">Duration</dt><dd className="font-medium">{template.defaultDuration} minutes</dd></div>
                    <div className="sm:col-span-2"><dt className="text-muted-foreground">Course line</dt><dd className="font-medium">{template.courseLine || "Not set"}</dd></div>
                  </dl>
                  <p className="text-xs text-muted-foreground">Updated {template.updatedAt.slice(0, 10)}</p>
                  <div className="flex flex-wrap gap-2">
                    {status === "active" ? (
                      <>
                        <Button type="button" size="sm" variant="outline" onClick={() => { setEditingId(template.id); setForm(inputFromTemplate(template)); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
                          <Pencil className="size-4" /> Edit
                        </Button>
                        <Button type="button" size="sm" variant="outline" disabled={changingId === template.id} onClick={() => archive(template)}>
                          <Archive className="size-4" /> Archive
                        </Button>
                      </>
                    ) : (
                      <Button type="button" size="sm" variant="outline" disabled={changingId === template.id} onClick={() => restore(template)}>
                        <RotateCcw className="size-4" /> Restore
                      </Button>
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
  return (
    <div className={cn("space-y-2", className)}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}
