"use client";

import { useMemo, useState, useTransition } from "react";
import { AlertTriangle, ArrowLeft, CalendarClock, CheckCircle2, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { assignSavedPaperOnline } from "./actions";

type Context={
  paper:{id:string;title:string;subjectName:string;totalMarks:number;questionCount:number;durationMinutes:number};
  blocker:string|null;
  classes:Array<{id:string;name:string;academicYear:string;students:Array<{id:string;name:string|null;email:string|null}>}>;
};

export default function AssignOnlineClient({context}:{context:Context}) {
  const router=useRouter();
  const [pending,startTransition]=useTransition();
  const [classId,setClassId]=useState(context.classes[0]?.id??"");
  const [audience,setAudience]=useState<"CLASS"|"SELECTED_STUDENTS">("CLASS");
  const [studentIds,setStudentIds]=useState<string[]>([]);
  const [opensAt,setOpensAt]=useState("");
  const [closesAt,setClosesAt]=useState("");
  const [duration,setDuration]=useState(context.paper.durationMinutes);
  const [attemptLimit,setAttemptLimit]=useState(1);
  const selectedClass=useMemo(()=>context.classes.find(item=>item.id===classId)??null,[classId,context.classes]);

  const submit=()=>startTransition(async()=>{
    if(!classId) { toast.error("Choose a class."); return; }
    if(audience==="SELECTED_STUDENTS"&&studentIds.length===0) { toast.error("Select at least one student."); return; }
    const open=new Date(opensAt);const close=new Date(closesAt);
    if(!Number.isFinite(open.getTime())||!Number.isFinite(close.getTime())) { toast.error("Choose valid opening and closing times."); return; }
    const result=await assignSavedPaperOnline({sourceSavedPaperId:context.paper.id,classId,audience,
      studentIds:audience==="SELECTED_STUDENTS"?studentIds:undefined,opensAt:open.toISOString(),closesAt:close.toISOString(),
      durationMinutes:duration,attemptLimit});
    if(!result.success) { toast.error(result.error); return; }
    toast.success(`Online test assigned to ${result.recipientCount} student${result.recipientCount===1?"":"s"}.`);
    router.push(`/workspace/assessments/${result.assignmentId}`);
  });

  return <div className="mx-auto max-w-4xl space-y-6 pb-10">
    <Link href={`/workspace/paper-builder/archive/${context.paper.id}`} className={cn(buttonVariants({variant:"ghost",size:"sm"}),"-ml-2")}>
      <ArrowLeft className="size-4"/> Back to saved paper
    </Link>
    <header><p className="text-sm font-semibold text-primary">Saved papers · Online test</p><h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Assign Online Test</h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">Choose who receives this formal test and when they can take it.</p></header>
    <section className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
      <h2 className="text-lg font-semibold">{context.paper.title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{context.paper.subjectName} · {context.paper.questionCount} questions · {context.paper.totalMarks} marks</p>
    </section>
    {context.blocker?<div role="alert" className="flex gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"><AlertTriangle className="mt-0.5 size-4 shrink-0"/><div><p className="font-semibold">Not ready for online delivery</p><p className="mt-1 leading-6">{context.blocker}</p></div></div>:null}
    {!context.blocker&&context.classes.length===0?<div className="flex gap-3 rounded-2xl border bg-muted/20 p-4 text-sm"><Users className="mt-0.5 size-4 shrink-0"/><div><p className="font-semibold">No eligible class</p><p className="mt-1 leading-6 text-muted-foreground">Create an active class for {context.paper.subjectName} and add students before assigning this test.</p></div></div>:null}
    {!context.blocker&&context.classes.length>0?<section className="space-y-6 rounded-2xl border bg-card p-5 shadow-sm sm:p-6" aria-labelledby="online-config-heading">
      <div><h2 id="online-config-heading" className="text-lg font-semibold">Test settings</h2><p className="mt-1 text-sm text-muted-foreground">These settings are locked after publishing.</p></div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2"><Label htmlFor="assessment-class">Class</Label><Select value={classId} onValueChange={value=>{if(value)setClassId(value);setStudentIds([])}}><SelectTrigger id="assessment-class"><SelectValue placeholder="Choose class"/></SelectTrigger><SelectContent>{context.classes.map(item=><SelectItem key={item.id} value={item.id}>{item.name} · {item.academicYear}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-2"><Label htmlFor="assessment-audience">Students</Label><Select value={audience} onValueChange={value=>{if(value)setAudience(value as typeof audience);setStudentIds([])}}><SelectTrigger id="assessment-audience"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="CLASS">Whole class</SelectItem><SelectItem value="SELECTED_STUDENTS">Selected students</SelectItem></SelectContent></Select></div>
        <div className="space-y-2"><Label htmlFor="opens-at">Opens at</Label><Input id="opens-at" type="datetime-local" value={opensAt} onChange={event=>setOpensAt(event.target.value)} required/></div>
        <div className="space-y-2"><Label htmlFor="closes-at">Closes at</Label><Input id="closes-at" type="datetime-local" value={closesAt} onChange={event=>setClosesAt(event.target.value)} required/></div>
        <div className="space-y-2"><Label htmlFor="duration">Duration (minutes)</Label><Input id="duration" type="number" min={1} max={300} value={duration} onChange={event=>setDuration(Number(event.target.value))}/></div>
        <div className="space-y-2"><Label htmlFor="attempt-limit">Attempt limit</Label><Input id="attempt-limit" type="number" min={1} max={10} value={attemptLimit} onChange={event=>setAttemptLimit(Number(event.target.value))}/></div>
      </div>
      {audience==="SELECTED_STUDENTS"?<fieldset className="space-y-2"><legend className="text-sm font-medium">Choose students</legend>
        <div className="grid max-h-64 gap-2 overflow-y-auto rounded-xl border p-3 sm:grid-cols-2">{selectedClass?.students.map(student=>{
          const checked=studentIds.includes(student.id);return <label key={student.id} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-muted/50"><Checkbox checked={checked} onCheckedChange={value=>setStudentIds(current=>value===true?Array.from(new Set([...current,student.id])):current.filter(id=>id!==student.id))}/><span className="min-w-0"><span className="block truncate text-sm font-medium">{student.name||student.email||"Unnamed student"}</span><span className="block truncate text-xs text-muted-foreground">{student.email||"No email"}</span></span></label>})}</div>
        {selectedClass?.students.length===0?<p className="text-sm text-muted-foreground">This class has no active student members.</p>:null}</fieldset>:null}
      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-emerald-800 dark:text-emerald-200"><CheckCircle2 className="mr-2 inline size-4"/>Publishing creates an immutable online copy. Later edits to the saved paper will not change this test.</div>
      <Button type="button" size="lg" className="w-full sm:w-auto" disabled={pending||selectedClass?.students.length===0} onClick={submit}><CalendarClock className="size-4"/>{pending?"Publishing…":"Publish online test"}</Button>
    </section>:null}
  </div>;
}
