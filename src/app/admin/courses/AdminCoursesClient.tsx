"use client";

import { useState } from "react";
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
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { createCourse, updateCourse, deleteCourse } from "@/app/actions/admin";
import { toast } from "sonner";

export default function AdminCoursesClient({ courses }: { courses: any[] }) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [subjectId, setSubjectId] = useState("");

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setPrice("");
    setSubjectId("");
    setSelectedCourse(null);
  };

  const openEdit = (course: any) => {
    setSelectedCourse(course);
    setTitle(course.title);
    setDescription(course.description || "");
    setPrice(course.price.toString());
    setSubjectId(course.subjectId || "");
    setIsEditOpen(true);
  };

  const openDelete = (course: any) => {
    setSelectedCourse(course);
    setIsDeleteOpen(true);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await createCourse({
      title,
      description: description || null,
      price: parseFloat(price) || 0,
      subjectId,
    });
    setLoading(false);
    if (res.success) {
      toast.success("Course added successfully");
      setIsAddOpen(false);
      resetForm();
    } else {
      toast.error(res.error || "Failed to add course");
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await updateCourse(selectedCourse.id, {
      title,
      description: description || null,
      price: parseFloat(price) || 0,
      subjectId,
    });
    setLoading(false);
    if (res.success) {
      toast.success("Course updated successfully");
      setIsEditOpen(false);
      resetForm();
    } else {
      toast.error(res.error || "Failed to update course");
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    const res = await deleteCourse(selectedCourse.id);
    setLoading(false);
    if (res.success) {
      toast.success("Course deleted successfully");
      setIsDeleteOpen(false);
      resetForm();
    } else {
      toast.error(res.error || "Failed to delete course");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Courses</h1>
        <Button onClick={() => { resetForm(); setIsAddOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Add Course
        </Button>
      </div>
      
      <div className="border rounded-md bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Subject ID</TableHead>
              <TableHead>Price</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {courses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No courses found. Create one to get started.
                </TableCell>
              </TableRow>
            ) : (
              courses.map((course: any) => (
                <TableRow key={course.id}>
                  <TableCell className="font-medium">{course.title}</TableCell>
                  <TableCell>{course.subjectId}</TableCell>
                  <TableCell>₹{course.price}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="outline" size="sm" onClick={() => openEdit(course)}>
                      <Pencil className="w-4 h-4 mr-1" /> Edit
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => openDelete(course)}>
                      <Trash2 className="w-4 h-4 mr-1" /> Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add Modal */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Course</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input required value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. IGCSE ICT Full Course" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional description" />
            </div>
            <div className="space-y-2">
              <Label>Subject ID</Label>
              <Input required value={subjectId} onChange={e => setSubjectId(e.target.value)} placeholder="e.g. cuid..." />
            </div>
            <div className="space-y-2">
              <Label>Price (₹)</Label>
              <Input required type="number" min="0" step="1" value={price} onChange={e => setPrice(e.target.value)} placeholder="e.g. 500" />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={loading}>{loading ? "Saving..." : "Save Course"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Course</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input required value={title} onChange={e => setTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={description} onChange={e => setDescription(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Subject ID</Label>
              <Input required value={subjectId} onChange={e => setSubjectId(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Price (₹)</Label>
              <Input required type="number" min="0" step="1" value={price} onChange={e => setPrice(e.target.value)} />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={loading}>{loading ? "Saving..." : "Save Changes"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Modal */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Course</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedCourse?.title}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)} disabled={loading}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={loading}>{loading ? "Deleting..." : "Delete"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
