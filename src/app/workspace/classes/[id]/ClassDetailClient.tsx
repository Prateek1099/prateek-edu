"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Clock,
  Copy,
  FileText,
  Plus,
  RefreshCw,
  UserMinus,
  UserPlus,
  Users,
  XCircle,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import { addStudentToClass, regenerateJoinCode, removeStudentFromClass } from "@/app/actions/class";
import {
  cancelWorkspaceAssignment,
  createWorkspaceAssignment,
  revokeWorkspaceAssignmentRecipient,
} from "@/app/actions/workspace-assignments";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatAssignmentDueDate } from "@/lib/workspace-assignment-rules";

type StudentEnrollment = {
  id: string;
  enrolledAt: Date | string;
  student: { id: string; name: string | null; email: string | null; createdAt: Date | string };
};

type ClassData = {
  id: string;
  name: string;
  joinCode: string;
  joinCodeActive: boolean;
  academicYear: string;
  status: string;
  subject: { name: string } | null;
  qualification: { title: string } | null;
  students: StudentEnrollment[];
};

type Assignment = {
  id: string;
  audience: "CLASS" | "SELECTED_STUDENTS";
  dueDate: Date | string | null;
  includeLateJoiners: boolean;
  status: "ACTIVE" | "CANCELLED";
  createdAt: Date | string;
  cancelledAt: Date | string | null;
  challenge: {
    id: string;
    title: string;
    type: string;
    difficulty: string;
    estimatedTime: number;
  };
  summary: {
    assigned: number;
    completed: number;
    pending: number;
    overdue: number;
    averageScore: number | null;
  };
  recipients: Array<{
    id: string;
    studentId: string;
    status: "PENDING" | "COMPLETED" | "MARKED_DONE" | "OVERDUE";
    assignedAt: Date | string;
    completedAt: Date | string | null;
    attemptCount: number;
    bestPercentage: number | null;
    latestPercentage: number | null;
    mistakesCount: number;
    student: { id: string; name: string | null; email: string | null };
  }>;
};

function contentTypeLabel(type: string) {
  if (type === "QUICK_PRACTICE") return "Quick Practice";
  if (type === "PDF_WORKSHEET") return "PDF Worksheet";
  return "Worksheet";
}

export default function ClassDetailClient({
  classData,
  availableChallenges,
  assignments,
}: {
  classData: ClassData;
  availableChallenges: Array<{ id: string; title: string; type: string }>;
  assignments: Assignment[];
}) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [recipientAssignment, setRecipientAssignment] = useState<Assignment | null>(null);
  const [selectedChallenge, setSelectedChallenge] = useState("");
  const [audience, setAudience] = useState<"CLASS" | "SELECTED_STUDENTS">("CLASS");
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState("");
  const [includeLateJoiners, setIncludeLateJoiners] = useState(true);
  const [studentEmail, setStudentEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [joinCode, setJoinCode] = useState(classData.joinCode);

  const handleAddStudent = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      await addStudentToClass(classData.id, studentEmail);
      toast.success("Student added to class");
      setIsAddOpen(false);
      setStudentEmail("");
      window.location.reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add the student.");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveStudent = async (studentId: string) => {
    if (!window.confirm("Remove this student from the class? Their assignment history will be preserved.")) return;
    try {
      await removeStudentFromClass(classData.id, studentId);
      toast.success("Student removed. Class assignment access has been revoked.");
      window.location.reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not remove the student.");
    }
  };

  const handleRegenerate = async () => {
    try {
      const updated = await regenerateJoinCode(classData.id);
      setJoinCode(updated.joinCode);
      toast.success("Join code regenerated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not regenerate the code.");
    }
  };

  const resetAssignmentForm = () => {
    setSelectedChallenge("");
    setAudience("CLASS");
    setSelectedStudentIds([]);
    setDueDate("");
    setIncludeLateJoiners(true);
  };

  const handleAssign = async () => {
    if (!selectedChallenge) return toast.error("Select a worksheet or practice.");
    if (audience === "SELECTED_STUDENTS" && selectedStudentIds.length === 0) {
      return toast.error("Select at least one student.");
    }

    setLoading(true);
    const result = await createWorkspaceAssignment({
      classId: classData.id,
      challengeId: selectedChallenge,
      audience,
      studentIds: audience === "SELECTED_STUDENTS" ? selectedStudentIds : undefined,
      dueDate: dueDate || null,
      includeLateJoiners: audience === "CLASS" && includeLateJoiners,
    });
    setLoading(false);

    if (!result.success) return toast.error(result.error);
    toast.success(result.message);
    setIsAssignOpen(false);
    resetAssignmentForm();
    window.location.reload();
  };

  const handleCancelAssignment = async (assignment: Assignment) => {
    if (!window.confirm(`Cancel “${assignment.challenge.title}”? Student access will be removed, but history will be preserved.`)) return;
    const result = await cancelWorkspaceAssignment(assignment.id);
    if (!result.success) return toast.error(result.error || "Could not cancel assignment.");
    toast.success("Assignment cancelled");
    window.location.reload();
  };

  const handleRevokeRecipient = async (assignment: Assignment, studentId: string) => {
    const result = await revokeWorkspaceAssignmentRecipient(assignment.id, studentId);
    if (!result.success) return toast.error(result.error || "Could not remove recipient.");
    toast.success("Student removed from this assignment");
    window.location.reload();
  };

  return (
    <div className="space-y-8">
      <div>
        <Link href="/workspace/classes" className="inline-flex">
          <Button variant="ghost" size="sm" className="-ml-2 mb-4 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-2 size-4" /> Back to Classes
          </Button>
        </Link>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{classData.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-muted-foreground">
              {classData.subject ? <span>{classData.subject.name}</span> : null}
              {classData.qualification ? <span>· {classData.qualification.title}</span> : null}
              <span>· {classData.academicYear}</span>
            </div>
          </div>
          <Badge variant={classData.status === "ACTIVE" ? "default" : "secondary"}>{classData.status}</Badge>
        </div>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-1 text-sm font-medium text-muted-foreground">Join Code</p>
            <p className="text-2xl font-mono font-bold tracking-wider">{joinCode}</p>
            <p className="mt-1 text-xs text-muted-foreground">Share this code with student accounts only.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(joinCode); toast.success("Join code copied"); }}>
              <Copy className="mr-1 size-4" /> Copy
            </Button>
            <Button variant="outline" size="sm" onClick={handleRegenerate}>
              <RefreshCw className="mr-1 size-4" /> Regenerate
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="students" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="students" className="gap-2"><Users className="size-4" /> Students</TabsTrigger>
          <TabsTrigger value="assignments" className="gap-2"><BookOpen className="size-4" /> Assigned Work</TabsTrigger>
        </TabsList>

        <TabsContent value="students">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg"><Users className="size-5" /> Students ({classData.students.length})</CardTitle>
                  <CardDescription>Only active members of this exact class can receive assignments.</CardDescription>
                </div>
                <Button size="sm" onClick={() => setIsAddOpen(true)}><UserPlus className="mr-2 size-4" /> Add Student</Button>
              </div>
            </CardHeader>
            <div className="overflow-x-auto border-t">
              <Table>
                <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Enrolled</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                  {classData.students.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="py-10 text-center text-muted-foreground">No students enrolled yet.</TableCell></TableRow>
                  ) : classData.students.map((enrollment) => (
                    <TableRow key={enrollment.id}>
                      <TableCell className="font-medium">{enrollment.student.name || "Unnamed student"}</TableCell>
                      <TableCell className="text-muted-foreground">{enrollment.student.email}</TableCell>
                      <TableCell className="text-muted-foreground">{new Date(enrollment.enrolledAt).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right"><Button variant="ghost" size="sm" onClick={() => handleRemoveStudent(enrollment.student.id)} title="Remove student"><UserMinus className="size-4 text-destructive" /></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="assignments">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg"><BookOpen className="size-5" /> Assigned Work ({assignments.length})</CardTitle>
                  <CardDescription>Track completion, deadlines, and Quick Practice performance.</CardDescription>
                </div>
                <Button size="sm" onClick={() => setIsAssignOpen(true)} disabled={classData.status !== "ACTIVE"}>
                  <Plus className="mr-2 size-4" /> Create Assignment
                </Button>
              </div>
            </CardHeader>
            <div className="overflow-x-auto border-t">
              <Table>
                <TableHeader><TableRow><TableHead>Assignment</TableHead><TableHead>Audience</TableHead><TableHead>Due</TableHead><TableHead>Progress</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                  {assignments.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">No assignments yet.</TableCell></TableRow>
                  ) : assignments.map((assignment) => (
                    <TableRow key={assignment.id} className={assignment.status === "CANCELLED" ? "opacity-60" : ""}>
                      <TableCell>
                        <p className="font-medium">{assignment.challenge.title}</p>
                        <div className="mt-1 flex flex-wrap gap-1.5"><Badge variant="outline">{contentTypeLabel(assignment.challenge.type)}</Badge><Badge variant={assignment.status === "ACTIVE" ? "default" : "secondary"}>{assignment.status}</Badge></div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Assigned {new Date(assignment.createdAt).toLocaleDateString()}
                        </p>
                      </TableCell>
                      <TableCell>{assignment.audience === "CLASS" ? "Entire class" : "Selected students"}{assignment.audience === "CLASS" && assignment.includeLateJoiners ? <p className="text-xs text-muted-foreground">Includes eligible late joiners</p> : null}</TableCell>
                      <TableCell>{assignment.dueDate ? formatAssignmentDueDate(assignment.dueDate) : "No due date"}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1.5 text-xs">
                          <Badge variant="outline">{assignment.summary.assigned} assigned</Badge>
                          <Badge variant="outline" className="text-emerald-600"><CheckCircle2 className="size-3" /> {assignment.summary.completed}</Badge>
                          <Badge variant="outline"><Clock className="size-3" /> {assignment.summary.pending}</Badge>
                          {assignment.summary.overdue > 0 ? <Badge variant="destructive">{assignment.summary.overdue} overdue</Badge> : null}
                          {assignment.challenge.type === "QUICK_PRACTICE" && assignment.summary.averageScore !== null ? (
                            <Badge variant="outline">Avg {assignment.summary.averageScore}%</Badge>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Link href={`/workspace/classes/${classData.id}/assignments/${assignment.id}`}>
                            <Button variant="ghost" size="sm">View Details</Button>
                          </Link>
                          <Button variant="ghost" size="sm" onClick={() => setRecipientAssignment(assignment)}>Recipients</Button>
                          {assignment.status === "ACTIVE" ? <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleCancelAssignment(assignment)}><XCircle className="mr-1 size-4" /> Cancel</Button> : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Student by Email</DialogTitle></DialogHeader>
          <form onSubmit={handleAddStudent} className="space-y-4">
            <div className="space-y-2"><Label htmlFor="student-email">Student Email</Label><Input id="student-email" required type="email" value={studentEmail} onChange={(event) => setStudentEmail(event.target.value)} placeholder="student@example.com" /></div>
            <div className="flex justify-end"><Button type="submit" disabled={loading}>{loading ? "Adding..." : "Add Student"}</Button></div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isAssignOpen} onOpenChange={(open) => { setIsAssignOpen(open); if (!open) resetAssignmentForm(); }}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader><DialogTitle>Create Assignment</DialogTitle></DialogHeader>
          <div className="space-y-5 pt-2">
            <div className="space-y-2">
              <Label>Worksheet / Quick Practice</Label>
              <Select value={selectedChallenge} onValueChange={(value) => setSelectedChallenge(value || "")}>
                <SelectTrigger><SelectValue placeholder="Choose published content" /></SelectTrigger>
                <SelectContent>
                  {availableChallenges.map((challenge) => <SelectItem key={challenge.id} value={challenge.id}>{challenge.type === "QUICK_PRACTICE" ? <Zap className="size-3" /> : <FileText className="size-3" />} {challenge.title}</SelectItem>)}
                </SelectContent>
              </Select>
              {availableChallenges.length === 0 ? <p className="text-xs text-muted-foreground">No unassigned published content matches this class.</p> : null}
            </div>
            <div className="space-y-2">
              <Label>Assign to</Label>
              <Select value={audience} onValueChange={(value) => { const next = value === "SELECTED_STUDENTS" ? "SELECTED_STUDENTS" : "CLASS"; setAudience(next); setSelectedStudentIds([]); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="CLASS">Entire class ({classData.students.length})</SelectItem><SelectItem value="SELECTED_STUDENTS">Selected students</SelectItem></SelectContent>
              </Select>
            </div>
            {audience === "SELECTED_STUDENTS" ? (
              <div className="space-y-2">
                <Label>Students</Label>
                <div className="max-h-52 space-y-2 overflow-y-auto rounded-xl border p-3">
                  {classData.students.map((enrollment) => {
                    const checked = selectedStudentIds.includes(enrollment.student.id);
                    return <label key={enrollment.student.id} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2 hover:bg-muted"><Checkbox checked={checked} onCheckedChange={() => setSelectedStudentIds((current) => checked ? current.filter((id) => id !== enrollment.student.id) : [...current, enrollment.student.id])} /><span><span className="block text-sm font-medium">{enrollment.student.name || "Unnamed student"}</span><span className="block text-xs text-muted-foreground">{enrollment.student.email}</span></span></label>;
                  })}
                </div>
              </div>
            ) : (
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border p-3"><Checkbox checked={includeLateJoiners} onCheckedChange={(checked) => setIncludeLateJoiners(checked === true)} /><span><span className="block text-sm font-medium">Include students who join later</span><span className="block text-xs text-muted-foreground">Only active assignments with no due date or a future due date are synced.</span></span></label>
            )}
            <div className="space-y-2"><Label htmlFor="assignment-due-date">Due date (optional)</Label><Input id="assignment-due-date" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></div>
            <div className="rounded-xl bg-muted/50 p-3 text-sm"><strong>{audience === "CLASS" ? classData.students.length : selectedStudentIds.length}</strong> current recipient{(audience === "CLASS" ? classData.students.length : selectedStudentIds.length) === 1 ? "" : "s"}</div>
            <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setIsAssignOpen(false)}>Cancel</Button><Button onClick={handleAssign} disabled={loading || !selectedChallenge}>{loading ? "Assigning..." : "Assign"}</Button></div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(recipientAssignment)} onOpenChange={(open) => { if (!open) setRecipientAssignment(null); }}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader><DialogTitle>Assignment recipients</DialogTitle></DialogHeader>
          {recipientAssignment ? <div className="space-y-3">{recipientAssignment.recipients.length === 0 ? <p className="text-sm text-muted-foreground">No active recipients.</p> : recipientAssignment.recipients.map((recipient) => <div key={recipient.id} className="flex flex-col gap-3 rounded-xl border p-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium">{recipient.student.name || "Unnamed student"}</p><p className="text-xs text-muted-foreground">{recipient.student.email}</p></div><div className="flex items-center gap-2"><Badge variant={recipient.status === "COMPLETED" || recipient.status === "MARKED_DONE" ? "default" : recipient.status === "OVERDUE" ? "destructive" : "outline"}>{recipient.status.replace("_", " ")}</Badge>{recipientAssignment.status === "ACTIVE" ? <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleRevokeRecipient(recipientAssignment, recipient.studentId)}>Remove</Button> : null}</div></div>)}</div> : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
