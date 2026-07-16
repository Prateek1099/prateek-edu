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
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, BookOpen, Copy } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createSubject, updateSubject, duplicateSubject } from "@/app/actions/academic-structure";
import { toast } from "sonner";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdminBoard } from "@/components/AdminBoardContext";

type SubjectWithRelations = {
  id: string;
  name: string;
  slug: string;
  code: string | null;
  status: string;
  sortOrder: number;
  iconType: string | null;
  iconValue: string | null;
  qualificationId: string;
  qualification: { title: string; board: { name: string; title: string } };
  _count: { topics: number };
};

type QualificationOption = {
  id: string;
  title: string;
  board: { name: string; title: string };
};

export default function AdminSubjectsClient({
  subjects,
  qualifications,
}: {
  subjects: SubjectWithRelations[];
  qualifications: QualificationOption[];
}) {
  const router = useRouter();
  const { selectedBoard } = useAdminBoard();
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDuplicateOpen, setIsDuplicateOpen] = useState(false);
  
  const [selectedSub, setSelectedSub] = useState<SubjectWithRelations | null>(null);
  const [loading, setLoading] = useState(false);

  // Form Fields
  const [qualId, setQualId] = useState("");
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState("PUBLISHED");
  const [sortOrder, setSortOrder] = useState("0");
  const [iconType, setIconType] = useState("emoji");
  const [iconValue, setIconValue] = useState("");
  
  // Duplicate Specific
  const [copyTopics, setCopyTopics] = useState(true);

  const filteredSubjects = useMemo(() => {
    if (selectedBoard === "all") return subjects;
    return subjects.filter(s => s.qualification.board.name === selectedBoard);
  }, [subjects, selectedBoard]);

  const filteredQuals = useMemo(() => {
    if (selectedBoard === "all") return qualifications;
    return qualifications.filter(q => q.board.name === selectedBoard);
  }, [qualifications, selectedBoard]);

  const resetForm = () => {
    setQualId(filteredQuals[0]?.id || "");
    setName("");
    setSlug("");
    setCode("");
    setStatus("PUBLISHED");
    setSortOrder("0");
    setIconType("emoji");
    setIconValue("");
    setSelectedSub(null);
  };

  const openAdd = () => {
    resetForm();
    setIsAddOpen(true);
  };

  const openEdit = (sub: SubjectWithRelations) => {
    setSelectedSub(sub);
    setQualId(sub.qualificationId);
    setName(sub.name);
    setSlug(sub.slug);
    setCode(sub.code || "");
    setStatus(sub.status);
    setSortOrder(sub.sortOrder.toString());
    setIconType(sub.iconType || "emoji");
    setIconValue(sub.iconValue || "");
    setIsEditOpen(true);
  };

  const openDuplicate = (sub: SubjectWithRelations) => {
    setSelectedSub(sub);
    setQualId(sub.qualificationId);
    setName(sub.name + " (Copy)");
    setSlug(sub.slug + "-copy");
    setCopyTopics(true);
    setIsDuplicateOpen(true);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qualId) return toast.error("Please select a qualification");
    setLoading(true);
    try {
      await createSubject({
        qualificationId: qualId,
        name,
        slug,
        code: code || null,
        status,
        sortOrder: parseInt(sortOrder, 10),
        iconType,
        iconValue: iconValue || null,
      });
      toast.success("Subject added");
      setIsAddOpen(false);
      resetForm();
    } catch (err: any) {
      toast.error(err.message || "Failed");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSub) return;
    setLoading(true);
    try {
      await updateSubject(selectedSub.id, {
        name,
        slug,
        code: code || null,
        status,
        sortOrder: parseInt(sortOrder, 10),
        iconType,
        iconValue: iconValue || null,
      });
      toast.success("Subject updated");
      setIsEditOpen(false);
      resetForm();
    } catch (err: any) {
      toast.error(err.message || "Failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSub) return;
    setLoading(true);
    try {
      await duplicateSubject(selectedSub.id, qualId, name, slug, copyTopics);
      toast.success("Subject duplicated successfully");
      setIsDuplicateOpen(false);
      resetForm();
    } catch (err: any) {
      toast.error(err.message || "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <BookOpen className="size-8 text-primary" />
            Subjects
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage subjects across qualifications.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={openAdd}>
            <Plus className="size-4 mr-2" />
            Add Subject
          </Button>
        </div>
      </div>

      <Card className="border border-border/80 shadow-sm">
        <CardHeader className="pb-3 space-y-0">
          <CardTitle className="text-lg">All Subjects</CardTitle>
          <CardDescription>
            Filtered by active board context: {selectedBoard === "all" ? "All Boards" : selectedBoard.toUpperCase()}
          </CardDescription>
        </CardHeader>
        <div className="border-t overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Qualification</TableHead>
                <TableHead>Subject Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Topics</TableHead>
                <TableHead>Display Order</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSubjects.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-14">
                    No subjects found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredSubjects.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <div className="font-medium text-muted-foreground">{s.qualification.title}</div>
                      <div className="text-xs text-muted-foreground/60">{s.qualification.board.title}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 font-medium">
                        {s.iconType === "emoji" && s.iconValue && <span>{s.iconValue}</span>}
                        {s.name}
                      </div>
                      <div className="text-xs text-muted-foreground">{s.slug}</div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{s.code || "—"}</TableCell>
                    <TableCell>{s._count.topics}</TableCell>
                    <TableCell>{s.sortOrder}</TableCell>
                    <TableCell>
                      <Badge variant={s.status === "PUBLISHED" ? "default" : s.status === "DRAFT" ? "secondary" : "outline"} className={s.status === "PUBLISHED" ? "bg-emerald-600 hover:bg-emerald-700" : ""}>
                        {s.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="outline" size="sm" onClick={() => openDuplicate(s)}>
                        <Copy className="size-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => openEdit(s)}>
                        <Pencil className="size-4 mr-1" /> Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Add / Edit Form Modal */}
      <Dialog open={isAddOpen || isEditOpen} onOpenChange={(open) => {
        if (!open) { setIsAddOpen(false); setIsEditOpen(false); }
      }}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditOpen ? "Edit Subject" : "Add Subject"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={isEditOpen ? handleEdit : handleAdd} className="space-y-4">
            <div className="space-y-2">
              <Label>Qualification</Label>
              <Select value={qualId} onValueChange={(val) => val && setQualId(val)}>
                <SelectTrigger><SelectValue placeholder="Select Qualification" /></SelectTrigger>
                <SelectContent>
                  {qualifications.map(q => (
                    <SelectItem key={q.id} value={q.id}>{q.title} ({q.board.title})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Subject Name</Label>
                <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Computer Science" />
              </div>
              <div className="space-y-2">
                <Label>URL Slug</Label>
                <Input required value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="e.g. computer-science" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Subject Code (Optional)</Label>
                <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. 0478" />
              </div>
              <div className="space-y-2">
                <Label>Display Order</Label>
                <Input required type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Icon Type</Label>
                <Select value={iconType} onValueChange={(val) => val && setIconType(val)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="emoji">Emoji</SelectItem>
                    <SelectItem value="image">Image URL</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Icon Value</Label>
                <Input value={iconValue} onChange={(e) => setIconValue(e.target.value)} placeholder={iconType === "emoji" ? "e.g. 💻" : "https://..."} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(val) => val && setStatus(val)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="PUBLISHED">Published</SelectItem>
                  <SelectItem value="ARCHIVED">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="pt-2 flex justify-end">
              <Button type="submit" disabled={loading}>{loading ? "Saving..." : "Save"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Duplicate Modal */}
      <Dialog open={isDuplicateOpen} onOpenChange={setIsDuplicateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Duplicate Subject</DialogTitle>
            <DialogDescription>
              Create a copy of this subject. You can choose to copy all topics over as well.
              The new subject will be created as a DRAFT.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleDuplicate} className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>Destination Qualification</Label>
              <Select value={qualId} onValueChange={(val) => val && setQualId(val)}>
                <SelectTrigger><SelectValue placeholder="Select Qualification" /></SelectTrigger>
                <SelectContent>
                  {qualifications.map(q => (
                    <SelectItem key={q.id} value={q.id}>{q.title} ({q.board.title})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>New Subject Name</Label>
              <Input required value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>New URL Slug</Label>
              <Input required value={slug} onChange={(e) => setSlug(e.target.value)} />
            </div>
            <div className="flex items-center space-x-2 pt-2">
              <input type="checkbox" id="copyTopics" checked={copyTopics} onChange={(e) => setCopyTopics(e.target.checked)} className="rounded border-gray-300" />
              <Label htmlFor="copyTopics">Copy all topics to new subject</Label>
            </div>
            <div className="pt-4 flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setIsDuplicateOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={loading}>{loading ? "Duplicating..." : "Duplicate"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
