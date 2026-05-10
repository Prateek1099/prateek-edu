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
import { Plus, Pencil, Trash2, Rows3, Layers } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { createPaper, updatePaper, deletePaper } from "@/app/actions/admin";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CAMBRIDGE_EXAM_SESSIONS } from "@/lib/exam-seasons";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type SubjectOption = { id: string; label: string };

type PaperWithSubject = {
  id: string;
  subjectId: string;
  year: number;
  paperNumber: number;
  variant: number | null;
  season: string | null;
  questionPdfUrl: string | null;
  msPdfUrl: string | null;
  subject: {
    name: string;
    code: string | null;
    qualification: { title: string };
  };
};

const SEASON_NONE = "__none__";
const SEASON_CUSTOM = "__custom__";

function sessionSelectValue(raw: string | null): string {
  if (!raw) return SEASON_NONE;
  if ((CAMBRIDGE_EXAM_SESSIONS as readonly string[]).includes(raw as (typeof CAMBRIDGE_EXAM_SESSIONS)[number])) {
    return raw;
  }
  return SEASON_CUSTOM;
}

function resolveSession(
  selectValue: string,
  custom: string
): string | null {
  if (selectValue === SEASON_NONE) return null;
  if (selectValue === SEASON_CUSTOM) {
    const t = custom.trim();
    return t === "" ? null : t;
  }
  return selectValue;
}

type BulkRow = {
  key: string;
  paperNumber: string;
  variant: string;
  qp: File | null;
  ms: File | null;
};

function randomKey(): string {
  const c = typeof globalThis !== "undefined" && globalThis.crypto;
  return c && typeof c.randomUUID === "function"
    ? c.randomUUID()
    : `r-${Math.random().toString(36).slice(2)}`;
}

export default function AdminPapersClient({
  papers,
  subjectOptions,
}: {
  papers: PaperWithSubject[];
  subjectOptions: SubjectOption[];
}) {
  const router = useRouter();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [selectedPaper, setSelectedPaper] = useState<PaperWithSubject | null>(null);
  const [loading, setLoading] = useState(false);
  const [tableSearch, setTableSearch] = useState("");

  const [subjectId, setSubjectId] = useState("");
  const [year, setYear] = useState("");
  const [paperNumber, setPaperNumber] = useState("");
  const [variant, setVariant] = useState("");
  const [sessionSelect, setSessionSelect] = useState(SEASON_NONE);
  const [sessionCustom, setSessionCustom] = useState("");

  const [questionFile, setQuestionFile] = useState<File | null>(null);
  const [msFile, setMsFile] = useState<File | null>(null);
  const [questionPdfUrl, setQuestionPdfUrl] = useState("");
  const [msPdfUrl, setMsPdfUrl] = useState("");

  const [bulkSubjectId, setBulkSubjectId] = useState("");
  const [bulkYear, setBulkYear] = useState("");
  const [bulkSessionSelect, setBulkSessionSelect] = useState(SEASON_NONE);
  const [bulkSessionCustom, setBulkSessionCustom] = useState("");
  const [bulkRows, setBulkRows] = useState<BulkRow[]>(() => [
    { key: randomKey(), paperNumber: "", variant: "", qp: null, ms: null },
    { key: randomKey(), paperNumber: "", variant: "", qp: null, ms: null },
  ]);

  const resetForm = () => {
    setSubjectId(subjectOptions[0]?.id ?? "");
    setYear("");
    setPaperNumber("");
    setVariant("");
    setSessionSelect(SEASON_NONE);
    setSessionCustom("");
    setQuestionFile(null);
    setMsFile(null);
    setQuestionPdfUrl("");
    setMsPdfUrl("");
    setSelectedPaper(null);
  };

  const openAdd = () => {
    resetForm();
    setIsAddOpen(true);
  };

  const openEdit = (paper: PaperWithSubject) => {
    setSelectedPaper(paper);
    setSubjectId(paper.subjectId);
    setYear(paper.year.toString());
    setPaperNumber(paper.paperNumber.toString());
    setVariant(paper.variant?.toString() || "");
    const sel = sessionSelectValue(paper.season);
    setSessionSelect(sel);
    setSessionCustom(sel === SEASON_CUSTOM ? (paper.season ?? "") : "");
    setQuestionPdfUrl(paper.questionPdfUrl || "");
    setMsPdfUrl(paper.msPdfUrl || "");
    setQuestionFile(null);
    setMsFile(null);
    setIsEditOpen(true);
  };

  const openDelete = (paper: PaperWithSubject) => {
    setSelectedPaper(paper);
    setIsDeleteOpen(true);
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

  const sessionForSave = resolveSession(sessionSelect, sessionCustom);

  const filteredPapers = useMemo(() => {
    const q = tableSearch.trim().toLowerCase();
    if (!q) return papers;
    return papers.filter((p) => {
      const sub =
        `${p.subject.name} ${p.subject.code ?? ""} ${p.subject.qualification.title}`.toLowerCase();
      const yr = String(p.year);
      const seas = (p.season ?? "").toLowerCase();
      const pn = `${p.paperNumber} ${p.variant ?? ""}`;
      return (
        sub.includes(q) ||
        yr.includes(q) ||
        seas.includes(q) ||
        pn.includes(q)
      );
    });
  }, [papers, tableSearch]);

  const refresh = () => router.refresh();

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectId) {
      toast.error("Choose a subject");
      return;
    }
    setLoading(true);
    try {
      let finalQpUrl: string | null = questionPdfUrl || null;
      let finalMsUrl: string | null = msPdfUrl || null;

      if (questionFile) {
        toast("Uploading Question Paper PDF...");
        finalQpUrl = await uploadFile(questionFile);
      }

      if (msFile) {
        toast("Uploading Mark Scheme PDF...");
        finalMsUrl = await uploadFile(msFile);
      }

      const res = await createPaper({
        subjectId,
        year: parseInt(year, 10),
        paperNumber: parseInt(paperNumber, 10),
        variant: variant ? parseInt(variant, 10) : null,
        season: sessionForSave,
        questionPdfUrl: finalQpUrl,
        msPdfUrl: finalMsUrl,
      });

      if (res.success) {
        toast.success("Paper added");
        setIsAddOpen(false);
        resetForm();
        refresh();
      } else {
        toast.error(res.error || "Failed");
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPaper) return;
    if (!subjectId) {
      toast.error("Choose a subject");
      return;
    }
    setLoading(true);
    try {
      let finalQpUrl = questionPdfUrl;
      let finalMsUrl = msPdfUrl;

      if (questionFile) {
        toast("Uploading Question Paper PDF...");
        finalQpUrl = await uploadFile(questionFile);
      }

      if (msFile) {
        toast("Uploading Mark Scheme PDF...");
        finalMsUrl = await uploadFile(msFile);
      }

      const res = await updatePaper(selectedPaper.id, {
        subjectId,
        year: parseInt(year, 10),
        paperNumber: parseInt(paperNumber, 10),
        variant: variant ? parseInt(variant, 10) : null,
        season: sessionForSave,
        questionPdfUrl: finalQpUrl || null,
        msPdfUrl: finalMsUrl || null,
      });

      if (res.success) {
        toast.success("Paper updated");
        setIsEditOpen(false);
        resetForm();
        refresh();
      } else {
        toast.error(res.error || "Failed");
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedPaper) return;
    setLoading(true);
    const res = await deletePaper(selectedPaper.id);
    setLoading(false);
    if (res.success) {
      toast.success("Paper deleted");
      setIsDeleteOpen(false);
      resetForm();
      refresh();
    } else {
      toast.error(res.error || "Failed");
    }
  };

  const bulkSessionResolved = resolveSession(bulkSessionSelect, bulkSessionCustom);

  const openBulk = () => {
    setBulkSubjectId(subjectId || subjectOptions[0]?.id || "");
    setBulkYear(year || "");
    setBulkSessionSelect(sessionSelect);
    setBulkSessionCustom(sessionCustom);
    setBulkRows([
      { key: randomKey(), paperNumber: "", variant: "", qp: null, ms: null },
      { key: randomKey(), paperNumber: "", variant: "", qp: null, ms: null },
    ]);
    setBulkOpen(true);
  };

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkSubjectId) {
      toast.error("Select a subject");
      return;
    }
    const yr = parseInt(bulkYear, 10);
    if (Number.isNaN(yr)) {
      toast.error("Enter a valid year");
      return;
    }

    const rowsToSave = bulkRows.filter((r) => r.paperNumber.trim() !== "");
    if (rowsToSave.length === 0) {
      toast.error("Add at least one row with a paper number");
      return;
    }

    setLoading(true);
    let ok = 0;
    try {
      for (const row of rowsToSave) {
        const pn = parseInt(row.paperNumber, 10);
        if (Number.isNaN(pn)) {
          toast.error(`Invalid paper number: ${row.paperNumber}`);
          continue;
        }
        const vRaw = row.variant.trim();
        const v = vRaw === "" ? null : parseInt(vRaw, 10);
        if (vRaw !== "" && Number.isNaN(v)) {
          toast.error(`Invalid variant for paper ${pn}`);
          continue;
        }

        let qpUrl: string | null = null;
        let msUrl: string | null = null;
        if (row.qp) qpUrl = await uploadFile(row.qp);
        if (row.ms) msUrl = await uploadFile(row.ms);

        const res = await createPaper({
          subjectId: bulkSubjectId,
          year: yr,
          paperNumber: pn,
          variant: v,
          season: bulkSessionResolved,
          questionPdfUrl: qpUrl,
          msPdfUrl: msUrl,
        });
        if (!res.success) {
          toast.error(`Paper ${pn}: ${res.error}`);
        } else {
          ok++;
        }
      }

      toast.success(ok === rowsToSave.length ? `Added ${ok} papers` : `Saved ${ok} of ${rowsToSave.length}`);
      setBulkOpen(false);
      refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Bulk upload failed");
    } finally {
      setLoading(false);
    }
  };

  const SeasonFields = ({
    sel,
    onSelChange,
    custom,
    onCustomChange,
    idPrefix,
  }: {
    sel: string;
    onSelChange: (v: string) => void;
    custom: string;
    onCustomChange: (v: string) => void;
    idPrefix: string;
  }) => (
    <div className="space-y-2">
      <Label htmlFor={`${idPrefix}-session`}>Exam session</Label>
      <Select value={sel} onValueChange={(v) => onSelChange(v || SEASON_NONE)}>
        <SelectTrigger id={`${idPrefix}-session`}>
          <SelectValue placeholder="Session" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={SEASON_NONE}>Not set</SelectItem>
          {CAMBRIDGE_EXAM_SESSIONS.map((s) => (
            <SelectItem key={s} value={s}>
              {s}
            </SelectItem>
          ))}
          <SelectItem value={SEASON_CUSTOM}>Custom…</SelectItem>
        </SelectContent>
      </Select>
      {sel === SEASON_CUSTOM && (
        <Input
          placeholder="e.g., India March"
          value={custom}
          onChange={(e) => onCustomChange(e.target.value)}
        />
      )}
    </div>
  );

  const SubjectSelect = ({
    value,
    onChange,
    id,
  }: {
    value: string;
    onChange: (id: string) => void;
    id: string;
  }) => (
    <div className="space-y-2">
      <Label htmlFor={id}>Subject</Label>
      <Select value={value} onValueChange={(v) => onChange(v || "")}>
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

  const renderPaperFields = (idPrefix: "add-paper" | "edit-paper") => (
    <>
      <SubjectSelect id={`${idPrefix}-subject`} value={subjectId} onChange={setSubjectId} />
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-year`}>Year</Label>
          <Input
            id={`${idPrefix}-year`}
            required
            type="number"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            placeholder="2024"
          />
        </div>
        <SeasonFields
          idPrefix={`${idPrefix}-session`}
          sel={sessionSelect}
          onSelChange={setSessionSelect}
          custom={sessionCustom}
          onCustomChange={setSessionCustom}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-pn`}>Paper number</Label>
          <Input
            id={`${idPrefix}-pn`}
            required
            type="number"
            value={paperNumber}
            onChange={(e) => setPaperNumber(e.target.value)}
            placeholder="1"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-variant`}>Variant</Label>
          <Input
            id={`${idPrefix}-variant`}
            type="number"
            value={variant}
            onChange={(e) => setVariant(e.target.value)}
            placeholder="Optional"
          />
        </div>
      </div>
    </>
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Layers className="size-8 text-primary" />
            Papers
          </h1>
          <p className="text-muted-foreground mt-1">
            Attach PDFs per subject with Cambridge-style sessions ({CAMBRIDGE_EXAM_SESSIONS.join(", ")}
            ).
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={openAdd}>
            <Plus className="size-4" />
            Add paper
          </Button>
          <Button onClick={openBulk}>
            <Rows3 className="size-4" />
            Bulk add
          </Button>
        </div>
      </div>

      <Card className="border border-border/80 shadow-sm">
        <CardHeader className="pb-3 space-y-0">
          <CardTitle className="text-lg">Library</CardTitle>
          <CardDescription>Search across subject, session, year, and paper numbers.</CardDescription>
        </CardHeader>
        <div className="px-6 pb-4">
          <div className="relative max-w-md">
            <Input
              placeholder="Filter papers…"
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="border-t overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subject</TableHead>
                <TableHead>Session</TableHead>
                <TableHead className="w-24">Year</TableHead>
                <TableHead className="w-28">Paper</TableHead>
                <TableHead>PDFs</TableHead>
                <TableHead className="text-right w-52">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPapers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-14">
                    No papers match this filter yet.
                  </TableCell>
                </TableRow>
              ) : (
                filteredPapers.map((paper) => (
                  <TableRow key={paper.id}>
                    <TableCell>
                      <div className="font-medium leading-tight">
                        {paper.subject.name}
                        {paper.subject.code ? (
                          <span className="text-muted-foreground"> · {paper.subject.code}</span>
                        ) : null}
                      </div>
                      <div className="text-xs text-muted-foreground">{paper.subject.qualification.title}</div>
                    </TableCell>
                    <TableCell>{paper.season ?? "—"}</TableCell>
                    <TableCell>{paper.year}</TableCell>
                    <TableCell>
                      {paper.paperNumber}
                      {paper.variant != null ? ` (v${paper.variant})` : ""}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-3 text-xs">
                        {paper.questionPdfUrl ? (
                          <a
                            href={paper.questionPdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            Question
                          </a>
                        ) : (
                          <span className="text-muted-foreground">No QP</span>
                        )}
                        {paper.msPdfUrl ? (
                          <a
                            href={paper.msPdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            Mark scheme
                          </a>
                        ) : (
                          <span className="text-muted-foreground">No MS</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit(paper)}>
                        <Pencil className="size-4" /> Edit
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => openDelete(paper)}>
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
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto gap-6">
          <DialogHeader>
            <DialogTitle>Add paper</DialogTitle>
            <DialogDescription>
              Question paper and mark scheme upload to Blob storage via the secured upload API.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4">
            {renderPaperFields("add-paper")}
            <div className="space-y-2">
              <Label>Question paper PDF</Label>
              <Input
                type="file"
                accept="application/pdf"
                onChange={(e) => setQuestionFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <div className="space-y-2">
              <Label>Mark scheme PDF</Label>
              <Input
                type="file"
                accept="application/pdf"
                onChange={(e) => setMsFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={loading}>
                {loading ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto gap-6">
          <DialogHeader>
            <DialogTitle>Edit paper</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            {renderPaperFields("edit-paper")}
            <div className="space-y-2 rounded-lg border bg-muted/30 p-4">
              <Label className="text-muted-foreground">Current question paper</Label>
              {questionPdfUrl ? (
                <a href={questionPdfUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline break-all">
                  Open current PDF
                </a>
              ) : (
                <p className="text-sm">None uploaded</p>
              )}
              <Label className="mt-3 block text-muted-foreground">Replace question paper</Label>
              <Input
                type="file"
                accept="application/pdf"
                onChange={(e) => setQuestionFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <div className="space-y-2 rounded-lg border bg-muted/30 p-4">
              <Label className="text-muted-foreground">Current mark scheme</Label>
              {msPdfUrl ? (
                <a href={msPdfUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline break-all">
                  Open current PDF
                </a>
              ) : (
                <p className="text-sm">None uploaded</p>
              )}
              <Label className="mt-3 block text-muted-foreground">Replace mark scheme</Label>
              <Input type="file" accept="application/pdf" onChange={(e) => setMsFile(e.target.files?.[0] ?? null)} />
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
            <DialogTitle>Delete paper</DialogTitle>
            <DialogDescription>
              Remove{" "}
              <span className="font-medium">
                {selectedPaper?.subject.name} · {selectedPaper?.year} ·{" "}
                {selectedPaper?.season ?? "no session"} · Paper {selectedPaper?.paperNumber}
              </span>
              ? This cannot be undone.
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

      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto gap-6">
          <DialogHeader>
            <DialogTitle>Bulk add papers</DialogTitle>
            <DialogDescription>
              Shared subject, year, and session for each row; upload QP/MS PDFs row by row. Empty paper
              number rows are skipped.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleBulkSubmit} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <SubjectSelect id="bulk-subject" value={bulkSubjectId} onChange={setBulkSubjectId} />
              <div className="space-y-2">
                <Label>Year (shared)</Label>
                <Input
                  required
                  type="number"
                  value={bulkYear}
                  onChange={(e) => setBulkYear(e.target.value)}
                  placeholder="2024"
                />
              </div>
              <SeasonFields
                idPrefix="bulk"
                sel={bulkSessionSelect}
                onSelChange={setBulkSessionSelect}
                custom={bulkSessionCustom}
                onCustomChange={setBulkSessionCustom}
              />
            </div>

            <div className="rounded-xl border shadow-xs overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="w-28">Paper #</TableHead>
                    <TableHead className="w-28">Variant</TableHead>
                    <TableHead>Question PDF</TableHead>
                    <TableHead>Mark scheme PDF</TableHead>
                    <TableHead className="text-right w-24" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bulkRows.map((row, index) => (
                    <TableRow key={row.key}>
                      <TableCell>
                        <Input
                          type="number"
                          value={row.paperNumber}
                          onChange={(e) =>
                            setBulkRows((prev) =>
                              prev.map((r) =>
                                r.key === row.key ? { ...r, paperNumber: e.target.value } : r
                              )
                            )
                          }
                          placeholder={`${index + 1}`}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={row.variant}
                          onChange={(e) =>
                            setBulkRows((prev) =>
                              prev.map((r) =>
                                r.key === row.key ? { ...r, variant: e.target.value } : r
                              )
                            )
                          }
                          placeholder="—"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="file"
                          accept="application/pdf"
                          className="min-w-[9rem]"
                          onChange={(e) =>
                            setBulkRows((prev) =>
                              prev.map((r) =>
                                r.key === row.key ? { ...r, qp: e.target.files?.[0] ?? null } : r
                              )
                            )
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="file"
                          accept="application/pdf"
                          className="min-w-[9rem]"
                          onChange={(e) =>
                            setBulkRows((prev) =>
                              prev.map((r) =>
                                r.key === row.key ? { ...r, ms: e.target.files?.[0] ?? null } : r
                              )
                            )
                          }
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setBulkRows((prev) => prev.filter((r) => r.key !== row.key))}
                          disabled={bulkRows.length <= 1}
                        >
                          Remove
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex justify-between items-center px-4 py-3 border-t bg-muted/20">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() =>
                    setBulkRows((prev) => [
                      ...prev,
                      { key: randomKey(), paperNumber: "", variant: "", qp: null, ms: null },
                    ])
                  }
                >
                  Add row
                </Button>
                <p className="text-xs text-muted-foreground">{bulkRows.length} rows</p>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button type="submit" disabled={loading}>
                {loading ? "Uploading…" : "Create all"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
