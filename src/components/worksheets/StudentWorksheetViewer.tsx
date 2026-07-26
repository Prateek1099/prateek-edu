import Link from "next/link";
import {
  ArrowLeft,
  BookOpenCheck,
  Clock,
  Download,
  ExternalLink,
  FileText,
  Info,
  Printer,
} from "lucide-react";

import { PrintButton } from "@/components/PrintButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WorksheetDocumentData, WorksheetPaper, WorksheetSolutions } from "./WorksheetDocument";

type StudentWorksheetViewerProps = {
  worksheet: WorksheetDocumentData & {
    type: "WORKSHEET" | "PDF_WORKSHEET";
    estimatedTime: number;
    pdfUrl: string | null;
    pdfAnswerUrl: string | null;
  };
  backUrl: string;
};

export default function StudentWorksheetViewer({ worksheet, backUrl }: StudentWorksheetViewerProps) {
  const isPdf = worksheet.type === "PDF_WORKSHEET";
  const hasSolutions = isPdf ? Boolean(worksheet.pdfAnswerUrl) : worksheet.questions.length > 0;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <div className="worksheet-screen-only print:hidden">
        <Link
          href={backUrl}
          className="mb-6 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to Practice
        </Link>

        <header className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <BookOpenCheck className="size-5" />
              </div>
              <Badge variant="secondary">{isPdf ? "PDF worksheet" : "Printable worksheet"}</Badge>
            </div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{worksheet.title}</h1>
            <p className="mt-3 text-base text-muted-foreground">
              {worksheet.subjectName}
              {worksheet.topicName ? ` · ${worksheet.topicName}` : ""}
            </p>
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <FileText className="size-4" />
                {isPdf
                  ? "Document assignment"
                  : `${worksheet.questions.length} question${worksheet.questions.length === 1 ? "" : "s"}`}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="size-4" />
                About {worksheet.estimatedTime} min
              </span>
            </div>
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            {isPdf ? (
              worksheet.pdfUrl && (
                <a href={worksheet.pdfUrl} target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto">
                  <Button size="lg" className="h-11 w-full gap-2">
                    <ExternalLink className="size-4" />
                    Open PDF
                  </Button>
                </a>
              )
            ) : (
              <PrintButton
                label="Print worksheet"
                icon={<Printer className="size-4" />}
                className="h-11 w-full px-5 sm:w-auto"
              />
            )}
            {worksheet.pdfAnswerUrl && (
              <a href={worksheet.pdfAnswerUrl} target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto">
                <Button size="lg" variant="outline" className="h-11 w-full gap-2">
                  <Download className="size-4" />
                  View solutions
                </Button>
              </a>
            )}
          </div>
        </header>

        <div className="mb-6 flex gap-3 rounded-2xl bg-muted/50 p-4 text-sm leading-6 text-muted-foreground">
          <Info className="mt-0.5 size-5 shrink-0 text-primary" />
          <p>
            Work through this as a document-style assignment. It does not use instant feedback,
            accuracy scoring, or the Practice Challenge results flow.
          </p>
        </div>
      </div>

      {isPdf ? (
        <section className="worksheet-screen-only print:hidden">
          {worksheet.pdfUrl ? (
            <>
              <p className="mb-2 text-xs leading-5 text-muted-foreground">
                Embedded preview. If your browser cannot display it, use Open PDF above.
              </p>
              <div className="h-[70vh] min-h-[520px] overflow-hidden rounded-2xl border bg-card shadow-sm">
                <iframe
                  src={worksheet.pdfUrl}
                  title={`${worksheet.title} questions PDF`}
                  className="h-full w-full bg-white"
                  loading="lazy"
                />
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-dashed p-10 text-center">
              <FileText className="mx-auto size-10 text-muted-foreground/50" />
              <h2 className="mt-4 text-lg font-semibold">Worksheet PDF unavailable</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                The document is not attached to this worksheet.
              </p>
            </div>
          )}

          {hasSolutions && (
            <div className="mt-6 flex flex-col gap-4 rounded-2xl bg-amber-500/10 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-semibold text-foreground">Solutions are available</h2>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                  Solution-release gating is not implemented yet. The answers are available
                  immediately when a solution PDF is attached.
                </p>
              </div>
              <a href={worksheet.pdfAnswerUrl!} target="_blank" rel="noopener noreferrer" className="shrink-0">
                <Button variant="outline" className="h-11 w-full bg-background sm:w-auto">
                  View solutions
                </Button>
              </a>
            </div>
          )}
        </section>
      ) : (
        <div className="space-y-6">
          <WorksheetPaper worksheet={worksheet} />

          <details className="worksheet-screen-only group rounded-2xl border bg-card print:hidden">
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-semibold marker:hidden sm:px-6">
              <span>View solutions</span>
              <span className="text-sm font-normal text-muted-foreground group-open:hidden">Show answer key</span>
              <span className="hidden text-sm font-normal text-muted-foreground group-open:inline">Hide answer key</span>
            </summary>
            <div className="border-t p-4 sm:p-6">
              <p className="mb-4 text-sm leading-6 text-muted-foreground">
                Solutions are available immediately. Scheduled solution release is not implemented yet.
              </p>
              <WorksheetSolutions worksheet={worksheet} />
            </div>
          </details>
        </div>
      )}
    </div>
  );
}
