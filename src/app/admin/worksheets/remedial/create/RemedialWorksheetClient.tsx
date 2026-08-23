"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  BookOpenCheck,
  CheckCircle2,
  FileQuestion,
  Loader2,
  Save,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  RemedialAvailability,
  RemedialDifficulty,
  RemedialDraft,
  RemedialScopeInput,
} from "@/lib/remedial-worksheets/types";

import {
  generateRemedialWorksheetDraftAction,
  saveRemedialWorksheetDraftAction,
} from "./actions";

type SavedWorksheet = { worksheetId: string; title: string };

function scoreLabel(value: number | null) {
  return value === null ? "No attempts" : `${value}%`;
}

export default function RemedialWorksheetClient({
  scope,
  initialAvailability,
  initialError,
}: {
  scope: RemedialScopeInput;
  initialAvailability: RemedialAvailability | null;
  initialError: string | null;
}) {
  const [difficulty, setDifficulty] = useState<RemedialDifficulty>("all");
  const [questionCount, setQuestionCount] = useState(5);
  const [title, setTitle] = useState(
    initialAvailability ? `Remedial Worksheet: ${initialAvailability.scope.topicLabel}` : "",
  );
  const [draft, setDraft] = useState<RemedialDraft | null>(null);
  const [saved, setSaved] = useState<SavedWorksheet | null>(null);
  const [error, setError] = useState<string | null>(initialError);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  const available = initialAvailability?.counts[difficulty] ?? 0;
  const canGenerate = Boolean(initialAvailability && questionCount >= 1 && questionCount <= available);
  const totalMarks = useMemo(
    () => draft?.questions.reduce((total, question) => total + question.marks, 0) ?? 0,
    [draft],
  );

  const resetPreview = () => {
    setDraft(null);
    setSaved(null);
    setError(null);
  };

  const generateDraft = async () => {
    setGenerating(true);
    setError(null);
    setSaved(null);
    const result = await generateRemedialWorksheetDraftAction(scope, difficulty, questionCount);
    if (result.success) setDraft(result.data);
    else {
      setDraft(null);
      setError(result.error);
    }
    setGenerating(false);
  };

  const saveDraft = async () => {
    if (!draft) return;
    setSaving(true);
    setError(null);
    const result = await saveRemedialWorksheetDraftAction({
      scope,
      title,
      difficulty: draft.difficulty,
      questions: draft.questions.map((question) => ({
        id: question.id,
        sourceUpdatedAt: question.sourceUpdatedAt,
      })),
    });
    if (result.success) setSaved(result.data);
    else setError(result.error);
    setSaving(false);
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 pb-16">
      <Button
        nativeButton={false}
        variant="ghost"
        size="sm"
        className="-ml-2"
        render={<Link href="/admin/insights" />}
      >
        <ArrowLeft className="size-4" /> Back to Academic Insights
      </Button>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Remedial Worksheet Draft</h1>
          <Badge variant="outline">MCQ-only Phase 1</Badge>
        </div>
        <p className="max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
          Build a teacher-reviewed worksheet from one relational Topic Intelligence scope. Previewing does not write to the database.
        </p>
      </div>

      {!initialAvailability ? (
        <Card className="border-destructive/30">
          <CardContent className="space-y-4 p-6">
            <h2 className="font-semibold text-destructive">This remedial scope cannot be used</h2>
            <p className="text-sm text-muted-foreground">{initialError}</p>
            <Button nativeButton={false} variant="outline" render={<Link href="/admin/insights" />}>
              Return to Insights
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader><CardTitle className="text-lg">Academic context</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["Board", initialAvailability.scope.boardLabel],
                ["Qualification / Class", initialAvailability.scope.qualificationLabel],
                ["Subject", initialAvailability.scope.subjectLabel],
                ["Topic", initialAvailability.scope.topicLabel],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl bg-muted/50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
                  <p className="mt-1 font-medium">{value}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-amber-500/25">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg"><ShieldCheck className="size-5 text-amber-500" /> Scoped Insights evidence</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-6 text-muted-foreground">
                This worksheet is based on scoped Insights activity for this topic. Selection is deterministic and relation-based; no AI diagnosis is used.
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  ["Attempts", String(initialAvailability.evidence.attempts)],
                  ["Average", scoreLabel(initialAvailability.evidence.averageScore)],
                  ["Wrong / unanswered", String(initialAvailability.evidence.wrongOrUnanswered)],
                  ["Students affected", String(initialAvailability.evidence.affectedStudents)],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl border p-3">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="mt-1 text-lg font-semibold">{value}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">Configure draft</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-2 lg:col-span-1">
                  <Label htmlFor="remedial-title">Worksheet title</Label>
                  <Input id="remedial-title" value={title} maxLength={200} onChange={(event) => setTitle(event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Difficulty</Label>
                  <Select
                    value={difficulty}
                    onValueChange={(value) => {
                      setDifficulty((value || "all") as RemedialDifficulty);
                      resetPreview();
                    }}
                  >
                    <SelectTrigger aria-label="Remedial difficulty"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All difficulties</SelectItem>
                      <SelectItem value="easy">Easy</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="remedial-count">Number of MCQs</Label>
                  <Input
                    id="remedial-count"
                    type="number"
                    min={1}
                    max={30}
                    value={questionCount}
                    onChange={(event) => {
                      setQuestionCount(Number(event.target.value));
                      resetPreview();
                    }}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3 rounded-xl border bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold">{available} unique valid MCQ{available === 1 ? "" : "s"} available</p>
                  <p className="text-xs text-muted-foreground">Global, image-free questions matching the exact subject, topic and difficulty.</p>
                </div>
                <Button onClick={generateDraft} disabled={!canGenerate || generating} className="w-full sm:w-auto">
                  {generating ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                  Generate Draft Preview
                </Button>
              </div>
              {questionCount > available && (
                <p className="text-sm text-destructive">
                  Only {available} matching question{available === 1 ? " is" : "s are"} available. Reduce the requested count; no partial worksheet will be generated.
                </p>
              )}
            </CardContent>
          </Card>

          {error && <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</div>}

          {draft && (
            <section className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold">Draft preview</h2>
                  <p className="text-sm text-muted-foreground">{draft.questions.length} MCQs · {totalMarks} total marks · not saved</p>
                </div>
                <Button onClick={saveDraft} disabled={saving || Boolean(saved)} className="w-full sm:w-auto">
                  {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                  Save as Draft
                </Button>
              </div>

              <div className="space-y-4">
                {draft.questions.map((question, index) => (
                  <Card key={question.id}>
                    <CardContent className="space-y-4 p-4 sm:p-6">
                      <div className="flex items-start gap-3">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">{index + 1}</span>
                        <div className="min-w-0 flex-1">
                          <p className="whitespace-pre-wrap font-medium leading-6">{question.questionText}</p>
                          <div className="mt-2 flex flex-wrap gap-2"><Badge variant="outline" className="capitalize">{question.difficulty}</Badge><Badge variant="outline">{question.marks} mark{question.marks === 1 ? "" : "s"}</Badge></div>
                        </div>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {[["A", question.optionA], ["B", question.optionB], ["C", question.optionC], ["D", question.optionD]].map(([label, option]) => (
                          <div key={label} className="rounded-lg border p-3 text-sm"><strong>{label}.</strong> {option}</div>
                        ))}
                      </div>
                      <div className="rounded-lg bg-emerald-500/10 p-3 text-sm">
                        <p className="font-semibold text-emerald-700 dark:text-emerald-300">Correct answer: {question.correctAnswer}</p>
                        {question.explanation && <p className="mt-2 whitespace-pre-wrap leading-6 text-muted-foreground">{question.explanation}</p>}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {saved && (
            <Card className="border-emerald-500/30 bg-emerald-500/5">
              <CardContent className="space-y-4 p-5 sm:p-6">
                <div className="flex gap-3"><CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-500" /><div><h2 className="font-semibold">Draft worksheet saved</h2><p className="text-sm text-muted-foreground">{saved.title} is unpublished and is not visible to students until you publish it manually.</p></div></div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button nativeButton={false} render={<Link href={`/admin/worksheets/${saved.worksheetId}/print`} />}><BookOpenCheck className="size-4" /> Open worksheet</Button>
                  <Button nativeButton={false} variant="outline" render={<Link href="/admin/worksheets" />}><FileQuestion className="size-4" /> Admin Worksheets</Button>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
