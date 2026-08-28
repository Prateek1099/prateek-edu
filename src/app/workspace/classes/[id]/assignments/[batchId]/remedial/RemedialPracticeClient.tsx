"use client";

import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Trash2,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type {
  RemedialPracticeCandidate,
  RemedialPracticeContext,
} from "@/lib/remedial-practice/types";

import { createRemedialPracticeAction } from "./actions";

function defaultTitle(context: RemedialPracticeContext) {
  const topic = context.weakTopics[0]?.name ?? context.sourceChallengeTitle;
  return `Remedial Practice: ${topic}`;
}

function studentLabel(student: RemedialPracticeContext["students"][number]) {
  return student.name || student.email || "Unnamed student";
}

export default function RemedialPracticeClient({
  context,
}: {
  context: RemedialPracticeContext;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState(() => defaultTitle(context));
  const [dueDate, setDueDate] = useState("");
  const [selectedQuestionIds, setSelectedQuestionIds] = useState(context.suggestedQuestionIds);
  const [selectedStudentIds, setSelectedStudentIds] = useState(context.suggestedStudentIds);

  const candidateById = useMemo(
    () => new Map(context.candidates.map((candidate) => [candidate.id, candidate])),
    [context.candidates],
  );
  const selectedQuestions = selectedQuestionIds.flatMap((id) => {
    const question = candidateById.get(id);
    return question ? [question] : [];
  });
  const selectedIdSet = new Set(selectedQuestionIds);
  const reusedSelectedCount = selectedQuestions.filter(
    (question) => question.usedInSourceAssignment,
  ).length;
  const canCreate =
    context.weakTopics.length > 0 &&
    selectedQuestions.length > 0 &&
    selectedQuestions.length <= 10 &&
    selectedStudentIds.length > 0 &&
    Boolean(title.trim());

  function toggleStudent(studentId: string, checked: boolean) {
    setSelectedStudentIds((current) =>
      checked
        ? current.includes(studentId) ? current : [...current, studentId]
        : current.filter((id) => id !== studentId),
    );
  }

  function addQuestion(questionId: string) {
    if (selectedQuestionIds.length >= 10) {
      toast.error("A remedial practice can contain at most 10 questions.");
      return;
    }
    setSelectedQuestionIds((current) => current.includes(questionId) ? current : [...current, questionId]);
  }

  function replaceQuestion(question: RemedialPracticeCandidate) {
    const replacement = context.candidates.find(
      (candidate) => !selectedIdSet.has(candidate.id) && candidate.topicId === question.topicId,
    ) ?? context.candidates.find((candidate) => !selectedIdSet.has(candidate.id));
    if (!replacement) {
      toast.error("No unused scoped replacement question is available.");
      return;
    }
    setSelectedQuestionIds((current) =>
      current.map((id) => id === question.id ? replacement.id : id),
    );
    toast.success(`Replaced with another ${replacement.topicName} question.`);
  }

  function handleCreate() {
    if (!title.trim()) return toast.error("Add a title for the remedial practice.");
    if (selectedQuestionIds.length < 1 || selectedQuestionIds.length > 10) {
      return toast.error("Choose between 1 and 10 remedial questions.");
    }
    if (selectedStudentIds.length < 1) return toast.error("Select at least one active student.");

    startTransition(async () => {
      const result = await createRemedialPracticeAction({
        classId: context.classId,
        batchId: context.batchId,
        title,
        dueDate: dueDate || null,
        questionIds: selectedQuestionIds,
        studentIds: selectedStudentIds,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(
        `Remedial practice created and assigned to ${result.data.assignedCount} student${result.data.assignedCount === 1 ? "" : "s"}.`,
      );
      router.push(`/workspace/classes/${context.classId}/assignments/${result.data.batchId}`);
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-12">
      <Link
        href={`/workspace/classes/${context.classId}/assignments/${context.batchId}`}
        className="inline-flex"
      >
        <Button variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
          <ArrowLeft className="mr-2 size-4" /> Back to source assignment
        </Button>
      </Link>

      <header className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">MCQ only</Badge>
          <Badge variant="outline">{context.subjectName}</Badge>
          <Badge variant="outline">{context.className}</Badge>
        </div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Create remedial practice</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Review questions suggested from real wrong answers in “{context.sourceChallengeTitle}”.
          Nothing is created or assigned until you confirm below.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(300px,.8fr)]">
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Weak topics from this assignment</CardTitle></CardHeader>
            <CardContent>
              {context.weakTopics.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No post-assignment wrong answers could be linked to a real topic yet.
                </p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {context.weakTopics.map((topic) => (
                    <div key={topic.id} className="rounded-xl border bg-muted/20 p-3">
                      <p className="font-semibold">{topic.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {topic.mistakeCount} wrong answer{topic.mistakeCount === 1 ? "" : "s"} · {topic.affectedStudentCount} student{topic.affectedStudentCount === 1 ? "" : "s"}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-base">Review suggested questions</CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">
                  {context.freshCandidateCount} fresh alternatives · {context.reusedCandidateCount} source-question fallbacks available
                </p>
              </div>
              <Badge variant="secondary">{selectedQuestions.length}/10 selected</Badge>
            </CardHeader>
            <CardContent className="space-y-3">
              {selectedQuestions.length === 0 ? (
                <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                  No questions selected. Add a scoped question from the alternatives below.
                </div>
              ) : selectedQuestions.map((question, index) => (
                <div key={question.id} className="rounded-xl border p-4">
                  <div className="flex items-start gap-3">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{index + 1}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">{question.topicName}</Badge>
                        <Badge variant="secondary" className="capitalize">{question.difficulty}</Badge>
                        {question.usedInSourceAssignment ? <Badge variant="outline">Source fallback</Badge> : <Badge>Fresh</Badge>}
                      </div>
                      <p className="mt-3 whitespace-pre-wrap text-sm font-medium">{question.questionText}</p>
                      <div className="mt-3 grid gap-1.5 text-xs text-muted-foreground sm:grid-cols-2">
                        <p>A. {question.optionA}</p><p>B. {question.optionB}</p>
                        <p>C. {question.optionC}</p><p>D. {question.optionD}</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap justify-end gap-2 border-t pt-3">
                    <Button type="button" variant="outline" size="sm" onClick={() => replaceQuestion(question)}>
                      <RefreshCw className="mr-1 size-3.5" /> Replace
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedQuestionIds((current) => current.filter((id) => id !== question.id))}>
                      <Trash2 className="mr-1 size-3.5" /> Remove
                    </Button>
                  </div>
                </div>
              ))}

              {context.candidates.some((candidate) => !selectedIdSet.has(candidate.id)) ? (
                <details className="rounded-xl border bg-muted/10 p-4">
                  <summary className="cursor-pointer text-sm font-semibold">Add another scoped question</summary>
                  <div className="mt-3 space-y-2">
                    {context.candidates.filter((candidate) => !selectedIdSet.has(candidate.id)).slice(0, 12).map((candidate) => (
                      <div key={candidate.id} className="flex flex-col gap-2 rounded-lg border bg-background p-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="line-clamp-2 text-sm font-medium">{candidate.questionText}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{candidate.topicName} · {candidate.difficulty}</p>
                        </div>
                        <Button type="button" size="sm" variant="outline" className="shrink-0" onClick={() => addQuestion(candidate.id)}>Add</Button>
                      </div>
                    ))}
                  </div>
                </details>
              ) : null}

              {reusedSelectedCount > 0 ? (
                <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
                  {reusedSelectedCount} selected question{reusedSelectedCount === 1 ? "" : "s"} appeared in the source assignment because there were not enough fresh alternatives. You can replace or remove them.
                </p>
              ) : null}
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
          <Card>
            <CardHeader><CardTitle className="text-base">Practice details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="remedial-title">Title</Label>
                <Input id="remedial-title" value={title} maxLength={200} onChange={(event) => setTitle(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="remedial-due">Due date (optional)</Label>
                <Input id="remedial-due" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
              </div>
              <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
                The activity is published inside your private workspace and visible only to the students assigned here.
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="gap-3">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="flex items-center gap-2 text-base"><Users className="size-4" /> Recipients</CardTitle>
                <Badge variant="secondary">{selectedStudentIds.length}</Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="outline" onClick={() => setSelectedStudentIds(context.suggestedStudentIds)}>Weak students</Button>
                <Button type="button" size="sm" variant="outline" onClick={() => setSelectedStudentIds(context.students.map((student) => student.id))}>Whole class</Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setSelectedStudentIds([])}>Clear</Button>
              </div>
            </CardHeader>
            <CardContent className="max-h-80 space-y-2 overflow-y-auto">
              {context.students.map((student) => {
                const checked = selectedStudentIds.includes(student.id);
                return (
                  <label key={student.id} className="flex cursor-pointer items-start gap-3 rounded-lg border p-3">
                    <Checkbox checked={checked} onCheckedChange={(value) => toggleStudent(student.id, value === true)} aria-label={`Assign to ${studentLabel(student)}`} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{studentLabel(student)}</span>
                      <span className="block truncate text-xs text-muted-foreground">{student.email || "No email"}</span>
                      <span className="mt-1 block text-xs text-muted-foreground">{student.mistakeCount} source mistake{student.mistakeCount === 1 ? "" : "s"}{student.sourceRecipient ? "" : " · class member"}</span>
                    </span>
                  </label>
                );
              })}
            </CardContent>
          </Card>

          <Card className="border-primary/30">
            <CardContent className="space-y-3 p-4">
              <div className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                <p>{selectedQuestions.length} MCQ{selectedQuestions.length === 1 ? "" : "s"} · {selectedStudentIds.length} recipient{selectedStudentIds.length === 1 ? "" : "s"}</p>
              </div>
              <Button className="w-full" disabled={!canCreate || isPending} onClick={handleCreate}>
                {isPending ? <RotateCcw className="mr-2 size-4 animate-spin" /> : <Sparkles className="mr-2 size-4" />}
                {isPending ? "Creating…" : "Create & assign"}
                {!isPending ? <ArrowRight className="ml-2 size-4" /> : null}
              </Button>
              <p className="text-center text-[11px] text-muted-foreground">
                One confirmation creates the practice and exact selected-recipient assignment atomically.
              </p>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
