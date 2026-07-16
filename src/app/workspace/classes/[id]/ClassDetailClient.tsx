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
import { toast } from "sonner";
import Link from "next/link";

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

export default function ClassDetailClient({ classData }: { classData: ClassData }) {
  const [isAddOpen, setIsAddOpen] = useState(false);
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

      {/* Students */}
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
    </div>
  );
}
