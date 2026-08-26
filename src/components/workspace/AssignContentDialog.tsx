"use client";

import { useMemo, useState } from "react";
import { ClipboardCheck } from "lucide-react";
import { toast } from "sonner";

import { createWorkspaceAssignment } from "@/app/actions/workspace-assignments";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type AssignmentClassOption = {
  id: string;
  name: string;
  subjectId: string | null;
  students: Array<{
    id: string;
    name: string | null;
    email: string | null;
  }>;
};

export default function AssignContentDialog({
  challengeId,
  challengeTitle,
  subjectId,
  classes,
}: {
  challengeId: string;
  challengeTitle: string;
  subjectId: string;
  classes: AssignmentClassOption[];
}) {
  const eligibleClasses = useMemo(
    () => classes.filter((classOption) => !classOption.subjectId || classOption.subjectId === subjectId),
    [classes, subjectId],
  );
  const [open, setOpen] = useState(false);
  const [classId, setClassId] = useState("");
  const [audience, setAudience] = useState<"CLASS" | "SELECTED_STUDENTS">("CLASS");
  const [studentIds, setStudentIds] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState("");
  const [includeLateJoiners, setIncludeLateJoiners] = useState(true);
  const [pending, setPending] = useState(false);
  const selectedClass = eligibleClasses.find((classOption) => classOption.id === classId);

  const reset = () => {
    setClassId("");
    setAudience("CLASS");
    setStudentIds([]);
    setDueDate("");
    setIncludeLateJoiners(true);
  };

  const submit = async () => {
    if (!classId) return toast.error("Choose a class.");
    if (audience === "SELECTED_STUDENTS" && studentIds.length === 0) {
      return toast.error("Select at least one student.");
    }
    setPending(true);
    const result = await createWorkspaceAssignment({
      classId,
      challengeId,
      audience,
      studentIds: audience === "SELECTED_STUDENTS" ? studentIds : undefined,
      dueDate: dueDate || null,
      includeLateJoiners: audience === "CLASS" && includeLateJoiners,
    });
    setPending(false);
    if (!result.success) return toast.error(result.error);
    toast.success(result.message);
    setOpen(false);
    reset();
    window.location.reload();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) reset(); }}>
      <DialogTrigger render={<Button variant="outline" className="flex-1 gap-2" />}>
        <ClipboardCheck className="size-4" /> Assign
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader><DialogTitle>Assign “{challengeTitle}”</DialogTitle></DialogHeader>
        <div className="space-y-5 pt-2">
          <div className="space-y-2">
            <Label>Class</Label>
            <Select value={classId} onValueChange={(value) => { setClassId(value || ""); setStudentIds([]); }}>
              <SelectTrigger><SelectValue placeholder="Choose an active class" /></SelectTrigger>
              <SelectContent>{eligibleClasses.map((classOption) => <SelectItem key={classOption.id} value={classOption.id}>{classOption.name} · {classOption.students.length} students</SelectItem>)}</SelectContent>
            </Select>
            {eligibleClasses.length === 0 ? <p className="text-xs text-muted-foreground">Create an active class for this subject before assigning.</p> : null}
          </div>
          <div className="space-y-2">
            <Label>Audience</Label>
            <Select value={audience} onValueChange={(value) => { setAudience(value === "SELECTED_STUDENTS" ? "SELECTED_STUDENTS" : "CLASS"); setStudentIds([]); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="CLASS">Entire class</SelectItem><SelectItem value="SELECTED_STUDENTS">Selected students</SelectItem></SelectContent>
            </Select>
          </div>
          {audience === "SELECTED_STUDENTS" && selectedClass ? (
            <div className="space-y-2">
              <Label>Students</Label>
              <div className="max-h-52 space-y-1 overflow-y-auto rounded-xl border p-2">
                {selectedClass.students.map((student) => {
                  const checked = studentIds.includes(student.id);
                  return <label key={student.id} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2 hover:bg-muted"><Checkbox checked={checked} onCheckedChange={() => setStudentIds((current) => checked ? current.filter((id) => id !== student.id) : [...current, student.id])} /><span><span className="block text-sm font-medium">{student.name || "Unnamed student"}</span><span className="block text-xs text-muted-foreground">{student.email}</span></span></label>;
                })}
              </div>
            </div>
          ) : audience === "CLASS" ? (
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border p-3"><Checkbox checked={includeLateJoiners} onCheckedChange={(checked) => setIncludeLateJoiners(checked === true)} /><span><span className="block text-sm font-medium">Include students who join later</span><span className="block text-xs text-muted-foreground">Only active future or undated assignments are synced.</span></span></label>
          ) : null}
          <div className="space-y-2"><Label htmlFor={`due-${challengeId}`}>Due date (optional)</Label><Input id={`due-${challengeId}`} type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></div>
          <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={submit} disabled={pending || !classId}>{pending ? "Assigning..." : "Assign"}</Button></div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
