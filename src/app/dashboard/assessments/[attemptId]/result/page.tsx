import { CheckCircle2, ChevronLeft, Clock3, XCircle } from "lucide-react";
import Link from "next/link";

import { assessmentService } from "@/lib/assessments/service";
import { cn } from "@/lib/utils";

export default async function StudentAssessmentResultPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await params;
  const result = await assessmentService.studentResult(attemptId);

  if (!result.released) {
    return <main className="container mx-auto min-h-[calc(100vh-64px)] max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <Link href="/dashboard/worksheets" className="inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground"><ChevronLeft className="size-4" /> Assigned work</Link>
      <section className="mt-6 rounded-2xl border bg-card p-6 text-center shadow-sm sm:p-10">
        <Clock3 className="mx-auto size-10 text-amber-600 dark:text-amber-300" />
        <h1 className="mt-4 text-2xl font-bold">Test submitted</h1>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">Your answers are locked. Your teacher will release your result after reviewing the class.</p>
        <p className="mt-4 text-sm font-medium">{result.title}</p>
      </section>
    </main>;
  }

  return <main className="container mx-auto max-w-4xl space-y-7 px-4 py-8 sm:px-6 sm:py-10">
    <Link href="/dashboard/worksheets" className="inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground"><ChevronLeft className="size-4" /> Assigned work</Link>
    <header className="rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
      <p className="text-sm font-semibold text-primary">Result released</p><h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">{result.title}</h1>
      <div className="mt-5 flex flex-wrap items-end gap-x-8 gap-y-3"><div><p className="text-3xl font-bold">{result.awardedMarks}/{result.totalMarks}</p><p className="text-sm text-muted-foreground">Marks</p></div><div><p className="text-3xl font-bold">{result.percentage}%</p><p className="text-sm text-muted-foreground">Score</p></div></div>
    </header>
    {result.paper.sections.map((section) => <section key={section.id} className="space-y-4" aria-labelledby={`result-section-${section.id}`}>
      <h2 id={`result-section-${section.id}`} className="text-lg font-semibold">{section.label}</h2>
      {section.questions.map((question) => <article key={question.id} className={cn("rounded-2xl border bg-card p-5 sm:p-6", question.correct ? "border-emerald-500/25" : "border-destructive/25")}>
        <div className="flex items-start gap-3">{question.correct ? <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" /> : <XCircle className="mt-0.5 size-5 shrink-0 text-destructive" />}<div className="min-w-0 flex-1"><p className="font-semibold leading-7">{question.number}. {question.text}</p><p className="mt-1 text-xs text-muted-foreground">{question.marks} mark{question.marks === 1 ? "" : "s"}</p></div></div>
        {question.options.length > 0 ? <div className="mt-4 grid gap-2 sm:grid-cols-2">{question.options.map((option) => <div key={option.key} className="rounded-xl border bg-muted/20 px-3 py-2 text-sm"><span className="font-semibold">{option.key}.</span> {option.text}</div>)}</div> : null}
        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2"><div className="rounded-xl bg-muted/40 p-3"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Your answer</p><p className="mt-1 font-medium">{question.response ? String(question.response.value) : "Unanswered"}</p></div><div className="rounded-xl bg-emerald-500/8 p-3"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Correct answer</p><p className="mt-1 font-medium">{String(question.correctResponse.value)}</p></div></div>
        {question.explanation ? <div className="mt-3 rounded-xl border p-3 text-sm leading-6"><span className="font-semibold">Explanation:</span> {question.explanation}</div> : null}
      </article>)}
    </section>)}
  </main>;
}
