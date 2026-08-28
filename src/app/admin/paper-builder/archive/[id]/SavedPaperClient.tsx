"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Eye, FileDown, Printer } from "lucide-react";
import { toast } from "sonner";

import { PaperAnswerKeyDocument, PaperQuestionDocument } from "@/components/paper-builder/PaperBuilderDocuments";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { formatAdminDateTime } from "@/lib/admin-date-format";
import { FINAL_PAPER_ORDER_LABELS } from "@/lib/paper-builder/final-paper-order";
import type { SavedGeneratedPaperDetail } from "@/lib/paper-builder/saved-paper-types";
import { cn } from "@/lib/utils";

type OutputMode = "questions" | "answers" | "both";

export default function SavedPaperClient({ saved }: { saved: SavedGeneratedPaperDetail }) {
  const [preview, setPreview] = useState<"questions" | "answers">("questions");
  const [downloading, setDownloading] = useState<OutputMode | null>(null);

  const print = (mode: OutputMode) => {
    document.documentElement.dataset.paperPrintMode = mode;
    const cleanup = () => {
      delete document.documentElement.dataset.paperPrintMode;
      window.removeEventListener("afterprint", cleanup);
    };
    window.addEventListener("afterprint", cleanup);
    requestAnimationFrame(() => window.print());
  };
  const download = async (mode: OutputMode) => {
    setDownloading(mode);
    try {
      const { downloadPaperDocx } = await import("@/lib/paper-builder/docx");
      await downloadPaperDocx(saved.paper, mode);
      toast.success("Editable DOCX downloaded.");
    } catch {
      toast.error("Could not generate the DOCX. Please try again.");
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="paper-builder-screen-only flex flex-wrap items-center justify-between gap-3">
        <Link href="/admin/paper-builder/archive" className={buttonVariants({ variant: "outline" })}><ArrowLeft className="size-4" /> Paper Archive</Link>
        <Badge variant={saved.archivedAt ? "outline" : "secondary"}>{saved.archivedAt ? "Archived" : "Active"}</Badge>
      </div>
      <section className="paper-builder-screen-only rounded-2xl border bg-card p-5">
        <h1 className="text-2xl font-bold">{saved.name}</h1>
        {saved.description && <p className="mt-2 text-sm text-muted-foreground">{saved.description}</p>}
        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <Summary label="Academic scope" value={`${saved.boardTitle} · ${saved.qualificationTitle} · ${saved.subjectName}`} />
          <Summary label="Paper" value={`${saved.totalMarks} marks · ${saved.durationMinutes} minutes`} />
          <Summary label="Final order" value={FINAL_PAPER_ORDER_LABELS[saved.finalOrderMode]} />
          <Summary label="Created" value={formatAdminDateTime(saved.createdAt)} />
          <Summary label="Created by" value={saved.createdByName || saved.createdByEmail || "SUPER_ADMIN"} />
          <Summary label="Source template" value={saved.sourceBlueprintTemplateName || "Manual blueprint"} />
        </div>
      </section>
      <div className="paper-builder-screen-only flex flex-wrap gap-2">
        <Button type="button" variant={preview === "questions" ? "default" : "outline"} onClick={() => setPreview("questions")}><Eye className="size-4" /> Student paper</Button>
        <Button type="button" variant={preview === "answers" ? "default" : "outline"} onClick={() => setPreview("answers")}><CheckCircle2 className="size-4" /> Answer key</Button>
      </div>
      <div className="paper-builder-screen-only flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={() => print("questions")}><Printer className="size-4" /> Print question paper</Button>
        <Button type="button" variant="outline" onClick={() => print("answers")}><Printer className="size-4" /> Print answer key</Button>
        <Button type="button" onClick={() => print("both")}><Printer className="size-4" /> Print both</Button>
      </div>
      <div className="paper-builder-screen-only flex flex-wrap gap-2">
        {(["questions", "answers", "both"] as const).map((mode) => (
          <Button key={mode} type="button" variant="outline" disabled={downloading !== null} onClick={() => download(mode)}>
            <FileDown className="size-4" /> {downloading === mode ? "Generating…" : mode === "questions" ? "Download Question Paper DOCX" : mode === "answers" ? "Download Answer Key DOCX" : "Download Both DOCX"}
          </Button>
        ))}
      </div>
      <div className={cn(preview !== "questions" && "paper-builder-preview-hidden")}><PaperQuestionDocument paper={saved.paper} /></div>
      <div className={cn(preview !== "answers" && "paper-builder-preview-hidden")}><PaperAnswerKeyDocument paper={saved.paper} /></div>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 break-words">{value}</p></div>;
}
