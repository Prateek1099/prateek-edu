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
import { Plus, Pencil, Trash2, BookOpen, Users, Eye, EyeOff } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { createCourse, updateCourse, deleteCourse, toggleCoursePublished } from "@/app/actions/admin";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type SubjectOption = { id: string; label: string };

type CourseRow = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  shortDescription: string | null;
  imageUrl: string | null;
  price: number;
  isPublished: boolean;
  level: string | null;
  language: string | null;
  instructorName: string | null;
  learningOutcomes: string | null;
  requirements: string | null;
  targetAudience: string | null;
  subjectId: string;
  createdAt: Date;
  _count: {
    enrollments: number;
    payments: number;
  };
  subject: {
    name: string;
    code: string | null;
    qualification: { 
      title: string;
      board: { title: string };
    };
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
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "draft">("all");

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [price, setPrice] = useState("");
  const [isPublished, setIsPublished] = useState(false);
  const [level, setLevel] = useState("");
  const [language, setLanguage] = useState("English");
  const [instructorName, setInstructorName] = useState("");
  const [learningOutcomes, setLearningOutcomes] = useState("");
  const [requirements, setRequirements] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [subjectId, setSubjectId] = useState(subjectOptions[0]?.id ?? "");

  const resetForm = () => {
    setTitle("");
    setSlug("");
    setDescription("");
    setShortDescription("");
    setImageUrl("");
    setPrice("");
    setIsPublished(false);
    setLevel("");
    setLanguage("English");
    setInstructorName("");
    setLearningOutcomes("");
    setRequirements("");
    setTargetAudience("");
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
    setSlug(course.slug);
    setDescription(course.description || "");
    setShortDescription(course.shortDescription || "");
    setImageUrl(course.imageUrl || "");
    setPrice(course.price.toString());
    setIsPublished(course.isPublished);
    setLevel(course.level || "");
    setLanguage(course.language || "English");
    setInstructorName(course.instructorName || "");
    setLearningOutcomes(course.learningOutcomes || "");
    setRequirements(course.requirements || "");
    setTargetAudience(course.targetAudience || "");
    setSubjectId(course.subjectId);
    setIsEditOpen(true);
  };

  const openDelete = (course: CourseRow) => {
    setSelectedCourse(course);
    setIsDeleteOpen(true);
  };

  const filteredCourses = useMemo(() => {
    const q = tableSearch.trim().toLowerCase();
    return courses.filter((c) => {
      if (statusFilter === "published" && !c.isPublished) return false;
      if (statusFilter === "draft" && c.isPublished) return false;
      if (!q) return true;
      const sub = `${c.subject.name} ${c.subject.code ?? ""} ${c.subject.qualification.title}`.toLowerCase();
      return (
        c.title.toLowerCase().includes(q) ||
        (c.description ?? "").toLowerCase().includes(q) ||
        sub.includes(q) ||
        String(c.price).includes(q)
      );
    });
  }, [courses, statusFilter, tableSearch]);

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

  const handleTogglePublish = async (course: CourseRow) => {
    const res = await toggleCoursePublished(course.id);
    if (res.success) {
      toast.success(course.isPublished ? "Course unpublished" : "Course published");
      refresh();
    } else {
      toast.error(res.error || "Failed to toggle status");
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectId) {
      toast.error("Choose a subject");
      return;
    }
    setLoading(true);
    const res = await createCourse({
      title,
      slug,
      description: description.trim() === "" ? null : description,
      shortDescription: shortDescription.trim() === "" ? null : shortDescription,
      imageUrl: imageUrl.trim() === "" ? null : imageUrl,
      price: parseFloat(price) || 0,
      isPublished,
      level: level.trim() === "" ? null : level,
      language: language.trim() === "" ? null : language,
      instructorName: instructorName.trim() === "" ? null : instructorName,
      learningOutcomes: learningOutcomes.trim() === "" ? null : learningOutcomes,
      requirements: requirements.trim() === "" ? null : requirements,
      targetAudience: targetAudience.trim() === "" ? null : targetAudience,
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
      slug,
      description: description.trim() === "" ? null : description,
      shortDescription: shortDescription.trim() === "" ? null : shortDescription,
      imageUrl: imageUrl.trim() === "" ? null : imageUrl,
      price: parseFloat(price) || 0,
      isPublished,
      level: level.trim() === "" ? null : level,
      language: language.trim() === "" ? null : language,
      instructorName: instructorName.trim() === "" ? null : instructorName,
      learningOutcomes: learningOutcomes.trim() === "" ? null : learningOutcomes,
      requirements: requirements.trim() === "" ? null : requirements,
      targetAudience: targetAudience.trim() === "" ? null : targetAudience,
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

  const selectedCourseHasHistory =
    (selectedCourse?._count.enrollments ?? 0) > 0 ||
    (selectedCourse?._count.payments ?? 0) > 0;
  const selectedCourseDeleteBlocked =
    Boolean(selectedCourse?.isPublished) || selectedCourseHasHistory;

  const formFields = (idPrefix: "add-course" | "edit-course") => (
    <div className="space-y-5">
      <section className="space-y-4 rounded-xl border bg-card p-5">
        <div>
          <h3 className="font-semibold">1. Basic details</h3>
          <p className="text-sm text-muted-foreground">The title and copy students see in the course catalog.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-title`}>Title <span className="text-destructive">*</span></Label>
            <Input
              id={`${idPrefix}-title`}
              required
              value={title}
              onChange={(e) => {
                const nextTitle = e.target.value;
                setTitle(nextTitle);
                if (isAddOpen) {
                  setSlug(nextTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""));
                }
              }}
              placeholder="e.g. IGCSE Computer Science"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-slug`}>Slug <span className="text-destructive">*</span></Label>
            <Input
              id={`${idPrefix}-slug`}
              required
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              placeholder="e.g. igcse-computer-science"
            />
            <p className="text-xs text-muted-foreground">Lowercase URL text; changing it changes the public course URL.</p>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-short-desc`}>Short description</Label>
          <Textarea
            id={`${idPrefix}-short-desc`}
            className="min-h-24 resize-y"
            value={shortDescription}
            onChange={(e) => setShortDescription(e.target.value)}
            placeholder="Brief summary for catalog cards…"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-desc`}>Full description</Label>
          <Textarea
            id={`${idPrefix}-desc`}
            className="min-h-36 resize-y"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Full course details for the detail page…"
          />
        </div>
      </section>

      <section className="space-y-4 rounded-xl border bg-card p-5">
        <div>
          <h3 className="font-semibold">2. Board and subject</h3>
          <p className="text-sm text-muted-foreground">Place the course in the correct academic catalog.</p>
        </div>
        <SubjectSelect id={`${idPrefix}-subject`} />
      </section>

      <section className="space-y-4 rounded-xl border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold">3. Pricing</h3>
            <p className="text-sm text-muted-foreground">Set ₹0 for a free course. Existing payment behavior is unchanged.</p>
          </div>
          <Badge variant={Number(price || 0) > 0 ? "default" : "secondary"}>
            {Number(price || 0) > 0 ? "Paid course" : "Free course"}
          </Badge>
        </div>
        <div className="max-w-sm space-y-2">
          <Label htmlFor={`${idPrefix}-price`}>Price (₹) <span className="text-destructive">*</span></Label>
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
      </section>

      <section className="space-y-4 rounded-xl border bg-card p-5">
        <div>
          <h3 className="font-semibold">4. Instructor and learning details</h3>
          <p className="text-sm text-muted-foreground">Optional information used on the public detail page.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-instructor`}>Instructor name</Label>
            <Input id={`${idPrefix}-instructor`} value={instructorName} onChange={(e) => setInstructorName(e.target.value)} placeholder="e.g. Jane Doe" />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-level`}>Level</Label>
            <Input id={`${idPrefix}-level`} value={level} onChange={(e) => setLevel(e.target.value)} placeholder="e.g. Beginner" />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-language`}>Language</Label>
            <Input id={`${idPrefix}-language`} value={language} onChange={(e) => setLanguage(e.target.value)} placeholder="e.g. English" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-outcomes`}>Learning outcomes</Label>
            <Textarea id={`${idPrefix}-outcomes`} className="min-h-32 resize-y" value={learningOutcomes} onChange={(e) => setLearningOutcomes(e.target.value)} placeholder="What will students learn? One item per line." />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-requirements`}>Requirements</Label>
            <Textarea id={`${idPrefix}-requirements`} className="min-h-32 resize-y" value={requirements} onChange={(e) => setRequirements(e.target.value)} placeholder="Prerequisites, one item per line." />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-audience`}>Target audience</Label>
          <Textarea id={`${idPrefix}-audience`} className="min-h-24 resize-y" value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)} placeholder="Who is this course for?" />
        </div>
      </section>

      <section className="space-y-4 rounded-xl border bg-card p-5">
        <div>
          <h3 className="font-semibold">5. Thumbnail</h3>
          <p className="text-sm text-muted-foreground">Use an existing secure public image URL.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-image`}>Thumbnail or image URL</Label>
          <Input id={`${idPrefix}-image`} type="url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://…" />
        </div>
      </section>

      <section className="space-y-4 rounded-xl border bg-card p-5">
        <div>
          <h3 className="font-semibold">6. Publishing</h3>
          <p className="text-sm text-muted-foreground">Draft courses stay out of the public catalog.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Button type="button" variant={!isPublished ? "default" : "outline"} onClick={() => setIsPublished(false)}>
            Save as draft
          </Button>
          <Button type="button" variant={isPublished ? "default" : "outline"} onClick={() => setIsPublished(true)}>
            Publish course
          </Button>
        </div>
      </section>
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

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border border-border/80 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Courses</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{courses.length}</div>
          </CardContent>
        </Card>
        <Card className="border border-border/80 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Enrollments</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{courses.reduce((sum, c) => sum + (c._count?.enrollments || 0), 0)}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-border/80 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Catalog</CardTitle>
          <CardDescription>Filter by title, description, subject, or price.</CardDescription>
        </CardHeader>
        <div className="grid gap-3 px-4 pb-4 sm:px-6 md:max-w-2xl md:grid-cols-[minmax(220px,1fr)_180px]">
          <Input
            placeholder="Filter courses…"
            value={tableSearch}
            onChange={(e) => setTableSearch(e.target.value)}
          />
          <Select
            value={statusFilter}
            onValueChange={(value) =>
              setStatusFilter((value || "all") as "all" | "published" | "draft")
            }
          >
            <SelectTrigger aria-label="Filter courses by publish status">
              <SelectValue>
                {statusFilter === "all"
                  ? "All statuses"
                  : statusFilter === "published"
                    ? "Published"
                    : "Draft"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="hidden border-t overflow-x-auto lg:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead className="w-24">Price</TableHead>
                <TableHead className="w-28 text-center">Status</TableHead>
                <TableHead className="w-20 text-right">Enrolled</TableHead>
                <TableHead className="text-right w-64">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCourses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-14">
                    No courses match this filter.
                  </TableCell>
                </TableRow>
              ) : (
                filteredCourses.map((course) => (
                  <TableRow key={course.id}>
                    <TableCell>
                      <div className="font-medium">{course.title}</div>
                      {course.shortDescription && (
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-1 max-w-sm">
                          {course.shortDescription}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">{course.subject.name}</div>
                      <div className="text-xs text-muted-foreground">{course.subject.qualification.board.title} &gt; {course.subject.qualification.title}</div>
                    </TableCell>
                    <TableCell className="tabular-nums font-medium">₹{course.price.toLocaleString("en-IN")}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={course.isPublished ? "default" : "secondary"}>
                        {course.isPublished ? "Published" : "Draft"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{course._count?.enrollments || 0}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="ghost" size="icon" title={course.isPublished ? "Unpublish" : "Publish"} onClick={() => handleTogglePublish(course)}>
                        {course.isPublished ? <EyeOff className="size-4" /> : <Eye className="size-4 text-emerald-500" />}
                      </Button>
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
        <div className="grid gap-4 border-t p-4 sm:grid-cols-2 lg:hidden">
          {filteredCourses.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground sm:col-span-2">
              No courses match this filter.
            </div>
          ) : (
            filteredCourses.map((course) => (
              <article key={course.id} className="space-y-4 rounded-xl border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold leading-snug">{course.title}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {course.subject.name} · {course.subject.qualification.title}
                    </p>
                  </div>
                  <Badge variant={course.isPublished ? "default" : "secondary"}>
                    {course.isPublished ? "Published" : "Draft"}
                  </Badge>
                </div>
                {course.shortDescription && (
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {course.shortDescription}
                  </p>
                )}
                <div className="flex items-center justify-between rounded-lg bg-muted/40 p-3">
                  <span className="font-semibold">₹{course.price.toLocaleString("en-IN")}</span>
                  <span className="text-xs text-muted-foreground">
                    {course._count.enrollments} enrolled
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Button variant="ghost" size="sm" onClick={() => handleTogglePublish(course)}>
                    {course.isPublished ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    <span className="sr-only">{course.isPublished ? "Unpublish" : "Publish"}</span>
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => openEdit(course)}>
                    <Pencil className="size-4" />
                    Edit
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => openDelete(course)}>
                    <Trash2 className="size-4" />
                    <span className="sr-only">Delete</span>
                  </Button>
                </div>
              </article>
            ))
          )}
        </div>
      </Card>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-h-[94vh] overflow-y-auto p-0 sm:max-w-5xl">
          <DialogHeader>
            <div className="border-b px-6 py-5">
              <DialogTitle>Add course</DialogTitle>
              <DialogDescription className="mt-1">Create a catalog offering without changing curriculum or payment logic.</DialogDescription>
            </div>
          </DialogHeader>
          <form onSubmit={handleAdd}>
            <div className="bg-muted/20 px-4 py-5 sm:px-6">{formFields("add-course")}</div>
            <DialogFooter className="sticky bottom-0 border-t bg-background/95 px-6 py-4 backdrop-blur">
              <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Saving…" : isPublished ? "Save and publish" : "Save draft"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-h-[94vh] overflow-y-auto p-0 sm:max-w-5xl">
          <DialogHeader>
            <div className="border-b px-6 py-5">
              <DialogTitle>Edit course</DialogTitle>
              <DialogDescription className="mt-1">Update catalog details, pricing, and publishing state.</DialogDescription>
            </div>
          </DialogHeader>
          <form onSubmit={handleEdit}>
            <div className="bg-muted/20 px-4 py-5 sm:px-6">{formFields("edit-course")}</div>
            <DialogFooter className="sticky bottom-0 border-t bg-background/95 px-6 py-4 backdrop-blur">
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Saving…" : "Save changes"}
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
              {selectedCourse?.isPublished
                ? "Unpublish this course before deleting it."
                : selectedCourseHasHistory
                  ? `This course has ${selectedCourse?._count.enrollments ?? 0} enrollment(s) and ${selectedCourse?._count.payments ?? 0} attributed payment record(s). It cannot be deleted; keep it unpublished to preserve history.`
                  : <>Remove <span className="font-medium">{selectedCourse?.title}</span>? Only this history-free draft course and its catalog content will be deleted.</>}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={loading || selectedCourseDeleteBlocked}
            >
              {loading ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
