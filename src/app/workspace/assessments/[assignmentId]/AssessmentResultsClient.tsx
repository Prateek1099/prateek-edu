"use client";

import { useState, useTransition } from "react";
import { ArrowLeft, CheckCircle2, Clock3, Eye, Send, Users } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { releaseOnlineAssessmentResult } from "./actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { formatAdminDateTime } from "@/lib/admin-date-format";
import { cn } from "@/lib/utils";

type Results = Awaited<ReturnType<typeof import("@/lib/assessments/service").assessmentService.teacherResults>>;

const labels: Record<string,string> = { NOT_STARTED:"Not started", IN_PROGRESS:"In progress", SUBMITTED:"Submitted", GRADED:"Ready to release", RELEASED:"Released" };

export function AssessmentResultsClient({ initialResults }: { initialResults: Results }) {
  const [results,setResults]=useState(initialResults);
  const [pending,startTransition]=useTransition();
  const [releasing,setReleasing]=useState<string|null>(null);
  const release=(attemptId:string)=>startTransition(async()=>{
    setReleasing(attemptId);
    const result=await releaseOnlineAssessmentResult(results.id,attemptId);
    setReleasing(null);
    if(!result.success) { toast.error(result.error); return; }
    setResults(current=>({...current,summary:{...current.summary,graded:Math.max(0,current.summary.graded-1),released:current.summary.released+1},students:current.students.map(student=>student.attemptId===attemptId?{...student,status:"RELEASED"}:student)}));
    toast.success("Result released to the student.");
  });

  const cards=[
    ["Assigned",results.summary.assigned,Users],
    ["Not started",results.summary.notStarted,Clock3],
    ["In progress",results.summary.inProgress,Clock3],
    ["Submitted",results.summary.submitted,CheckCircle2],
    ["Ready",results.summary.graded,Send],
    ["Released",results.summary.released,CheckCircle2],
  ] as const;

  return <div className="mx-auto max-w-6xl space-y-7 pb-10">
    <Link href="/workspace/assessments" className={cn(buttonVariants({variant:"ghost",size:"sm"}),"-ml-2")}><ArrowLeft className="size-4"/> Online Assessments</Link>
    <header><p className="text-sm font-semibold text-primary">Assessment Results</p><h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">{results.title}</h1><p className="mt-2 text-sm text-muted-foreground">{results.className} · {results.subjectName} · {results.questionCount} questions · {results.totalMarks} marks</p></header>
    {results.cancelledAt?<div role="status" className="rounded-xl border border-destructive/25 bg-destructive/5 p-4 text-sm text-destructive">This assignment was cancelled. Students cannot access it.</div>:null}
    <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6" aria-label="Assessment summary">{cards.map(([label,value,Icon])=><div key={label} className="rounded-2xl border bg-card p-4"><Icon className="size-4 text-primary"/><p className="mt-3 text-2xl font-bold">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div>)}</section>
    <section aria-labelledby="student-results-heading"><div className="mb-3"><h2 id="student-results-heading" className="text-lg font-semibold">Student results</h2><p className="mt-1 text-sm text-muted-foreground">Release each graded result when you are ready for that student to see marks and answer review.</p></div>
      <div className="space-y-3 md:hidden">{results.students.map(student=><article key={student.recipientId} className="rounded-2xl border bg-card p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate font-semibold">{student.name||student.email||"Unnamed student"}</h3><p className="truncate text-xs text-muted-foreground">{student.email||"No email"}</p></div><span className="shrink-0 rounded-full bg-muted px-2 py-1 text-xs font-semibold">{labels[student.status]??student.status}</span></div><div className="mt-4 text-sm">{student.awardedMarks===null?<span className="text-muted-foreground">No score yet</span>:<><span className="font-semibold">{student.awardedMarks}/{student.totalMarks}</span><span className="text-muted-foreground"> · {student.percentage}%</span></>}</div>{student.attemptId&&(student.status==="GRADED"||student.status==="RELEASED")?<div className="mt-4 flex flex-wrap gap-2"><Link href={`/workspace/assessments/${results.id}/attempts/${student.attemptId}`} className={buttonVariants({variant:"outline",size:"sm"})}><Eye className="size-4"/> View answers</Link>{student.status==="GRADED"?<Button size="sm" disabled={pending} onClick={()=>release(student.attemptId!)}>{releasing===student.attemptId?"Releasing…":"Release"}</Button>:<span className="self-center text-xs font-medium text-emerald-700 dark:text-emerald-300">Released</span>}</div>:null}</article>)}</div>
      <div className="hidden overflow-x-auto rounded-2xl border bg-card md:block"><table className="w-full min-w-[800px] text-left text-sm"><thead className="border-b bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="px-4 py-3">Student</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Attempt</th><th className="px-4 py-3">Score</th><th className="px-4 py-3">Submitted</th><th className="px-4 py-3 text-right">Action</th></tr></thead><tbody className="divide-y">{results.students.map(student=><tr key={student.recipientId}><td className="px-4 py-3"><p className="font-medium">{student.name||student.email||"Unnamed student"}</p><p className="text-xs text-muted-foreground">{student.email||"No email"}</p></td><td className="px-4 py-3">{labels[student.status]??student.status}</td><td className="px-4 py-3">{student.attemptNumber??"—"}</td><td className="px-4 py-3">{student.awardedMarks===null?"—":`${student.awardedMarks}/${student.totalMarks} (${student.percentage}%)`}</td><td className="px-4 py-3">{student.submittedAt?formatAdminDateTime(student.submittedAt):"—"}</td><td className="px-4 py-3"><div className="flex justify-end gap-2">{student.attemptId&&(student.status==="GRADED"||student.status==="RELEASED")?<Link href={`/workspace/assessments/${results.id}/attempts/${student.attemptId}`} className={buttonVariants({variant:"outline",size:"sm"})}><Eye className="size-4"/> View answers</Link>:null}{student.status==="GRADED"&&student.attemptId?<Button size="sm" disabled={pending} onClick={()=>release(student.attemptId!)}>{releasing===student.attemptId?"Releasing…":"Release result"}</Button>:student.status==="RELEASED"?<span className="self-center text-xs font-medium text-emerald-700 dark:text-emerald-300">Released</span>:null}</div></td></tr>)}</tbody></table></div>
    </section>
  </div>;
}
