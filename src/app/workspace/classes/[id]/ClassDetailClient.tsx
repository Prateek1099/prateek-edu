"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Copy, RefreshCw, UserPlus, UserMinus, ArrowLeft } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { addStudentToClass, removeStudentFromClass, regenerateJoinCode } from "@/app/actions/class";
import { assignWorksheetToClass } from "@/app/actions/workspace-assignments";
import { toast } from "sonner";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Zap, BookOpen, Plus } from "lucide-react";

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

export default function ClassDetailClient({ 
  classData,
  unassignedChallenges,
  assignedChallenges
}: { 
  classData: ClassData;
  unassignedChallenges: any[];
  assignedChallenges: any[];
}) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [selectedChallenge, setSelectedChallenge] = useState<string>("");
  const [assigning, setAssigning] = useState(false);
  const [studentEmail, setStudentEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [joinCode, setJoinCode] = useState(classData.joinCode);

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addStudentToClass(classData.id, studentEmail);
      toast.success("Student added to class");
      setIsAddOpen(false);
      setStudentEmail("");
    } catch (err: any) {
      toast.error(err.message || "Failed");
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (studentId: string) => {
    try {
      await removeStudentFromClass(classData.id, studentId);
      toast.success("Student removed");
    } catch (err: any) {
      toast.error(err.message || "Failed");
    }
  };

  const handleRegenerate = async () => {
    try {
      const updated = await regenerateJoinCode(classData.id);
      setJoinCode(updated.joinCode);
      toast.success("Join code regenerated");
    } catch (err: any) {
      toast.error(err.message || "Failed");
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(joinCode);
    toast.success("Join code copied!");
  };

  const handleAssign = async () => {
    if (!selectedChallenge) return toast.error("Select an assignment");
    setAssigning(true);
    try {
      await assignWorksheetToClass({
        classId: classData.id,
        worksheetId: selectedChallenge
      });
      toast.success("Assignment created!");
      setIsAssignOpen(false);
      setSelectedChallenge("");
    } catch (err: any) {
      toast.error(err.message || "Failed to assign");
    } finally {
      setAssigning(false);
    }
  };

  // Filter already done on server

  return (
    <div className="space-y-8">
      <div>
        <Link href="/workspace/classes">
          <Button variant="ghost" size="sm" className="-ml-2 mb-4 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4 mr-2" /> Back to Classes
          </Button>
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{classData.name}</h1>
            <div className="flex items-center gap-3 mt-2 text-muted-foreground">
              {classData.subject && <span>{classData.subject.name}</span>}
              {classData.qualification && <span>• {classData.qualification.title}</span>}
              <span>• {classData.academicYear}</span>
            </div>
          </div>
          <Badge variant={classData.status === "ACTIVE" ? "default" : "secondary"} className={classData.status === "ACTIVE" ? "bg-emerald-600 hover:bg-emerald-700" : ""}>
            {classData.status}
          </Badge>
        </div>
      </div>

      {/* Join Code Card */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Join Code</p>
              <p className="text-2xl font-mono font-bold tracking-wider">{joinCode}</p>
              <p className="text-xs text-muted-foreground mt-1">Share this code with students to join this class.</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={copyCode}>
                <Copy className="size-4 mr-1" /> Copy
              </Button>
              <Button variant="outline" size="sm" onClick={handleRegenerate}>
                <RefreshCw className="size-4 mr-1" /> Regenerate
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="students" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="students" className="gap-2"><Users className="size-4" /> Students</TabsTrigger>
          <TabsTrigger value="assignments" className="gap-2"><BookOpen className="size-4" /> Assignments</TabsTrigger>
        </TabsList>
        
        <TabsContent value="students">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="size-5" /> Students ({classData.students.length})
                  </CardTitle>
                  <CardDescription>Students enrolled in this class.</CardDescription>
                </div>
                <Button size="sm" onClick={() => setIsAddOpen(true)}>
                  <UserPlus className="size-4 mr-2" /> Add Student
                </Button>
              </div>
            </CardHeader>
            <div className="border-t overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Enrolled</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {classData.students.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-10">
                        No students enrolled yet. Share the join code or add students manually.
                      </TableCell>
                    </TableRow>
                  ) : (
                    classData.students.map((enrollment) => (
                      <TableRow key={enrollment.id}>
                        <TableCell className="font-medium">{enrollment.student.name || "Unnamed"}</TableCell>
                        <TableCell className="text-muted-foreground">{enrollment.student.email}</TableCell>
                        <TableCell className="text-muted-foreground">{new Date(enrollment.enrolledAt).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => handleRemove(enrollment.student.id)} title="Remove student">
                            <UserMinus className="size-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>
        
        <TabsContent value="assignments">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BookOpen className="size-5" /> Assignments ({assignedChallenges.length})
                  </CardTitle>
                  <CardDescription>Worksheets and quick practice assigned to this class.</CardDescription>
                </div>
                <Button size="sm" onClick={() => setIsAssignOpen(true)}>
                  <Plus className="size-4 mr-2" /> Create Assignment
                </Button>
              </div>
            </CardHeader>
            <div className="border-t overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Difficulty</TableHead>
                    <TableHead>Est. Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignedChallenges.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-10">
                        No assignments yet. Create an assignment to assess your students.
                      </TableCell>
                    </TableRow>
                  ) : (
                    assignedChallenges.map((challenge) => (
                      <TableRow key={challenge.id}>
                        <TableCell className="font-medium">{challenge.title}</TableCell>
                        <TableCell>
                          {challenge.type === "WORKSHEET" ? (
                            <Badge variant="outline" className="gap-1 bg-blue-50 text-blue-700 border-blue-200">
                              <FileText className="size-3" /> Worksheet
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="gap-1 bg-amber-50 text-amber-700 border-amber-200">
                              <Zap className="size-3" /> Quick Practice
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="capitalize">
                            {challenge.difficulty}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {challenge.estimatedTime}m
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Student Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Student by Email</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddStudent} className="space-y-4">
            <div className="space-y-2">
              <Label>Student Email</Label>
              <Input required type="email" value={studentEmail} onChange={(e) => setStudentEmail(e.target.value)} placeholder="student@example.com" />
            </div>
            <div className="pt-2 flex justify-end">
              <Button type="submit" disabled={loading}>{loading ? "Adding..." : "Add Student"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Assign Challenge Dialog */}
      <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Assignment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Select Worksheet / Quick Practice</Label>
              <Select value={selectedChallenge} onValueChange={(val) => setSelectedChallenge(val || "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an assignment..." />
                </SelectTrigger>
                <SelectContent>
                  {unassignedChallenges.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground">All items already assigned.</div>
                  ) : (
                    unassignedChallenges.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        <div className="flex items-center gap-2">
                          {c.type === "WORKSHEET" ? <FileText className="size-3 text-blue-500" /> : <Zap className="size-3 text-amber-500" />}
                          {c.title}
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            
            <div className="pt-2 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsAssignOpen(false)}>Cancel</Button>
              <Button onClick={handleAssign} disabled={assigning || !selectedChallenge}>
                {assigning ? "Assigning..." : "Assign"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
