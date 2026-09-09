"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, Clock3, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { saveOnlineAssessmentResponse, submitOnlineAssessment } from "../actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { StudentAssessmentDto } from "@/lib/assessments/student-dto";
import type { ResponseValue } from "@/lib/assessments/rules";
import { cn } from "@/lib/utils";

type Delivery = {
  serverNow: string;
  attempt: { id: string; attemptNumber: number; status: string; startedAt: string; expiresAt: string; submittedAt: string | null };
  paper: StudentAssessmentDto;
  responses: Array<{ questionId: string; state: string; revision: number; value: ResponseValue | null }>;
};

type SaveState = "idle" | "saving" | "saved" | "error";

function formatRemaining(seconds: number) {
  const safe = Math.max(0, seconds);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const remainder = safe % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`
    : `${minutes}:${String(remainder).padStart(2, "0")}`;
}

export function AssessmentRunnerClient({ delivery }: { delivery: Delivery }) {
  const router = useRouter();
  const [submitting, startSubmitTransition] = useTransition();
  const questions = useMemo(() => delivery.paper.sections.flatMap((section) => section.questions), [delivery.paper.sections]);
  const responseSeed = useMemo(() => new Map(delivery.responses.map((response) => [response.questionId, response])), [delivery.responses]);
  const [answers, setAnswers] = useState<Record<string, ResponseValue | null>>(() => Object.fromEntries(delivery.responses.map((response) => [response.questionId, response.value])));
  const [saveStates, setSaveStates] = useState<Record<string, SaveState>>({});
  const [activeIndex, setActiveIndex] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [remaining, setRemaining] = useState(() => Math.max(0, Math.ceil((new Date(delivery.attempt.expiresAt).getTime() - new Date(delivery.serverNow).getTime()) / 1000)));
  const initialRemainingRef = useRef(remaining);
  const answersRef = useRef(answers);
  const revisionsRef = useRef(new Map(delivery.responses.map((response) => [response.questionId, response.revision])));
  const dirtyRef = useRef(new Set<string>());
  const timersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const savesRef = useRef(new Map<string, Promise<boolean>>());
  const expiredRef = useRef(false);
  const finishRef = useRef<(expired?: boolean) => void>(() => undefined);

  useEffect(() => { answersRef.current = answers; }, [answers]);

  const saveOne = useCallback(async (questionId: string): Promise<boolean> => {
    const running = savesRef.current.get(questionId);
    if (running) return running;
    const operation = (async () => {
      let success = true;
      while (dirtyRef.current.has(questionId)) {
        dirtyRef.current.delete(questionId);
        setSaveStates((current) => ({ ...current, [questionId]: "saving" }));
        const result = await saveOnlineAssessmentResponse({
          attemptId: delivery.attempt.id,
          questionId,
          expectedRevision: revisionsRef.current.get(questionId) ?? 0,
          value: answersRef.current[questionId] ?? null,
        });
        if (!result.success) {
          success = false;
          setSaveStates((current) => ({ ...current, [questionId]: "error" }));
          break;
        }
        revisionsRef.current.set(questionId, result.saved.revision);
        setSaveStates((current) => ({ ...current, [questionId]: "saved" }));
      }
      savesRef.current.delete(questionId);
      return success;
    })();
    savesRef.current.set(questionId, operation);
    return operation;
  }, [delivery.attempt.id]);

  const changeAnswer = (questionId: string, value: ResponseValue) => {
    if (remaining <= 0 || submitting) return;
    setAnswers((current) => ({ ...current, [questionId]: value }));
    dirtyRef.current.add(questionId);
    setSaveStates((current) => ({ ...current, [questionId]: "idle" }));
    const currentTimer = timersRef.current.get(questionId);
    if (currentTimer) clearTimeout(currentTimer);
    timersRef.current.set(questionId, setTimeout(() => { void saveOne(questionId); }, 500));
  };

  const flushAnswers = async () => {
    for (const timer of timersRef.current.values()) clearTimeout(timer);
    timersRef.current.clear();
    const inFlightResults = await Promise.all(Array.from(savesRef.current.values()));
    const dirty = Array.from(dirtyRef.current);
    const results = await Promise.all(dirty.map((questionId) => saveOne(questionId)));
    return inFlightResults.every(Boolean) && results.every(Boolean);
  };

  const finish = (expired = false) => {
    startSubmitTransition(async () => {
      if (!expired) {
        const saved = await flushAnswers();
        if (!saved) { toast.error("Some answers could not be saved. Please retry before submitting."); return; }
      } else {
        await flushAnswers();
      }
      const result = await submitOnlineAssessment(delivery.attempt.id);
      if (!result.success) { toast.error(result.error); return; }
      router.replace(`/dashboard/assessments/${delivery.attempt.id}/result`);
    });
  };

  useEffect(() => { finishRef.current = finish; });

  useEffect(() => {
    const startedAt = performance.now();
    const initial = initialRemainingRef.current;
    const interval = window.setInterval(() => {
      const next = Math.max(0, initial - Math.floor((performance.now() - startedAt) / 1000));
      setRemaining(next);
      if (next === 0 && !expiredRef.current) {
        expiredRef.current = true;
        window.clearInterval(interval);
        finishRef.current(true);
      }
    }, 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => () => {
    for (const timer of timersRef.current.values()) clearTimeout(timer);
  }, []);

  const answered = questions.filter((question) => answers[question.id] !== null && answers[question.id] !== undefined).length;
  const question = questions[activeIndex];
  const saveState = question ? saveStates[question.id] ?? (responseSeed.get(question.id)?.revision ? "saved" : "idle") : "idle";

  return (
    <main className="mx-auto min-h-[calc(100vh-64px)] w-full max-w-6xl px-4 py-5 sm:px-6 sm:py-7">
      <header className="sticky top-0 z-20 -mx-4 border-b bg-background/95 px-4 pb-4 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">Online test · Attempt {delivery.attempt.attemptNumber}</p>
            <h1 className="truncate text-xl font-bold tracking-tight sm:text-2xl">{delivery.paper.title}</h1>
            <p className="mt-1 text-xs text-muted-foreground">{answered} of {questions.length} answered · {delivery.paper.totalMarks} marks</p>
          </div>
          <div className="flex items-center justify-between gap-3 sm:justify-end">
            <div className={cn("inline-flex min-h-10 items-center gap-2 rounded-xl border px-3 font-mono text-sm font-semibold", remaining <= 300 && "border-destructive/40 bg-destructive/5 text-destructive")} aria-live="polite">
              <Clock3 className="size-4" /> {formatRemaining(remaining)}
            </div>
            <Button type="button" onClick={() => setConfirmOpen(true)} disabled={submitting}><Send className="size-4" /> Submit</Button>
          </div>
        </div>
      </header>

      <div className="mt-6 grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav aria-label="Question navigation" className="rounded-2xl border bg-card p-4 lg:sticky lg:top-28 lg:self-start">
          <p className="mb-3 text-sm font-semibold">Questions</p>
          <div className="grid grid-cols-5 gap-2 sm:grid-cols-10 lg:grid-cols-5">
            {questions.map((item, index) => {
              const isAnswered = answers[item.id] !== null && answers[item.id] !== undefined;
              return <button key={item.id} type="button" onClick={() => setActiveIndex(index)} aria-current={activeIndex === index ? "step" : undefined} aria-label={`Question ${item.number}${isAnswered ? ", answered" : ", unanswered"}`} className={cn("flex size-9 items-center justify-center rounded-lg border text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", activeIndex === index ? "border-primary bg-primary text-primary-foreground" : isAnswered ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-background hover:bg-muted")}>{index + 1}</button>;
            })}
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground"><CheckCircle2 className="size-3.5 text-emerald-600" /> Answered questions are highlighted.</div>
        </nav>

        {question ? <section className="rounded-2xl border bg-card p-5 shadow-sm sm:p-7" aria-labelledby={`question-${question.id}`}>
          <div className="flex items-start justify-between gap-4">
            <div><p className="text-xs font-semibold uppercase tracking-wider text-primary">Question {activeIndex + 1} of {questions.length}</p><p className="mt-1 text-xs text-muted-foreground">{question.marks} mark{question.marks === 1 ? "" : "s"} · {question.type === "TRUE_FALSE" ? "True or False" : question.type === "ASSERTION_REASON" ? "Assertion & Reasoning" : "Multiple choice"}</p></div>
            <div className="text-xs text-muted-foreground" aria-live="polite">{saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : saveState === "error" ? <span className="text-destructive">Save failed</span> : ""}</div>
          </div>
          <h2 id={`question-${question.id}`} className="mt-5 whitespace-pre-wrap text-base font-semibold leading-7 sm:text-lg">{question.text}</h2>
          <fieldset className="mt-6 space-y-3" disabled={remaining <= 0 || submitting}>
            <legend className="sr-only">Choose an answer for question {activeIndex + 1}</legend>
            {question.type === "TRUE_FALSE" ? ([true, false] as const).map((value) => {
              const selected = answers[question.id]?.kind === "boolean" && answers[question.id]?.value === value;
              return <label key={String(value)} className={cn("flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-colors", selected ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-muted/40")}><input type="radio" name={`answer-${question.id}`} checked={selected} onChange={() => changeAnswer(question.id, { kind: "boolean", value })} className="size-4 accent-primary"/><span className="font-medium">{value ? "True" : "False"}</span></label>;
            }) : question.options.map((option) => {
              const selected = answers[question.id]?.kind === "choice" && answers[question.id]?.value === option.key;
              return <label key={option.key} className={cn("flex min-h-12 cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition-colors", selected ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-muted/40")}><input type="radio" name={`answer-${question.id}`} checked={selected} onChange={() => changeAnswer(question.id, { kind: "choice", value: option.key as "A" | "B" | "C" | "D" })} className="mt-1 size-4 accent-primary"/><span><span className="mr-2 font-semibold">{option.key}.</span>{option.text}</span></label>;
            })}
          </fieldset>
          {saveState === "error" ? <div role="alert" className="mt-4 flex flex-wrap items-center gap-2 text-sm text-destructive"><AlertCircle className="size-4" /> This answer was not saved.<Button type="button" size="sm" variant="outline" onClick={() => { dirtyRef.current.add(question.id); void saveOne(question.id); }}>Retry save</Button></div> : null}
          <div className="mt-7 flex items-center justify-between gap-3 border-t pt-5">
            <Button type="button" variant="outline" onClick={() => setActiveIndex((index) => Math.max(0, index - 1))} disabled={activeIndex === 0}><ChevronLeft className="size-4" /> Previous</Button>
            <Button type="button" variant="outline" onClick={() => setActiveIndex((index) => Math.min(questions.length - 1, index + 1))} disabled={activeIndex === questions.length - 1}>Next <ChevronRight className="size-4" /></Button>
          </div>
        </section> : null}
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Submit this online test?</DialogTitle><DialogDescription>Your answers will be locked. You answered {answered} of {questions.length} questions. You have {questions.length - answered} unanswered question{questions.length - answered === 1 ? "" : "s"}.</DialogDescription></DialogHeader>
          <DialogFooter showCloseButton><Button type="button" onClick={() => { setConfirmOpen(false); finish(remaining <= 0); }} disabled={submitting}>{submitting ? "Submitting…" : "Submit test"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
