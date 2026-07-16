"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, FileText, Pencil, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createWorkspaceContent, updateWorkspaceContent, deleteWorkspaceContent } from "@/app/actions/workspace-content";
import { toast } from "sonner";

type ContentItem = {
  id: string;
  type: string;
  title: string;
  description: string | null;
  pdfUrl: string | null;
  status: string;
  createdAt: Date | string;
  subject: { name: string } | null;
  topic: { topicName: string } | null;
};

type SubjectOption = {
  id: string;
  name: string;
  qualification: { title: string; board: { title: string } };
};

export default function WorkspaceContentClient({
  content,
  subjects,
}: {
  content: ContentItem[];
  subjects: SubjectOption[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [editItem, setEditItem] = useState<ContentItem | null>(null);
  const [loading, setLoading] = useState(false);

  const [type, setType] = useState("NOTE");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [pdfUrl, setPdfUrl] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [status, setStatus] = useState("DRAFT");

  const resetForm = () => {
    setType("NOTE");
    setTitle("");
    setDescription("");
    setPdfUrl("");
    setSubjectId("");
    setStatus("DRAFT");
    setEditItem(null);
  };

  const openAdd = () => { resetForm(); setIsOpen(true); };

  const openEdit = (item: ContentItem) => {
    setEditItem(item);
    setType(item.type);
    setTitle(item.title);
    setDescription(item.description || "");
    setPdfUrl(item.pdfUrl || "");
    setSubjectId(item.subject ? subjects.find(s => s.name === item.subject!.name)?.id || "" : "");
    setStatus(item.status);
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editItem) {
        await updateWorkspaceContent(editItem.id, {
          title,
          description: description || undefined,
          pdfUrl: pdfUrl || undefined,
          subjectId: subjectId || null,
          status,
        });
        toast.success("Content updated");
      } else {
        await createWorkspaceContent({
          type,
          title,
          description: description || undefined,
          pdfUrl: pdfUrl || undefined,
          subjectId: subjectId || null,
          status,
        });
        toast.success("Content added");
      }
      setIsOpen(false);
      resetForm();
    } catch (err: any) {
      toast.error(err.message || "Failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteWorkspaceContent(id);
      toast.success("Content deleted");
    } catch (err: any) {
      toast.error(err.message || "Failed");
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="size-8 text-primary" />
            Content
          </h1>
          <p className="text-muted-foreground mt-1">Supplementary resources for your classes.</p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="size-4 mr-2" /> Add Content
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">All Content</CardTitle>
          <CardDescription>Private resources visible only to your workspace.</CardDescription>
        </CardHeader>
        <div className="border-t overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {content.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-14">
                    No content yet. Add supplementary resources for your students.
                  </TableCell>
                </TableRow>
              ) : (
                content.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Badge variant="outline">{item.type}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{item.title}</TableCell>
                    <TableCell className="text-muted-foreground">{item.subject?.name || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={item.status === "PUBLISHED" ? "default" : "secondary"} className={item.status === "PUBLISHED" ? "bg-emerald-600 hover:bg-emerald-700" : ""}>
                        {item.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="outline" size="sm" onClick={() => openEdit(item)}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)}>
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editItem ? "Edit Content" : "Add Content"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!editItem && (
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={type} onValueChange={(val) => val && setType(val)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NOTE">Note</SelectItem>
                    <SelectItem value="PAPER">Paper</SelectItem>
                    <SelectItem value="WORKSHEET">Worksheet</SelectItem>
                    <SelectItem value="CHALLENGE">Challenge</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Title</Label>
              <Input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Chapter 5 Summary" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
            </div>
            <div className="space-y-2">
              <Label>PDF URL</Label>
              <Input value={pdfUrl} onChange={(e) => setPdfUrl(e.target.value)} placeholder="https://..." />
            </div>
            <div className="space-y-2">
              <Label>Subject (Optional)</Label>
              <Select value={subjectId} onValueChange={(val) => val && setSubjectId(val)}>
                <SelectTrigger><SelectValue placeholder="Select Subject" /></SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name} ({s.qualification.board.title})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
    </div>
  );
}
