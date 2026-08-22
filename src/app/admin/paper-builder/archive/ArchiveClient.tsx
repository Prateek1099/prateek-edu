"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Archive, ExternalLink, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { FINAL_PAPER_ORDER_LABELS } from "@/lib/paper-builder/final-paper-order";
import type { SavedGeneratedPaperSummary } from "@/lib/paper-builder/saved-paper-types";

import { archiveSavedGeneratedPaper, deleteArchivedGeneratedPaper, restoreSavedGeneratedPaper } from "./actions";

export default function ArchiveClient({ papers }: { papers: SavedGeneratedPaperSummary[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [deleting, setDeleting] = useState<SavedGeneratedPaperSummary | null>(null);
  const [confirmation, setConfirmation] = useState("");

  const mutate = (work: () => Promise<{ success: boolean; error?: string }>, success: string, done?: () => void) => {
    startTransition(async () => {
      try {
        const result = await work();
        if (!result.success) {
          toast.error(result.error ?? "The saved paper could not be changed.");
          return;
        }
        toast.success(success);
        done?.();
        router.refresh();
      } catch {
        toast.error("The saved paper changed in another session or could not be updated.");
      }
    });
  };

  if (papers.length === 0) {
    return <div className="rounded-2xl border border-dashed p-10 text-center"><h2 className="font-semibold">No saved generated papers found</h2><p className="mt-2 text-sm text-muted-foreground">Generate and validate a Blueprint Builder paper, then save its exact final output.</p></div>;
  }

  return (
    <>
      <div className="grid gap-4 xl:grid-cols-2">
        {papers.map((paper) => (
          <Card key={paper.id}>
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0"><CardTitle className="break-words">{paper.name}</CardTitle><CardDescription className="mt-1">{paper.description || "No description"}</CardDescription></div>
                <Badge variant={paper.archivedAt ? "outline" : "secondary"}>{paper.archivedAt ? "Archived" : "Active"}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <Summary label="Academic scope" value={`${paper.boardTitle} · ${paper.qualificationTitle} · ${paper.subjectName}`} />
                <Summary label="Paper" value={`${paper.totalMarks} marks · ${paper.durationMinutes} minutes`} />
                <Summary label="Final order" value={FINAL_PAPER_ORDER_LABELS[paper.finalOrderMode]} />
                <Summary label="Created" value={new Date(paper.createdAt).toLocaleString()} />
                <Summary label="Created by" value={paper.createdByName || paper.createdByEmail || "SUPER_ADMIN"} />
                <Summary label="Source template" value={paper.sourceBlueprintTemplateName || "Manual blueprint"} />
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href={`/admin/paper-builder/archive/${paper.id}`} className={buttonVariants({ variant: "outline" })}><ExternalLink className="size-4" /> Open</Link>
                {paper.archivedAt ? (
                  <>
                    <Button type="button" variant="outline" disabled={pending} onClick={() => mutate(() => restoreSavedGeneratedPaper(paper.id), "Saved paper restored.")}><RotateCcw className="size-4" /> Restore</Button>
                    <Button type="button" variant="destructive" disabled={pending} onClick={() => { setDeleting(paper); setConfirmation(""); }}><Trash2 className="size-4" /> Permanently delete</Button>
                  </>
                ) : (
                  <Button type="button" variant="outline" disabled={pending} onClick={() => mutate(() => archiveSavedGeneratedPaper(paper.id), "Saved paper archived.")}><Archive className="size-4" /> Archive</Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={Boolean(deleting)} onOpenChange={(open) => { if (!open && !pending) setDeleting(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Permanently delete saved paper</DialogTitle><DialogDescription>This deletes only the archived paper snapshot and its archive-owned images. Question Bank records and blueprint templates are not changed. Enter “{deleting?.name}” to confirm.</DialogDescription></DialogHeader>
          <Input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder="Exact saved paper name" />
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" disabled={pending} onClick={() => setDeleting(null)}>Cancel</Button>
            <Button type="button" variant="destructive" disabled={!deleting || confirmation !== deleting.name || pending} onClick={() => deleting && mutate(() => deleteArchivedGeneratedPaper(deleting.id, confirmation), "Saved paper permanently deleted.", () => setDeleting(null))}><Trash2 className="size-4" /> {pending ? "Deleting…" : "Delete permanently"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 break-words">{value}</p></div>;
}
