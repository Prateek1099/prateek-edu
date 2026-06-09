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
import { Pencil, FileText, Upload } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { updateSubjectSyllabus } from "@/app/actions/admin";
import { toast } from "sonner";
import Link from "next/link";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type SubjectRow = {
  id: string;
  name: string;
  code: string | null;
  syllabusPdfUrl: string | null;
  qualification: {
    title: string;
    board: { title: string };
  };
};

export default function AdminSyllabusClient({ subjects }: { subjects: SubjectRow[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selected, setSelected] = useState<SubjectRow | null>(null);

  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfUrlExisting, setPdfUrlExisting] = useState("");

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

  const openEdit = (s: SubjectRow) => {
    setSelected(s);
    setPdfUrlExisting(s.syllabusPdfUrl ?? "");
    setPdfFile(null);
    setIsEditOpen(true);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return subjects;
    return subjects.filter((s) => {
      const hay = `${s.name} ${s.code ?? ""} ${s.qualification.title} ${s.qualification.board.title}`.toLowerCase();
      return hay.includes(q);
    });
  }, [subjects, search]);

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    
    setLoading(true);
    try {
      let pdfFinal = pdfUrlExisting || null;
      if (pdfFile) {
        toast("Uploading PDF…");
        pdfFinal = await uploadFile(pdfFile);
      }
      
      const res = await updateSubjectSyllabus(selected.id, {
        syllabusPdfUrl: pdfFinal,
      });
      
      setLoading(false);
      if (res.success) {
        toast.success("Syllabus updated successfully");
        setIsEditOpen(false);
        refresh();
      } else {
        toast.error(res.error || "Failed to update syllabus");
      }
    } catch (err: unknown) {
      setLoading(false);
      toast.error(err instanceof Error ? err.message : "Upload failed");
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="size-8 text-primary" />
            Syllabus Management
          </h1>
          <p className="text-muted-foreground mt-1 max-w-xl">
            Upload official syllabus documents for each subject. Students will see these in the Syllabus tab on the subject page.
          </p>
        </div>
      </div>

      <Card className="border border-border/80 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Subjects Library</CardTitle>
          <CardDescription>Filter by subject name, code, qualification, or board.</CardDescription>
        </CardHeader>
        <div className="px-6 pb-4 max-w-md">
          <Input
            placeholder="Filter subjects…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="border-t overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subject</TableHead>
                <TableHead>Board & Qual</TableHead>
                <TableHead>Syllabus PDF</TableHead>
                <TableHead className="text-right w-40">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-14 text-muted-foreground">
                    No subjects match your search.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <div className="font-medium leading-tight">{s.name}</div>
                      <div className="text-xs text-muted-foreground">Code: {s.code ?? "—"}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{s.qualification.title}</div>
                      <div className="text-xs text-muted-foreground">{s.qualification.board.title}</div>
                    </TableCell>
                    <TableCell>
                      {s.syllabusPdfUrl ? (
                        <Link
                          href={s.syllabusPdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-600 dark:text-emerald-400 text-sm font-medium hover:underline flex items-center gap-1"
                        >
                          <FileText className="size-3" /> Uploaded
                        </Link>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">Missing</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => openEdit(s)}>
                        <Upload className="size-4 mr-1" /> Upload
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Update Syllabus</DialogTitle>
            <DialogDescription>
              Upload a syllabus PDF for {selected?.name} ({selected?.qualification.title}).
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4 pt-2">
            <div className="space-y-3">
              <Label>Syllabus PDF File</Label>
              <Input 
                type="file" 
                accept="application/pdf" 
                onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)} 
              />
            </div>
            
            <div className="rounded-lg border bg-muted/30 p-4 space-y-2 mt-4">
              <Label className="text-muted-foreground">Current File</Label>
              {pdfUrlExisting ? (
                <div className="flex flex-col gap-1">
                  <Link
                    href={pdfUrlExisting}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary underline break-all"
                  >
                    View Current PDF
                  </Link>
                  <Button 
                    type="button" 
                    variant="link" 
                    className="h-auto p-0 text-destructive justify-start text-xs"
                    onClick={() => {
                      setPdfUrlExisting("");
                      setPdfFile(null);
                    }}
                  >
                    Remove Current PDF
                  </Button>
                </div>
              ) : (
                <p className="text-sm font-medium">No syllabus uploaded yet.</p>
              )}
              <p className="text-xs text-muted-foreground pt-1">
                Uploading a new file will replace the current one.
              </p>
            </div>
            
            <DialogFooter className="pt-2">
              <Button type="submit" disabled={loading}>
                {loading ? "Saving…" : "Save Syllabus"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
