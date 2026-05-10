"use client";

import { useEffect, useMemo, useState } from "react";
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
import { Plus, Pencil, Trash2, StickyNote } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { createNote, updateNote, deleteNote } from "@/app/actions/admin";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type SubjectRow = {
  id: string;
  label: string;
  topics: { id: string; topicName: string }[];
};

type NoteWithRelations = {
  id: string;
  subjectId: string;
  title: string;
  content: string | null;
  pdfUrl: string | null;
  topicId: string | null;
  subject: {
    name: string;
    code: string | null;
    qualification: { title: string };
  };
  topic: { topicName: string } | null;
};

const TOPIC_NONE = "__none__";

export default function AdminNotesClient({
  notes,
  subjectRows,
}: {
  notes: NoteWithRelations[];
  subjectRows: SubjectRow[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<NoteWithRelations | null>(null);

  const [subjectId, setSubjectId] = useState(subjectRows[0]?.id ?? "");
  const [topicId, setTopicId] = useState(TOPIC_NONE);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [pdfUrlExisting, setPdfUrlExisting] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  const topicsForSubject = useMemo(() => {
    const s = subjectRows.find((row) => row.id === subjectId);
    return s?.topics ?? [];
  }, [subjectRows, subjectId]);

  useEffect(() => {
    if (topicId === TOPIC_NONE) return;
    if (!topicsForSubject.some((t) => t.id === topicId)) {
      setTopicId(TOPIC_NONE);
    }
  }, [topicsForSubject, topicId]);

  const resetForm = () => {
    setSubjectId(subjectRows[0]?.id ?? "");
    setTopicId(TOPIC_NONE);
    setTitle("");
    setContent("");
    setPdfUrlExisting("");
    setPdfFile(null);
    setSelected(null);
  };

  const uploadFile = async (file: File): Promise<string> => {
    const response = await fetch(
      `/api/upload?filename=${encodeURIComponent(file.name)}`,
      { method: "POST", body: file }
    );
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || "Upload failed");
    }
    const data = await response.json();
    return data.url as string;
  };

  const refresh = () => router.refresh();

  const openAdd = () => {
    resetForm();
    setIsAddOpen(true);
  };

  const openEdit = (n: NoteWithRelations) => {
    setSelected(n);
    setSubjectId(n.subjectId);
    setTopicId(n.topicId ?? TOPIC_NONE);
    setTitle(n.title);
    setContent(n.content ?? "");
    setPdfUrlExisting(n.pdfUrl ?? "");
    setPdfFile(null);
    setIsEditOpen(true);
  };

  const openDelete = (n: NoteWithRelations) => {
    setSelected(n);
    setIsDeleteOpen(true);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter((n) => {
      const hay = `${n.title} ${n.subject.name} ${n.topic?.topicName ?? ""} ${
        n.content ?? ""
      }`.toLowerCase();
      return hay.includes(q);
    });
  }, [notes, search]);

  const resolvedTopicId = (): string | null =>
    topicId === TOPIC_NONE ? null : topicId;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectId) {
      toast.error("Choose a subject");
      return;
    }
    setLoading(true);
    try {
      let pdfFinal: string | null = null;
      if (pdfFile) {
        toast("Uploading PDF…");
        pdfFinal = await uploadFile(pdfFile);
      }
      const res = await createNote({
        subjectId,
        title,
        content: content.trim() === "" ? null : content,
        pdfUrl: pdfFinal,
        topicId: resolvedTopicId(),
      });
      setLoading(false);
      if (res.success) {
        toast.success("Note created");
        setIsAddOpen(false);
        resetForm();
        refresh();
      } else toast.error(res.error || "Failed");
    } catch (err: unknown) {
      setLoading(false);
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    if (!subjectId) {
      toast.error("Choose a subject");
      return;
    }
    setLoading(true);
    try {
      let pdfFinal = pdfUrlExisting || null;
      if (pdfFile) {
        toast("Uploading PDF…");
        pdfFinal = await uploadFile(pdfFile);
      }
      const res = await updateNote(selected.id, {
        subjectId,
        title,
        content: content.trim() === "" ? null : content,
        pdfUrl: pdfFinal,
        topicId: resolvedTopicId(),
      });
      setLoading(false);
      if (res.success) {
        toast.success("Note updated");
        setIsEditOpen(false);
        resetForm();
        refresh();
      } else toast.error(res.error || "Failed");
    } catch (err: unknown) {
      setLoading(false);
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    setLoading(true);
    const res = await deleteNote(selected.id);
    setLoading(false);
    if (res.success) {
      toast.success("Deleted");
      setIsDeleteOpen(false);
      resetForm();
      refresh();
    } else toast.error(res.error || "Failed");
  };

  const formFields = (idPrefix: "add-note" | "edit-note") => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-sub`}>Subject</Label>
        <Select value={subjectId} onValueChange={(v) => setSubjectId(v ?? "")}>
          <SelectTrigger id={`${idPrefix}-sub`}>
            <SelectValue placeholder="Choose subject" />
          </SelectTrigger>
          <SelectContent className="max-h-72 overflow-y-auto">
            {subjectRows.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-topic`}>Topic</Label>
        <Select value={topicId} onValueChange={(v) => setTopicId(v ?? TOPIC_NONE)}>
          <SelectTrigger id={`${idPrefix}-topic`}>
            <SelectValue placeholder="Optional" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TOPIC_NONE}>Whole subject</SelectItem>
            {topicsForSubject.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.topicName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-title`}>Title</Label>
        <Input
          id={`${idPrefix}-title`}
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-content`}>Content</Label>
        <Textarea
          id={`${idPrefix}-content`}
          className="min-h-[140px]"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Optional rich text-ish notes (plain text)."
        />
      </div>

      <div className="space-y-2">
        <Label>PDF attachment</Label>
        <Input type="file" accept="application/pdf" onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)} />
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <StickyNote className="size-8 text-primary" />
            Revision notes
          </h1>
          <p className="text-muted-foreground mt-1">
            Link notes to subjects and optional syllabus topics; add a PDF summary when helpful.
          </p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="size-4" />
          New note
        </Button>
      </div>

      <Card className="border border-border/80 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Library</CardTitle>
          <CardDescription>Quick search across titles and topics.</CardDescription>
        </CardHeader>
        <div className="px-6 pb-4 max-w-md">
          <Input
            placeholder="Filter notes…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="border-t overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[10rem]">Subject</TableHead>
                <TableHead>Topic</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>PDF</TableHead>
                <TableHead className="text-right w-52">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-14 text-muted-foreground">
                    No notes yet — create one above.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((n) => (
                  <TableRow key={n.id}>
                    <TableCell>
                      <div className="font-medium leading-tight">{n.subject.name}</div>
                      <div className="text-xs text-muted-foreground">{n.subject.qualification.title}</div>
                    </TableCell>
                    <TableCell className="text-sm">{n.topic?.topicName ?? "—"}</TableCell>
                    <TableCell className="font-medium">{n.title}</TableCell>
                    <TableCell>
                      {n.pdfUrl ? (
                        <a href={n.pdfUrl} target="_blank" rel="noopener noreferrer" className="text-primary text-xs hover:underline">
                          Open PDF
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit(n)}>
                        <Pencil className="size-4" /> Edit
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => openDelete(n)}>
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
            <DialogTitle>Add revision note</DialogTitle>
            <DialogDescription>Students see these under each subject&apos;s revision area once surfaced in the catalog.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4">
            {formFields("add-note")}
            <DialogFooter>
              <Button type="submit" disabled={loading}>
                {loading ? "Saving…" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit note</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            {formFields("edit-note")}
            <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
              <Label className="text-muted-foreground">Current PDF</Label>
              {pdfUrlExisting ? (
                <a href={pdfUrlExisting} target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline break-all">
                  Open current
                </a>
              ) : (
                <p className="text-sm">None</p>
              )}
              <p className="text-xs text-muted-foreground">
                Replacing uploads a fresh file to Blob storage.
              </p>
            </div>
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
            <DialogTitle>Delete note</DialogTitle>
            <DialogDescription>
              Remove{" "}
              <span className="font-medium">{selected?.title}</span>? This cannot be undone.
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
