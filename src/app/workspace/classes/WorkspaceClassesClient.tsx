"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Users, Copy, BookOpen, Archive } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createClass, archiveClass } from "@/app/actions/class";
import { toast } from "sonner";
import Link from "next/link";

type ClassItem = {
  id: string;
  name: string;
  academicYear: string;
  joinCode: string;
  joinCodeActive: boolean;
  status: string;
  subject: { name: string } | null;
  qualification: { title: string } | null;
  _count: { students: number };
};

type SubjectOption = {
  id: string;
  name: string;
  qualification: { title: string; board: { title: string } };
};

type QualOption = {
  id: string;
  title: string;
  board: { title: string };
};

export default function WorkspaceClassesClient({
  classes,
  subjects,
  qualifications,
}: {
  classes: ClassItem[];
  subjects: SubjectOption[];
  qualifications: QualOption[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [qualificationId, setQualificationId] = useState("");
  const [academicYear, setAcademicYear] = useState("2026-2027");
  const [maxStudents, setMaxStudents] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createClass({
        name,
        subjectId: subjectId || null,
        qualificationId: qualificationId || null,
        academicYear,
        maxStudents: maxStudents ? parseInt(maxStudents) : null,
      });
      toast.success("Class created successfully!");
      setIsOpen(false);
      setName("");
      setSubjectId("");
      setQualificationId("");
      setMaxStudents("");
    } catch (err: any) {
      toast.error(err.message || "Failed to create class");
    } finally {
      setLoading(false);
    }
  };

  const handleArchive = async (classId: string) => {
    try {
      await archiveClass(classId);
      toast.success("Class archived");
    } catch (err: any) {
      toast.error(err.message || "Failed");
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Join code copied!");
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <BookOpen className="size-8 text-primary" />
            Classes
          </h1>
          <p className="text-muted-foreground mt-1">Manage your classes and students.</p>
        </div>
        <Button onClick={() => setIsOpen(true)}>
          <Plus className="size-4 mr-2" /> Create Class
        </Button>
      </div>

      {classes.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <BookOpen className="size-12 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-xl font-semibold mb-2">No classes yet</h3>
            <p className="text-muted-foreground mb-6">Create your first class to start managing students.</p>
            <Button onClick={() => setIsOpen(true)}>
              <Plus className="size-4 mr-2" /> Create Your First Class
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {classes.map((cls) => (
            <Card key={cls.id} className={cls.status === "ARCHIVED" ? "opacity-60" : "hover:border-primary/50 transition-all hover:shadow-md"}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-2">
                  <Link href={`/workspace/classes/${cls.id}`} className="flex-1">
                    <h3 className="font-semibold text-lg hover:text-primary transition-colors">{cls.name}</h3>
                  </Link>
                  <Badge variant={cls.status === "ACTIVE" ? "default" : "secondary"} className={cls.status === "ACTIVE" ? "bg-emerald-600 hover:bg-emerald-700" : ""}>
                    {cls.status}
                  </Badge>
                </div>
                {cls.subject && <p className="text-sm text-muted-foreground">{cls.subject.name}</p>}
                {cls.qualification && <p className="text-xs text-muted-foreground/70">{cls.qualification.title}</p>}
                <p className="text-xs text-muted-foreground/70 mt-1">{cls.academicYear}</p>

                <div className="flex items-center justify-between mt-4 pt-3 border-t">
                  <span className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Users className="size-3.5" /> {cls._count.students} students
                  </span>
                  <button
                    onClick={() => copyCode(cls.joinCode)}
                    className="flex items-center gap-1 text-xs font-mono bg-muted px-2 py-1 rounded hover:bg-muted/80 transition-colors"
                    title="Click to copy join code"
                  >
                    <Copy className="size-3" /> {cls.joinCode}
                  </button>
                </div>

                {cls.status === "ACTIVE" && (
                  <div className="mt-3 flex gap-2">
                    <Link href={`/workspace/classes/${cls.id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full">Manage</Button>
                    </Link>
                    <Button variant="ghost" size="sm" onClick={() => handleArchive(cls.id)} title="Archive">
                      <Archive className="size-4 text-muted-foreground" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Class Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Class</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label>Class Name</Label>
              <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Class 10-A Computer Science" />
            </div>
            <div className="space-y-2">
              <Label>Subject (Optional)</Label>
              <Select value={subjectId} onValueChange={(val) => val && setSubjectId(val)}>
                <SelectTrigger><SelectValue placeholder="Select Subject" /></SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name} ({s.qualification.title} • {s.qualification.board.title})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Qualification (Optional)</Label>
              <Select value={qualificationId} onValueChange={(val) => val && setQualificationId(val)}>
                <SelectTrigger><SelectValue placeholder="Select Qualification" /></SelectTrigger>
                <SelectContent>
                  {qualifications.map((q) => (
                    <SelectItem key={q.id} value={q.id}>{q.title} ({q.board.title})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Academic Year</Label>
                <Input required value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Max Students</Label>
                <Input type="number" value={maxStudents} onChange={(e) => setMaxStudents(e.target.value)} placeholder="Unlimited" />
              </div>
            </div>
            <div className="pt-2 flex justify-end">
              <Button type="submit" disabled={loading}>{loading ? "Creating..." : "Create Class"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
