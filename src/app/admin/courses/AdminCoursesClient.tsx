"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Trash2, BookOpen } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { createCourse, updateCourse, deleteCourse } from "@/app/actions/admin";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type SubjectOption = { id: string; label: string };

type CourseRow = {
  id: string;
  title: string;
  description: string | null;
  price: number;
  subjectId: string;
  subject: {
    name: string;
    code: string | null;
    qualification: { title: string };
  };
};

export default function AdminCoursesClient({
  courses,
  subjectOptions,
}: {
  courses: CourseRow[];
  subjectOptions: SubjectOption[];
}) {
  const router = useRouter();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<CourseRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [tableSearch, setTableSearch] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [subjectId, setSubjectId] = useState(subjectOptions[0]?.id ?? "");

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setPrice("");
    setSubjectId(subjectOptions[0]?.id ?? "");
    setSelectedCourse(null);
  };

  const refresh = () => router.refresh();

  const openAdd = () => {
    resetForm();
    setIsAddOpen(true);
  };

  const openEdit = (course: CourseRow) => {
    setSelectedCourse(course);
    setTitle(course.title);
    setDescription(course.description || "");
    setPrice(course.price.toString());
    setSubjectId(course.subjectId);
    setIsEditOpen(true);
  };

  const openDelete = (course: CourseRow) => {
    setSelectedCourse(course);
    setIsDeleteOpen(true);
  };

  const filteredCourses = useMemo(() => {
    const q = tableSearch.trim().toLowerCase();
    if (!q) return courses;
    return courses.filter((c) => {
      const sub = `${c.subject.name} ${c.subject.code ?? ""} ${c.subject.qualification.title}`.toLowerCase();
      return (
        c.title.toLowerCase().includes(q) ||
        (c.description ?? "").toLowerCase().includes(q) ||
        sub.includes(q) ||
        String(c.price).includes(q)
      );
    });
  }, [courses, tableSearch]);

  const SubjectSelect = ({ id }: { id: string }) => (
    <div className="space-y-2">
      <Label htmlFor={id}>Subject</Label>
      <Select value={subjectId} onValueChange={(v) => setSubjectId(v ?? "")}>
        <SelectTrigger id={id}>
          <SelectValue placeholder="Choose subject" />
        </SelectTrigger>
        <SelectContent className="max-h-72 overflow-y-auto">
          {subjectOptions.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectId) {
      toast.error("Choose a subject");
      return;
    }
    setLoading(true);
    const res = await createCourse({
      title,
      description: description.trim() === "" ? null : description,
      price: parseFloat(price) || 0,
      subjectId,
    });
    setLoading(false);
    if (res.success) {
      toast.success("Course added");
      setIsAddOpen(false);
      resetForm();
      refresh();
    } else {
      toast.error(res.error || "Failed");
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse) return;
    if (!subjectId) {
      toast.error("Choose a subject");
      return;
    }
    setLoading(true);
    const res = await updateCourse(selectedCourse.id, {
      title,
      description: description.trim() === "" ? null : description,
      price: parseFloat(price) || 0,
      subjectId,
    });
    setLoading(false);
    if (res.success) {
      toast.success("Course updated");
      setIsEditOpen(false);
      resetForm();
      refresh();
    } else {
      toast.error(res.error || "Failed");
    }
  };

  const handleDelete = async () => {
    if (!selectedCourse) return;
    setLoading(true);
    const res = await deleteCourse(selectedCourse.id);
    setLoading(false);
    if (res.success) {
      toast.success("Course deleted");
      setIsDeleteOpen(false);
      resetForm();
      refresh();
    } else {
      toast.error(res.error || "Failed");
    }
  };

  const formFields = (idPrefix: "add-course" | "edit-course") => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-title`}>Title</Label>
        <Input
          id={`${idPrefix}-title`}
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. IGCSE Computer Science — full course"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-desc`}>Description</Label>
        <Textarea
          id={`${idPrefix}-desc`}
          className="min-h-[100px] resize-y"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What students get, duration, format…"
        />
      </div>
      <SubjectSelect id={`${idPrefix}-subject`} />
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-price`}>Price (₹)</Label>
        <Input
          id={`${idPrefix}-price`}
          required
          type="number"
          min="0"
          step="0.01"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="0"
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <BookOpen className="size-8 text-primary" />
            Courses
          </h1>
          <p className="text-muted-foreground mt-1 max-w-xl">
            Sellable courses linked to a subject. Students see these on the public courses page after you publish pricing and copy here.
          </p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="size-4" />
          Add course
        </Button>
      </div>

      <Card className="border border-border/80 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Catalog</CardTitle>
          <CardDescription>Filter by title, description, subject, or price.</CardDescription>
        </CardHeader>
        <div className="px-6 pb-4 max-w-md">
          <Input
            placeholder="Filter courses…"
            value={tableSearch}
            onChange={(e) => setTableSearch(e.target.value)}
          />
        </div>
        <div className="border-t overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead className="w-28">Price</TableHead>
                <TableHead className="text-right w-52">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCourses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-14">
                    No courses match this filter.
                  </TableCell>
                </TableRow>
              ) : (
                filteredCourses.map((course) => (
                  <TableRow key={course.id}>
                    <TableCell>
                      <div className="font-medium">{course.title}</div>
                      {course.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1 max-w-md">
                          {course.description}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">{course.subject.name}</div>
                      <div className="text-xs text-muted-foreground">{course.subject.qualification.title}</div>
                    </TableCell>
                    <TableCell className="tabular-nums">₹{course.price}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit(course)}>
                        <Pencil className="size-4" /> Edit
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => openDelete(course)}>
                        <Trash2 className="size-4" /> Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add course</DialogTitle>
            <DialogDescription>Create a priced offering tied to one subject.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4">
            {formFields("add-course")}
            <DialogFooter>
              <Button type="submit" disabled={loading}>
                {loading ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit course</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            {formFields("edit-course")}
            <DialogFooter>
              <Button type="submit" disabled={loading}>
                {loading ? "Saving…" : "Update"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete course</DialogTitle>
            <DialogDescription>
              Remove <span className="font-medium">{selectedCourse?.title}</span>? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={loading}>
              {loading ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
