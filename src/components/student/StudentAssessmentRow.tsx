"use client";

import { useTransition } from "react";
import { CalendarDays, CheckCircle2, Clock3, FileCheck2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { startOnlineAssessment } from "@/app/dashboard/assessments/actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { ASSESSMENT_WORK_LABELS, getAssessmentWorkState, type StudentAssessmentWorkItem } from "@/lib/assessments/presentation";
import { formatAdminDateTime } from "@/lib/admin-date-format";
import { cn } from "@/lib/utils";

export function StudentAssessmentRow({item,serverNow}:{item:StudentAssessmentWorkItem;serverNow:string}) {
  const router=useRouter();const [pending,startTransition]=useTransition();
  const state=getAssessmentWorkState(item,serverNow);
  const attempt=item.latestAttempt;
  const canTryAgain=["SUBMITTED","AWAITING_RELEASE","RELEASED"].includes(state)&&item.attemptsUsed<item.attemptLimit&&new Date(serverNow)<new Date(item.closesAt);
  const action=state==="IN_PROGRESS"&&attempt?{label:"Continue Test",href:`/dashboard/assessments/${attempt.id}`}:
    ["SUBMITTED","AWAITING_RELEASE","RELEASED"].includes(state)&&attempt?{label:state==="RELEASED"?"View Result":"View status",href:`/dashboard/assessments/${attempt.id}/result`}:null;
  const begin=()=>startTransition(async()=>{
    const result=await startOnlineAssessment(item.recipientId);
    if(!result.success) { toast.error(result.error); return; }
    router.push(`/dashboard/assessments/${result.attempt.id}`);
  });
  const statusTone=state==="CLOSED"?"text-destructive":state==="RELEASED"?"text-emerald-700 dark:text-emerald-300":state==="AWAITING_RELEASE"||state==="SUBMITTED"?"text-amber-700 dark:text-amber-300":"text-primary";

  return <article className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
    <div className="min-w-0"><div className="flex flex-wrap items-center gap-x-2 gap-y-1"><h3 className="text-sm font-semibold leading-6 sm:text-base">{item.title}</h3><span className={cn("text-xs font-semibold",statusTone)}>{state==="RELEASED"?<CheckCircle2 className="mr-1 inline size-3.5"/>:null}{ASSESSMENT_WORK_LABELS[state]}</span></div>
      <p className="mt-0.5 text-xs leading-5 text-muted-foreground sm:text-sm">Online test · {item.className} · {item.subjectName}</p>
      <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground"><span className="inline-flex items-center gap-1.5"><CalendarDays className="size-3.5"/>Closes {formatAdminDateTime(item.closesAt)}</span><span className="inline-flex items-center gap-1.5"><Clock3 className="size-3.5"/>{item.durationMinutes} minutes</span><span className="inline-flex items-center gap-1.5"><FileCheck2 className="size-3.5"/>{item.questionCount} questions · {item.totalMarks} marks</span></div>
      {state==="SCHEDULED"?<p className="mt-1.5 text-xs text-muted-foreground">Opens {formatAdminDateTime(item.opensAt)}</p>:null}
      {state==="SUBMITTED"||state==="AWAITING_RELEASE"?<p className="mt-1.5 text-xs text-muted-foreground">Your answers are locked. Your teacher has not released the result yet.</p>:null}
    </div>
    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">{action?<Link href={action.href} className={cn(buttonVariants({variant:state==="RELEASED"?"outline":"default",size:"sm"}),"min-h-10 w-full rounded-xl px-4 sm:w-auto")}>{action.label}</Link>:null}{state==="AVAILABLE"||canTryAgain?<Button type="button" size="sm" className="min-h-10 w-full rounded-xl px-4 sm:w-auto" disabled={pending} onClick={begin}>{pending?"Starting…":canTryAgain?"Start another attempt":"Start Test"}</Button>:null}</div>
  </article>;
}
