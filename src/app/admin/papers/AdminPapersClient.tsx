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
import { createPaper, updatePaper, deletePaper } from "@/app/actions/admin";
import { toast } from "sonner";

export default function AdminPapersClient({ papers }: { papers: any[] }) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedPaper, setSelectedPaper] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Form states
  const [subject, setSubject] = useState("");
  const [level, setLevel] = useState("");
  const [year, setYear] = useState("");
  const [paperNumber, setPaperNumber] = useState("");
  const [variant, setVariant] = useState("");
  
  // File states (for uploading new PDFs)
  const [questionFile, setQuestionFile] = useState<File | null>(null);
  const [msFile, setMsFile] = useState<File | null>(null);

  // Existing URL states (for keeping old PDFs when editing)
  const [questionPdfUrl, setQuestionPdfUrl] = useState("");
  const [msPdfUrl, setMsPdfUrl] = useState("");

  const resetForm = () => {
    setSubject("");
    setLevel("");
    setYear("");
    setPaperNumber("");
    setVariant("");
    setQuestionFile(null);
    setMsFile(null);
    setQuestionPdfUrl("");
    setMsPdfUrl("");
    setSelectedPaper(null);
  };

  const openEdit = (paper: any) => {
    setSelectedPaper(paper);
    setSubject(paper.subject);
    setLevel(paper.level);
    setYear(paper.year.toString());
    setPaperNumber(paper.paperNumber.toString());
    setVariant(paper.variant?.toString() || "");
    setQuestionPdfUrl(paper.questionPdfUrl || "");
    setMsPdfUrl(paper.msPdfUrl || "");
    setQuestionFile(null);
    setMsFile(null);
    setIsEditOpen(true);
  };

  const openDelete = (paper: any) => {
    setSelectedPaper(paper);
    setIsDeleteOpen(true);
  };

  const uploadFile = async (file: File): Promise<string> => {
    const response = await fetch(`/api/upload?filename=${encodeURIComponent(file.name)}`, {
      method: "POST",
      body: file,
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || "Upload failed");
    }
    const data = await response.json();
    return data.url;
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      let finalQpUrl = null;
      let finalMsUrl = null;

      if (questionFile) {
        toast("Uploading Question Paper PDF...");
        finalQpUrl = await uploadFile(questionFile);
      }
      
      if (msFile) {
        toast("Uploading Mark Scheme PDF...");
        finalMsUrl = await uploadFile(msFile);
      }

      const res = await createPaper({
        subject,
        level,
        year: parseInt(year),
        paperNumber: parseInt(paperNumber),
        variant: variant ? parseInt(variant) : null,
        questionPdfUrl: finalQpUrl,
        msPdfUrl: finalMsUrl,
      });
      
      if (res.success) {
        toast.success("Paper added successfully");
        setIsAddOpen(false);
        resetForm();
      } else {
        toast.error(res.error || "Failed to add paper");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to upload files");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      let finalQpUrl = questionPdfUrl;
      let finalMsUrl = msPdfUrl;

      if (questionFile) {
        toast("Uploading new Question Paper PDF...");
        finalQpUrl = await uploadFile(questionFile);
      }
      
      if (msFile) {
        toast("Uploading new Mark Scheme PDF...");
        finalMsUrl = await uploadFile(msFile);
      }

      const res = await updatePaper(selectedPaper.id, {
        subject,
        level,
        year: parseInt(year),
        paperNumber: parseInt(paperNumber),
        variant: variant ? parseInt(variant) : null,
        questionPdfUrl: finalQpUrl,
        msPdfUrl: finalMsUrl,
      });

      if (res.success) {
        toast.success("Paper updated successfully");
        setIsEditOpen(false);
        resetForm();
      } else {
        toast.error(res.error || "Failed to update paper");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to upload files");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    const res = await deletePaper(selectedPaper.id);
    setLoading(false);
    if (res.success) {
      toast.success("Paper deleted successfully");
      setIsDeleteOpen(false);
      resetForm();
    } else {
      toast.error(res.error || "Failed to delete paper");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Papers</h1>
        <Button onClick={() => { resetForm(); setIsAddOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Add Paper
        </Button>
      </div>
      
      <div className="border rounded-md bg-white overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Subject</TableHead>
              <TableHead>Level</TableHead>
              <TableHead>Year</TableHead>
              <TableHead>Paper No</TableHead>
              <TableHead>PDFs</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {papers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No papers found. Create one to get started.
                </TableCell>
              </TableRow>
            ) : (
              papers.map((paper: any) => (
                <TableRow key={paper.id}>
                  <TableCell className="font-medium">{paper.subject}</TableCell>
                  <TableCell>{paper.level}</TableCell>
                  <TableCell>{paper.year}</TableCell>
                  <TableCell>{paper.paperNumber} {paper.variant ? `(v${paper.variant})` : ''}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {paper.questionPdfUrl && <a href={paper.questionPdfUrl} target="_blank" className="text-xs text-blue-600 hover:underline">QP</a>}
                      {paper.msPdfUrl && <a href={paper.msPdfUrl} target="_blank" className="text-xs text-blue-600 hover:underline">MS</a>}
                    </div>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="outline" size="sm" onClick={() => openEdit(paper)}>
                      <Pencil className="w-4 h-4 mr-1" /> Edit
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => openDelete(paper)}>
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
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Paper</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Subject Code</Label>
                <Input required value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. 0417" />
              </div>
              <div className="space-y-2">
                <Label>Level</Label>
                <Input required value={level} onChange={e => setLevel(e.target.value)} placeholder="e.g. IGCSE" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Year</Label>
                <Input required type="number" value={year} onChange={e => setYear(e.target.value)} placeholder="2023" />
              </div>
              <div className="space-y-2">
                <Label>Paper</Label>
                <Input required type="number" value={paperNumber} onChange={e => setPaperNumber(e.target.value)} placeholder="1" />
              </div>
              <div className="space-y-2">
                <Label>Variant</Label>
                <Input type="number" value={variant} onChange={e => setVariant(e.target.value)} placeholder="2" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Upload Question Paper PDF</Label>
              <Input type="file" accept="application/pdf" onChange={e => setQuestionFile(e.target.files?.[0] || null)} />
            </div>
            <div className="space-y-2">
              <Label>Upload Mark Scheme PDF</Label>
              <Input type="file" accept="application/pdf" onChange={e => setMsFile(e.target.files?.[0] || null)} />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={loading}>{loading ? "Uploading & Saving..." : "Save Paper"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Paper</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Subject Code</Label>
                <Input required value={subject} onChange={e => setSubject(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Level</Label>
                <Input required value={level} onChange={e => setLevel(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Year</Label>
                <Input required type="number" value={year} onChange={e => setYear(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Paper No.</Label>
                <Input required type="number" value={paperNumber} onChange={e => setPaperNumber(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Variant</Label>
                <Input type="number" value={variant} onChange={e => setVariant(e.target.value)} />
              </div>
            </div>
            
            <div className="space-y-2 p-3 border rounded-md">
              <Label className="text-muted-foreground">Current Question Paper:</Label>
              {questionPdfUrl ? <p className="text-sm truncate"><a href={questionPdfUrl} target="_blank" className="text-blue-600 hover:underline">View Current PDF</a></p> : <p className="text-sm">None</p>}
              <Label className="mt-2 block">Upload New PDF (overrides current):</Label>
              <Input type="file" accept="application/pdf" onChange={e => setQuestionFile(e.target.files?.[0] || null)} />
            </div>

            <div className="space-y-2 p-3 border rounded-md">
              <Label className="text-muted-foreground">Current Mark Scheme:</Label>
              {msPdfUrl ? <p className="text-sm truncate"><a href={msPdfUrl} target="_blank" className="text-blue-600 hover:underline">View Current PDF</a></p> : <p className="text-sm">None</p>}
              <Label className="mt-2 block">Upload New PDF (overrides current):</Label>
              <Input type="file" accept="application/pdf" onChange={e => setMsFile(e.target.files?.[0] || null)} />
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
            <DialogTitle>Delete Paper</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this paper ({selectedPaper?.year} Paper {selectedPaper?.paperNumber})? This action cannot be undone.
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
